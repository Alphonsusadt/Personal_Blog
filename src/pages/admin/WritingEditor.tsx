import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getRuntimeCache, setRuntimeCache } from '../../lib/api';
import { WritingToolbar } from '../../components/WritingToolbar';
import { WritingSidebar } from '../../components/WritingSidebar';
import { ImageUploadDialog } from '../../components/ImageUploadDialog';
import { LinkInsertDialog } from '../../components/LinkInsertDialog';
import { FullPagePreview } from '../../components/FullPagePreview';
import { sanitizeMarkdown } from '../../lib/mediaUploader';
import { hasBase64Images } from '../../utils/media';
import { ArrowLeft, Check, Clock, Maximize2, HardDrive, AlertCircle, RefreshCw, EyeOff, Eye } from 'lucide-react';
import { useRenderedMarkdown } from '../../hooks/useRenderedMarkdown';
import { formatDraftTime } from '../../hooks/useLocalDraft';
import { IsolatedContentEditor } from '../../components/IsolatedInput';
import { AutoFixButton } from '../../components/AutoFixButton';
import { useAutoFixLanguage } from '../../hooks/useAutoFixLanguage';
import { getAutoFixSuggestionsForWord } from '../../utils/textAutoFix';
import { getSpellSuggestions } from '../../utils/spellSuggester';
import { useAdminAutosave } from '../../hooks/useAdminAutosave';

interface Writing {
  _id?: string;
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  content: string;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // SEO Fields
  metaDescription?: string;
  ogImage?: string;
  keywords?: string;
  metaTitle?: string;
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
};

