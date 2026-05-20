import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getRuntimeCache, setRuntimeCache, invalidateRuntimeCache } from '../../lib/api';
import { WritingToolbar } from '../../components/WritingToolbar';
import { WritingSidebar } from '../../components/WritingSidebar';
import { ImageUploadDialog } from '../../components/ImageUploadDialog';
import { LinkInsertDialog } from '../../components/LinkInsertDialog';
import { FullPagePreview } from '../../components/FullPagePreview';
import { sanitizeMarkdown } from '../../lib/mediaUploader';
import { hasBase64Images } from '../../utils/media';
import { ArrowLeft, Check, Maximize2, AlertCircle, EyeOff, Eye } from 'lucide-react';
import { useRenderedMarkdown } from '../../hooks/useRenderedMarkdown';
import { formatDraftTime } from '../../hooks/useLocalDraft';
import { IsolatedContentEditor } from '../../components/IsolatedInput';
import { AutoFixButton } from '../../components/AutoFixButton';
import { AssetReuserDialog } from '../../components/AssetReuserDialog';
import { useAutoFixLanguage } from '../../hooks/useAutoFixLanguage';
import { getAutoFixSuggestionsForWord } from '../../utils/textAutoFix';
import { getSpellSuggestions } from '../../utils/spellSuggester';
import { useAdminAutosave } from '../../hooks/useAdminAutosave';
import { resolveLocalizedText, getExactLocalizedText, setLocalizedText, type LocalizedTextValue } from '../../lib/localized';
import { AutosaveStatusBar } from '../../components/AutosaveStatusBar';

interface Writing {
  _id?: string;
  id: string;
  title: LocalizedTextValue;
  excerpt: LocalizedTextValue;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  content: LocalizedTextValue;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // SEO Fields
  metaDescription?: string;
  ogImage?: string;
  keywords?: string;
  metaTitle?: string;
  contentLanguage?: 'en' | 'id' | 'bilingual';
  translationOfId?: string;
  devStatus?: 'planning' | 'ongoing' | 'completed';
}

const emptyWriting: Writing = {
  id: '',
  title: '',
  excerpt: '',
  date: new Date().toISOString().split('T')[0],
  readTime: '5 min',
  category: 'reflections',
  tags: [],
  content: '',
  status: 'draft',
  publishAt: '',
  devStatus: 'planning',
};

function hasMeaningfulWritingDraft(data: Writing): boolean {
  const hasTitle = resolveLocalizedText(data.title, 'en').trim() || resolveLocalizedText(data.title, 'id').trim();
  const hasExcerpt = resolveLocalizedText(data.excerpt, 'en').trim() || resolveLocalizedText(data.excerpt, 'id').trim();
  const hasContent = resolveLocalizedText(data.content, 'en').trim() || resolveLocalizedText(data.content, 'id').trim();
  return Boolean(
    hasTitle ||
    hasExcerpt ||
    hasContent ||
    data.tags?.length ||
    data.metaDescription?.trim() ||
    data.ogImage?.trim() ||
    data.keywords?.trim() ||
    data.metaTitle?.trim()
  );
}