function hasMeaningfulWritingDraft(data: Writing): boolean {
  return Boolean(
    data.title?.trim() ||
    data.excerpt?.trim() ||
    data.content?.trim() ||
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

  const [writing, setWriting] = useState<Writing>(emptyWriting);
  const [localTitle, setLocalTitle] = useState('');
  const [loading, setLoading] = useState(!!slug);
  const [isSaving, setIsSaving] = useState(false);
  const [writingsSectionEnabled, setWritingsSectionEnabled] = useState(true);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const previewHtml = useRenderedMarkdown(writing.content || '*Start writing to see preview...*');

  const { language: autoFixLanguage } = useAutoFixLanguage();

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
      if (snapshot._id) {
        // ATOMIC WRITE via PATCH — only sends changed fields
        await api.patch(`/api/writings/${snapshot._id}`, snapshot);
      } else if (!pendingCreateRef.current) {
        pendingCreateRef.current = true;
        const draftId = snapshot.id || createAutosaveDraftId(snapshot.title, snapshot.content, 'writing');
        const response = await api.post('/api/writings', { ...snapshot, id: draftId });
        setWriting(prev => ({ ...prev, _id: response._id }));
        pendingCreateRef.current = false;
      }
    },
    localDebounceMs: 800,
    serverDebounceMs: 3000,
    periodicIntervalMs: 30_000,
    resetStatusMs: 1500,
    maxRetries: 3,
  });


  // Sync localTitle when writing changes from external source (load, restore)
  useEffect(() => {
    setLocalTitle(writing.title);
  }, [writing.title]);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    setWriting(prev => ({ ...prev, title: value }));
  };

  const plainContent = writing.content
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
    setWriting(prev => ({ ...prev, content }));
  }, []);

  const handleAutoFixContent = useCallback((nextContent: string) => {
    setWriting(prev => {
      if (prev.content === nextContent) return prev;
      return { ...prev, content: nextContent };
    });
  }, []);

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
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const newText = text.substring(0, start) + before + selected + after + text.substring(end);

    // Update textarea directly FIRST for instant feedback
    textarea.value = newText;

    // Then update state
    setWriting(prev => ({ ...prev, content: newText }));

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
      setWriting(prev => ({ ...prev, content: `${prev.content}\n${imageMarkdown}\n` }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${imageMarkdown}${text.substring(end)}`;

    // Update textarea directly FIRST for instant feedback
    textarea.value = newText;

    // Then update state
    setWriting(prev => ({ ...prev, content: newText }));

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
      setWriting(prev => ({ ...prev, content: `${prev.content}${prev.content ? '\n' : ''}${linkMarkdown}` }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${linkMarkdown}${text.substring(end)}`;

    // Update textarea directly FIRST for instant feedback
    textarea.value = newText;

    // Then update state
    setWriting(prev => ({ ...prev, content: newText }));

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + linkMarkdown.length;
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
    }, 0);
  };

  const handleSave = async () => {
    console.log('handleSave called with writing:', writing);
    
    if (!writing.title) {
      alert('Title is required');
      return;
    }

    // Auto-generate slug if not provided
    let finalWriting = { ...writing };
    if (!finalWriting.id && finalWriting.title) {
      const autoSlug = finalWriting.title
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
    if (hasBase64Images(payload.content)) {
      setIsSaving(true);
      try {
        const sanitized = await sanitizeMarkdown(payload.content);
        payload.content = sanitized;
      } catch (err) {
        console.error('Image sanitization failed:', err);
        alert('Peringatan: Beberapa gambar mungkin gagal diupload, namun konten akan disimpan');
        // Continue dengan menyimpan meski sanitization gagal
      }
    }

    setIsSaving(true);
    try {
      console.log('Making API call...');
      if (writing._id) {
        console.log('Updating existing writing with _id:', writing._id);
        await api.put(`/api/writings/${writing._id}`, payload);
      } else {
        console.log('Creating new writing...');
        // Create new writing and capture the _id from response
        const response = await api.post('/api/writings', payload);
        console.log('API response:', response);
        // Update state with the _id returned from server
        setWriting(prev => ({ ...prev, _id: response._id }));
      }
      autosave.clearDraft(); // Clear local draft after successful save
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
              <p className="text-xs text-[#94A3B8]">{writing.title || 'Untitled'}</p>
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

            {/* Autosave Status Indicator (unified: local + server) */}
            {autosave.status !== 'idle' && (
              <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-all ${
                autosave.status === 'saving'   ? 'text-yellow-400 bg-yellow-400/10' :
                autosave.status === 'retrying' ? 'text-orange-400 bg-orange-400/10' :
                autosave.status === 'error'    ? 'text-red-400 bg-red-400/10' :
                                                 'text-green-400 bg-green-400/10'
              }`}>
                {autosave.status === 'saving'   && <><Clock className="w-3 h-3 animate-spin" /><span>Saving…</span></>}
                {autosave.status === 'retrying'  && <><RefreshCw className="w-3 h-3 animate-spin" /><span>{autosave.errorMessage || 'Retrying…'}</span></>}
                {autosave.status === 'error'     && <><AlertCircle className="w-3 h-3" /><span title={autosave.errorMessage}>Save failed</span></>}
                {autosave.status === 'saved'     && <><Check className="w-3 h-3" /><span>Saved ✓</span></>}
              </div>
            )}
            {/* Local draft indicator (always-on safety net) */}
            {autosave.hasDraft && autosave.status === 'idle' && (
              <div className="flex items-center gap-1 text-xs text-[#475569] px-2 py-1">
                <HardDrive className="w-3 h-3" />
                <span>Draft saved</span>
              </div>
            )}

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
              disabled={isSaving || !writing.title}
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
            {/* Title Input */}
            <div>
              <input
                type="text"
                value={localTitle}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Writing Title..."
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
              />

              <div className="flex items-center gap-2">
                <AutoFixButton
                  text={writing.content}
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
                    initialValue={writing.content}
                    onCommit={handleContentCommit}
                    id={writing._id || writing.id}
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
                initialValue={writing.content}
                onCommit={handleContentCommit}
                id={writing._id || writing.id}
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
        data={writing}
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