function createAutosaveDraftId(title: string, content: string, prefix: string): string {
  const source = title.trim() || content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')
    .replace(/[>#*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 8)
    .join('-');

  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || `${prefix}-draft-${Date.now()}`;
}

export function WritingEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCreateRef = useRef(false);
  const dbIdRef = useRef<string | undefined>(undefined);
  const justCreatedRef = useRef(false);

  const [writing, setWriting] = useState<Writing>(emptyWriting);

  // Sync dbIdRef with writing._id whenever it changes
  useEffect(() => {
    dbIdRef.current = writing._id;
  }, [writing._id]);
  const [localTitle, setLocalTitle] = useState('');
  const [loading, setLoading] = useState(!!slug);
  const [isSaving, setIsSaving] = useState(false);
  const [writingsSectionEnabled, setWritingsSectionEnabled] = useState(true);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [assetReuserOpen, setAssetReuserOpen] = useState(false);

  const { language: autoFixLanguage, setLanguage: setAutoFixLanguage } = useAutoFixLanguage();
  const exactLocalizedTitle = getExactLocalizedText(writing.title, autoFixLanguage);
  const exactLocalizedContent = getExactLocalizedText(writing.content, autoFixLanguage);
  const previewHtml = useRenderedMarkdown(exactLocalizedContent || '*Start writing to see preview...*');

  const [caretWord, setCaretWord] = useState<{ word: string; start: number; end: number } | null>(null);
  const [caretSuggestions, setCaretSuggestions] = useState<string[]>([]);
  const caretSuggestionRequestRef = useRef(0);

  const getWordAt = useCallback((text: string, index: number): { word: string; start: number; end: number } | null => {
    if (!text) return null;
    const clamp = Math.max(0, Math.min(index, text.length));

    const isWordChar = (ch: string) => /[\p{L}']/u.test(ch);

    let start = clamp;
    while (start > 0 && isWordChar(text[start - 1])) start -= 1;

    let end = clamp;
    while (end < text.length && isWordChar(text[end])) end += 1;

    if (end <= start) return null;
    const word = text.slice(start, end);
    if (!word.trim()) return null;
    return { word, start, end };
  }, []);

  const isRangeProtected = useCallback((text: string, start: number, end: number): boolean => {
    // Mirrors the protected chunk logic in textAutoFix so we don't suggest replacements
    // inside code blocks, inline code, links, URLs, and emails.
    const pattern = /(```[\s\S]*?```|`[^`\n]*`|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g;
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(text);
    while (match) {
      const mStart = match.index;
      const mEnd = mStart + match[0].length;
      if (start >= mStart && end <= mEnd) return true;
      if (mStart > end) return false;
      match = pattern.exec(text);
    }
    return false;
  }, []);

  const updateCaretSuggestions = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = textarea.value ?? '';
    const pos = textarea.selectionStart ?? 0;
    const range = getWordAt(text, pos);

    if (!range || range.word.length < 3) {
      setCaretWord(null);
      setCaretSuggestions([]);
      return;
    }

    if (isRangeProtected(text, range.start, range.end)) {
      setCaretWord(null);
      setCaretSuggestions([]);
      return;
    }

    const requestId = caretSuggestionRequestRef.current + 1;
    caretSuggestionRequestRef.current = requestId;

    const normalized = range.word.toLowerCase();

    void (async () => {
      const fromAutoFix = getAutoFixSuggestionsForWord(range.word, autoFixLanguage);
      const fromDict = await getSpellSuggestions(range.word, autoFixLanguage);

      if (caretSuggestionRequestRef.current !== requestId) return;

      const merged = Array.from(new Set([...fromAutoFix, ...fromDict]))
        .filter((s) => s.toLowerCase() !== normalized)
        .slice(0, 6);

      setCaretWord(range);
      setCaretSuggestions(merged);
    })();
  }, [autoFixLanguage, getWordAt, isRangeProtected]);

  useEffect(() => {
    api.getAdminSettings()
      .then((settings: any) => {
        setWritingsSectionEnabled(settings?.sections?.writings?.enabled !== false);
      })
      .catch(() => {
        setWritingsSectionEnabled(true);
      });
  }, []);

  const draftKey = `writing_draft_${slug || 'new'}`;

  // ── useAdminAutosave: all 6 principles in one hook ────────────────────────
  const autosave = useAdminAutosave<Writing>({
    storageKey: draftKey,
    data: writing,
    enabled: !loading,
    hasMeaningfulData: hasMeaningfulWritingDraft,
    saveToServer: async (snapshot) => {
      const currentDbId = dbIdRef.current || snapshot._id;
      if (currentDbId) {
        // ATOMIC WRITE via PATCH — only sends changed fields
        await api.patch(`/api/writings/${currentDbId}`, { ...snapshot, _id: currentDbId });
        const updated = { ...snapshot, _id: currentDbId };
        if (updated.id) {
          setRuntimeCache(`admin:writings:item:${updated.id}`, updated);
        }
        invalidateRuntimeCache('admin:writings:list');
        setWriting(updated);
        return updated;
      } else if (!pendingCreateRef.current) {
        pendingCreateRef.current = true;
        const draftId = snapshot.id || createAutosaveDraftId(resolveLocalizedText(snapshot.title, autoFixLanguage), resolveLocalizedText(snapshot.content, autoFixLanguage), 'writing');
        const response = await api.post('/api/writings', { ...snapshot, id: draftId });
        if (response._id) {
          dbIdRef.current = response._id;
          const updated = { ...snapshot, _id: response._id, id: response.id || draftId };
          setRuntimeCache(`admin:writings:item:${response.id || draftId}`, updated);
          invalidateRuntimeCache('admin:writings:list');
          justCreatedRef.current = true;
          setWriting(updated);
          navigate(`/admin/writings/edit/${response.id || draftId}`, { replace: true });
          pendingCreateRef.current = false;
          return updated;
        }
        // If _id is still undefined, keep pendingCreateRef=true to prevent duplicate POSTs
      }
    },
    localDebounceMs: 800,
    serverDebounceMs: 3000,
    periodicIntervalMs: 30_000,
    resetStatusMs: 1500,
    maxRetries: 3,
  });


  // Sync localTitle when writing changes from external source (load, restore) OR language switches
  useEffect(() => {
    setLocalTitle(exactLocalizedTitle);
  }, [exactLocalizedTitle, autoFixLanguage]);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    setWriting(prev => ({ ...prev, title: setLocalizedText(prev.title, autoFixLanguage, value) }));
  };

  // Use resolveLocalizedText with fallback to ensure counter works even when content
  // is stored in a different language than the currently selected one
  const contentForCounter = resolveLocalizedText(writing.content, autoFixLanguage);
  const plainContent = contentForCounter
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')
    .replace(/[>#*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = plainContent ? plainContent.split(' ').length : 0;
  const characterCount = plainContent.length;

  // Check for local draft on mount
  useEffect(() => {
    const draft = autosave.readDraft();
    if (draft && hasMeaningfulWritingDraft(draft.data) && (Date.now() - draft.timestamp) < 86_400_000) {
      setShowDraftRecovery(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Track caret changes for suggestions.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handler = () => updateCaretSuggestions();
    textarea.addEventListener('keyup', handler);
    textarea.addEventListener('click', handler);
    textarea.addEventListener('mouseup', handler);
    textarea.addEventListener('select', handler);
    textarea.addEventListener('input', handler);

    // Initial run
    handler();

    return () => {
      textarea.removeEventListener('keyup', handler);
      textarea.removeEventListener('click', handler);
      textarea.removeEventListener('mouseup', handler);
      textarea.removeEventListener('select', handler);
      textarea.removeEventListener('input', handler);
    };
  }, [updateCaretSuggestions, writing._id, writing.id]);

  // Load writing if editing existing one — use single-item endpoint with fallback
  useEffect(() => {
    if (!slug || slug === 'new') {
      setLoading(false);
      return;
    }
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }
    const cacheKey = `admin:writings:item:${slug}`;
    const cached = getRuntimeCache<Writing>(cacheKey);
    if (cached) {
      setWriting(cached);
      setLoading(false);
      api
        .get(`/api/writings/admin/${encodeURIComponent(slug)}`)
        .then((data: Writing) => {
          setRuntimeCache(cacheKey, data);
          setWriting(data);
        })
        .catch(() => {
          api.get('/api/writings').then((writings: Writing[]) => {
            const found = writings.find(w => w.id === slug || w._id === slug);
            if (found) {
              setRuntimeCache(cacheKey, found);
              setWriting(found);
            }
          }).catch(console.error);
        });
      return;
    }
    setLoading(true);
    api
      .get(`/api/writings/admin/${encodeURIComponent(slug)}`)
      .then((data: Writing) => {
        setRuntimeCache(cacheKey, data);
        setWriting(data);
      })
      .catch(() => {
        // Fallback: load all and search client-side
        api.get('/api/writings').then((writings: Writing[]) => {
          const found = writings.find(w => w.id === slug || w._id === slug);
          if (found) {
            setRuntimeCache(cacheKey, found);
            setWriting(found);
          }
        }).catch(console.error);
      })
      .finally(() => setLoading(false));
  }, [slug]);



  // Restore draft from localStorage
  const restoreDraft = () => {
    const draft = autosave.readDraft();
    if (draft) setWriting(draft.data);
    setShowDraftRecovery(false);
  };

  // Discard draft
  const discardDraft = () => {
    autosave.clearDraft();
    setShowDraftRecovery(false);
  };

  // Stable update callback
  const handleUpdateWriting = useCallback((updatedWriting: Writing) => {
    setWriting(updatedWriting);
  }, []);

  // Stable callback for content updates
  const handleContentCommit = useCallback((content: string) => {
    setWriting(prev => ({ ...prev, content: setLocalizedText(prev.content, autoFixLanguage, content) }));
  }, [autoFixLanguage]);

  const handleAutoFixContent = useCallback((nextContent: string) => {
    setWriting(prev => {
      if (getExactLocalizedText(prev.content, autoFixLanguage) === nextContent) return prev;
      return { ...prev, content: setLocalizedText(prev.content, autoFixLanguage, nextContent) };
    });
  }, [autoFixLanguage]);

  const applyCaretSuggestion = useCallback((replacement: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (!caretWord) return;

    const text = textarea.value ?? '';
    const nextText = text.slice(0, caretWord.start) + replacement + text.slice(caretWord.end);

    textarea.value = nextText;
    handleAutoFixContent(nextText);

    const nextPos = caretWord.start + replacement.length;
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = nextPos;
      textarea.selectionEnd = nextPos;
    }, 0);

    setTimeout(() => updateCaretSuggestions(), 0);
  }, [caretWord, handleAutoFixContent, updateCaretSuggestions]);

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;

    // If no textarea ref (dialog inserts when editor not focused), update state only
    if (!textarea) {
      setWriting(prev => {
        const current = getExactLocalizedText(prev.content, autoFixLanguage);
        const newText = current + before + after;
        return { ...prev, content: setLocalizedText(prev.content, autoFixLanguage, newText) };
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);

    // Update textarea value directly for instant visual feedback
    textarea.value = newText;
    // Fire native input event so IsolatedContentEditor internal state syncs
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // Also update React state
    setWriting(prev => ({ ...prev, content: setLocalizedText(prev.content, autoFixLanguage, newText) }));

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 0);
  };

  const insertImageMarkdown = (imageMarkdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setWriting(prev => ({ ...prev, content: setLocalizedText(prev.content, autoFixLanguage, `${getExactLocalizedText(prev.content, autoFixLanguage)}\n${imageMarkdown}\n`) }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${imageMarkdown}${text.substring(end)}`;

    // Update textarea directly FIRST for instant feedback
    textarea.value = newText;

    // Then update state
    setWriting(prev => ({ ...prev, content: setLocalizedText(prev.content, autoFixLanguage, newText) }));

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + imageMarkdown.length;
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
    }, 0);
  };

  const insertLinkMarkdown = (linkMarkdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setWriting(prev => ({ ...prev, content: setLocalizedText(prev.content, autoFixLanguage, `${getExactLocalizedText(prev.content, autoFixLanguage)}${getExactLocalizedText(prev.content, autoFixLanguage) ? '\n' : ''}${linkMarkdown}`) }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${linkMarkdown}${text.substring(end)}`;

    // Update textarea directly FIRST for instant feedback
    textarea.value = newText;

    // Then update state
    setWriting(prev => ({ ...prev, content: setLocalizedText(prev.content, autoFixLanguage, newText) }));

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + linkMarkdown.length;
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
    }, 0);
  };

  const handleSave = async () => {
    console.log('handleSave called with writing:', writing);
    
    if (!getExactLocalizedText(writing.title, autoFixLanguage)) {
      alert('Title is required');
      return;
    }

    // Auto-generate slug if not provided
    let finalWriting = { ...writing };
    if (!finalWriting.id && getExactLocalizedText(finalWriting.title, autoFixLanguage)) {
      const autoSlug = getExactLocalizedText(finalWriting.title, autoFixLanguage)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      finalWriting.id = autoSlug;
      // Update state dengan slug yang di-generate
      setWriting(prev => ({ ...prev, id: autoSlug }));
      console.log('Auto-generated slug:', autoSlug);
    }

    if (finalWriting.status === 'scheduled' && !finalWriting.publishAt) {
      alert('Mohon isi tanggal dan jam publish untuk penjadwalan');
      return;
    }

    let payload: Writing = {
      ...finalWriting,
      readTime: `${Math.max(1, Math.ceil(wordCount / 200))} min`,
    };

    console.log('Payload to save:', payload);

    // Sanitize base64 images to URLs if present
    if (hasBase64Images(getExactLocalizedText(payload.content, autoFixLanguage))) {
      setIsSaving(true);
      try {
        const sanitized = await sanitizeMarkdown(getExactLocalizedText(payload.content, autoFixLanguage));
        payload.content = setLocalizedText(payload.content, autoFixLanguage, sanitized);
      } catch (err) {
        console.error('Image sanitization failed:', err);
        alert('Peringatan: Beberapa gambar mungkin gagal diupload, namun konten akan disimpan');
        // Continue dengan menyimpan meski sanitization gagal
      }
    }

    setIsSaving(true);
    try {
      console.log('Making API call...');
      const currentDbId = dbIdRef.current || writing._id;
      if (currentDbId) {
        console.log('Updating existing writing with _id:', currentDbId);
        await api.put(`/api/writings/${currentDbId}`, { ...payload, _id: currentDbId });
        const updatedWriting = { ...payload, _id: currentDbId } as Writing;
        if (updatedWriting.id) {
          setRuntimeCache(`admin:writings:item:${updatedWriting.id}`, updatedWriting);
        }
        invalidateRuntimeCache('admin:writings:list');
        setWriting(updatedWriting);
        autosave.markAsSaved(updatedWriting);
      } else {
        console.log('Creating new writing...');
        // Create new writing and capture the _id from response
        const response = await api.post('/api/writings', payload);
        console.log('API response:', response);
        // Update state with the _id returned from server
        dbIdRef.current = response._id;
        const newWriting = { ...payload, _id: response._id } as Writing;
        if (newWriting.id) {
          setRuntimeCache(`admin:writings:item:${newWriting.id}`, newWriting);
        }
        invalidateRuntimeCache('admin:writings:list');
        setWriting(newWriting);
        autosave.markAsSaved(newWriting);
      }
      
      alert('Writing saved successfully!');
      navigate('/admin/writings');
    } catch (err) {
      console.error('Save failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Failed to save writing: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#94A3B8]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#1E293B] border-b border-[#334155] py-3 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/writings')}
              className="p-2 text-[#94A3B8] hover:text-[#60A5FA] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#F8FAFC]">
                {writing._id ? 'Edit Writing' : 'New Writing'}
              </h1>
              <p className="text-xs text-[#94A3B8]">{resolveLocalizedText(writing.title, autoFixLanguage) || 'Untitled'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Word & Character Counter */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-[#94A3B8] border-r border-[#334155] pr-4">
              <div>
                <span className="font-medium text-[#F8FAFC]">{wordCount}</span>
                <span className="ml-1">words</span>
              </div>
              <div>
                <span className="font-medium text-[#F8FAFC]">{characterCount}</span>
                <span className="ml-1">chars</span>
              </div>
            </div>

            {/* Autosave Status Bar */}
            <AutosaveStatusBar
              status={autosave.status}
              errorMessage={autosave.errorMessage}
              hasDraft={autosave.hasDraft}
              draftTimestamp={autosave.draftTimestamp}
              onSaveNow={autosave.saveNow}
              isNew={!writing._id}
              lastServerSavedAt={writing.updatedAt || null}
            />

            {/* Full Page Preview Button */}
            <button
              onClick={() => setShowFullPreview(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[#334155] text-[#F8FAFC] rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
              title="Preview Halaman Penuh"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>

            {/* Unpublish Button - Only show if published */}
            {writing.status === 'published' && (
              <button
                onClick={async () => {
                  if (!confirm('Tarik tulisan dari peredaran (ubah ke Draft)?')) return;
                  try {
                    const updated = { ...writing, status: 'draft' as const };
                    if (writing._id) {
                      await api.put(`/api/writings/${writing._id}`, updated);
                      setWriting(updated);
                      alert('Tulisan berhasil ditarik dari peredaran');
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Gagal menjalankan aksi');
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                Withdraw
              </button>
            )}

            <button
              onClick={() => handleSave()}
              disabled={isSaving || !resolveLocalizedText(writing.title, autoFixLanguage)}
              className="px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving
                ? 'Saving...'
                : writing.status === 'published'
                  ? 'Update Published'
                  : writing.status === 'scheduled'
                    ? 'Save Scheduled'
                    : 'Save Draft'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl">
          {/* Editor Area - Left Sidebar (2/3 width) */}
          <div className="md:col-span-2 space-y-4">
            
            {/* Language Tabs & ID Display */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#334155] pb-2">
              <div className="flex items-center gap-1">
                {(!writing.contentLanguage || writing.contentLanguage === 'bilingual' || writing.contentLanguage === 'id') && (
                  <button
                    onClick={() => setAutoFixLanguage('id')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${autoFixLanguage === 'id' ? 'bg-[#1E40AF] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                  >
                    🇮🇩 Indonesia
                  </button>
                )}
                {(!writing.contentLanguage || writing.contentLanguage === 'bilingual' || writing.contentLanguage === 'en') && (
                  <button
                    onClick={() => setAutoFixLanguage('en')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${autoFixLanguage === 'en' ? 'bg-[#1E40AF] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                  >
                    🇬🇧 English
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#94A3B8] pb-2">
                <div className="flex items-center gap-1">
                  <span>ID:</span>
                  <code className="bg-[#0F172A] px-1.5 py-0.5 rounded text-[#60A5FA] select-all cursor-text font-mono">
                    {writing._id || 'Unsaved'}
                  </code>
                </div>
                <div className="flex items-center gap-1">
                  <span>Slug:</span>
                  <code className="bg-[#0F172A] px-1.5 py-0.5 rounded text-[#60A5FA] select-all cursor-text font-mono">
                    {writing.id || 'Unsaved'}
                  </code>
                </div>
              </div>
            </div>

            {/* Title Input */}
            <div>
              <input
                type="text"
                value={localTitle}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder={autoFixLanguage === 'id' ? 'Judul Tulisan...' : 'Writing Title...'}
                className="w-full text-3xl font-bold text-[#F8FAFC] bg-transparent border-b-2 border-[#334155] pb-3 focus:outline-none focus:border-[#60A5FA] transition-colors placeholder:text-[#475569]"
              />
            </div>

            {/* Toolbar with Preview Toggle */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <WritingToolbar
                textareaRef={textareaRef}
                onInsert={insertMarkdown}
                onOpenImageDialog={() => setImageDialogOpen(true)}
                onOpenLinkDialog={() => setLinkDialogOpen(true)}
                onOpenAssetReuser={() => setAssetReuserOpen(true)}
              />

              <div className="flex items-center gap-2">
                <AutoFixButton
                  text={exactLocalizedContent}
                  onApply={handleAutoFixContent}
                  language={autoFixLanguage}
                />

                {/* Live Preview Toggle */}
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showPreview
                      ? 'bg-[#1E40AF] text-white'
                      : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#334155]'
                  }`}
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="hidden sm:inline">{showPreview ? 'Hide Preview' : 'Live Preview'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#94A3B8] px-1">
              <span>Words: {wordCount}</span>
              <span>Characters: {characterCount}</span>
            </div>

            {/* Caret Suggestions */}
            {caretWord && caretSuggestions.length > 0 && (
              <div className="bg-[#1E293B] border border-[#334155] rounded-lg px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-[#94A3B8]">Suggestions for</span>
                  <span className="text-[11px] text-[#F8FAFC] font-medium">{caretWord.word}</span>
                  <span className="text-[11px] text-[#94A3B8]">:</span>
                  <div className="flex flex-wrap gap-2">
                    {caretSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => applyCaretSuggestion(s)}
                        className="px-2 py-1 rounded-md text-[11px] border border-[#334155] bg-[#0F172A] text-[#F8FAFC] hover:bg-[#111C33] transition-colors"
                        title="Replace word"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Content Area - Editor or Split View */}
            {showPreview ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Editor */}
                <div className="flex flex-col h-full">
                  <label className="text-xs text-[#94A3B8] font-medium mb-2">MARKDOWN</label>
                  <IsolatedContentEditor
                    initialValue={exactLocalizedContent}
                    onCommit={handleContentCommit}
                    id={`${writing._id || writing.id}-${autoFixLanguage}`}
                    textareaRef={textareaRef}
                    spellCheck
                    lang={autoFixLanguage}
                    placeholder="Start writing... (Markdown, LaTeX $$...$$ supported)"
                    className="flex-1 min-h-[60vh] bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-4 text-sm font-mono focus:outline-none focus:border-[#60A5FA] resize-none"
                  />
                </div>

                {/* Preview */}
                <div className="flex flex-col h-full">
                  <label className="text-xs text-[#94A3B8] font-medium mb-2">PREVIEW</label>
                  <div
                    className="flex-1 min-h-[60vh] bg-white border border-[#E5E7EB] rounded-lg px-4 py-4 overflow-y-auto prose prose-sm max-w-none preview-scroll-light
                      prose-h1:text-[#1A1A1A] prose-h2:text-[#2D3748] prose-h3:text-[#2D3748]
                      prose-h1:font-bold prose-h2:font-semibold prose-h3:font-semibold
                      prose-p:text-[#374151]
                      prose-a:text-[#1E40AF] prose-a:hover:text-[#1E3A8A]
                      prose-strong:text-[#1A1A1A] prose-strong:font-semibold
                      prose-em:text-[#374151]
                      prose-code:text-[#DC2626] prose-code:bg-[#FEE2E2] prose-code:px-2 prose-code:py-1 prose-code:rounded
                      prose-pre:bg-[#F3F4F6] prose-pre:text-[#1F2937]
                      prose-blockquote:text-[#4B5563] prose-blockquote:border-l-[#1E40AF]
                      prose-ul:text-[#374151]
                      prose-ol:text-[#374151]
                      prose-li:text-[#374151]"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            ) : (
              /* Full Editor (no preview) */
              <IsolatedContentEditor
                initialValue={exactLocalizedContent}
                onCommit={handleContentCommit}
                id={`${writing._id || writing.id}-${autoFixLanguage}`}
                textareaRef={textareaRef}
                spellCheck
                lang={autoFixLanguage}
                placeholder="Start writing... (Markdown, LaTeX $$...$$ supported)"
                className="w-full min-h-[70vh] bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-4 text-sm font-mono focus:outline-none focus:border-[#60A5FA] resize-none"
              />
            )}
          </div>

          {/* Sidebar - Right (1/3 width) */}
          <div className="md:col-span-1">
            <div className="md:sticky md:top-20">
              <WritingSidebar
                writing={writing}
                onUpdate={handleUpdateWriting}
                onSave={handleSave}
                isSaving={isSaving}
                wordCount={wordCount}
                characterCount={characterCount}
                sectionEnabled={writingsSectionEnabled}
                onBeforeTranslate={autosave.saveNow}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Image Upload Dialog */}
      <ImageUploadDialog
        isOpen={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onInsert={insertImageMarkdown}
        onScheduleChange={(scheduled) => {
          if (!writingsSectionEnabled) return;
          if (scheduled && writing.status !== 'scheduled') {
            setWriting(prev => ({ ...prev, status: 'scheduled' }));
          }
        }}
      />

      <AssetReuserDialog
        isOpen={assetReuserOpen}
        onClose={() => setAssetReuserOpen(false)}
        sourceLanguage={autoFixLanguage === 'en' ? 'id' : 'en'}
        otherLanguageContent={getExactLocalizedText(writing.content, autoFixLanguage === 'en' ? 'id' : 'en')}
        onInsert={(markdown) => insertMarkdown(markdown)}
      />

      <LinkInsertDialog
        isOpen={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        onInsert={insertLinkMarkdown}
      />

      {/* Full Page Preview Modal */}
      <FullPagePreview
        isOpen={showFullPreview}
        onClose={() => setShowFullPreview(false)}
        type="writing"
        data={{
          ...writing,
          title: resolveLocalizedText(writing.title, autoFixLanguage),
          excerpt: resolveLocalizedText(writing.excerpt, autoFixLanguage),
          content: resolveLocalizedText(writing.content, autoFixLanguage),
        } as never}
      />

      {/* Draft Recovery Dialog */}
      {showDraftRecovery && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] rounded-xl p-6 max-w-md w-full border border-[#334155] shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-amber-500/20 rounded-full">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F8FAFC] mb-1">Draft Ditemukan</h3>
                <p className="text-sm text-[#94A3B8]">
                  Anda memiliki draft yang belum disimpan dari{' '}
                  <span className="text-[#F8FAFC] font-medium">
                    {autosave.draftTimestamp ? formatDraftTime(autosave.draftTimestamp) : 'sebelumnya'}
                  </span>
                </p>
              </div>
            </div>
            <p className="text-sm text-[#94A3B8] mb-6">
              Apakah Anda ingin melanjutkan dari draft tersebut atau memulai dari awal?
            </p>
            <div className="flex gap-3">
              <button
                onClick={discardDraft}
                className="flex-1 px-4 py-2.5 bg-[#334155] text-[#F8FAFC] rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
              >
                Mulai Baru
              </button>
              <button
                onClick={restoreDraft}
                className="flex-1 px-4 py-2.5 bg-[#1E40AF] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] transition-colors"
              >
                Pulihkan Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
