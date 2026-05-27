import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getRuntimeCache, setRuntimeCache, invalidateRuntimeCache } from '../../lib/api';
import { ProjectSidebar } from '../../components/ProjectSidebar';
import { ImageUploadDialog } from '../../components/ImageUploadDialog';
import { LinkInsertDialog } from '../../components/LinkInsertDialog';
import { FullPagePreview } from '../../components/FullPagePreview';
import { sanitizeMarkdown } from '../../lib/mediaUploader';
import { hasBase64Images } from '../../utils/media';
import { ArrowLeft, Check, Clock, Eye, EyeOff, Maximize2, HardDrive, AlertCircle } from 'lucide-react';
import { useRenderedMarkdown } from '../../hooks/useRenderedMarkdown';
import { formatDraftTime } from '../../hooks/useLocalDraft';
import { RichTextEditor, type RichTextEditorRef } from '../../components/RichTextEditor';
import { AutoFixButton } from '../../components/AutoFixButton';
import { AssetReuserDialog } from '../../components/AssetReuserDialog';
import { useAutoFixLanguage } from '../../hooks/useAutoFixLanguage';
import { getAutoFixSuggestionsForWord } from '../../utils/textAutoFix';
import { getSpellSuggestions } from '../../utils/spellSuggester';
import { resolveLocalizedText, getExactLocalizedText, setLocalizedText, type LocalizedTextValue } from '../../lib/localized';
import { useAdminAutosave } from '../../hooks/useAdminAutosave';

interface Project {
  _id?: string;
  id: string;
  title: LocalizedTextValue;
  description: LocalizedTextValue;
  tags: string[];
  category: string;
  content: LocalizedTextValue;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  devStatus?: 'planning' | 'ongoing' | 'completed';
  date?: string;
  githubUrl?: string;
  paperUrl?: string;
  demoUrl?: string;
  // SEO Fields
  metaDescription?: string;
  ogImage?: string;
  keywords?: string;
  metaTitle?: string;
  contentLanguage?: 'en' | 'id' | 'bilingual';
  translationOfId?: string;
}

const emptyProject: Project = {
  id: '',
  title: '',
  description: '',
  tags: [],
  category: 'signal-processing',
  content: '',
  status: 'draft',
  devStatus: 'planning',
  date: new Date().toISOString().split('T')[0],
  githubUrl: '',
  paperUrl: '',
  demoUrl: '',
};

function hasMeaningfulProjectDraft(data: Project): boolean {
  const hasTitle = resolveLocalizedText(data.title, 'en').trim() || resolveLocalizedText(data.title, 'id').trim();
  const hasDesc = resolveLocalizedText(data.description, 'en').trim() || resolveLocalizedText(data.description, 'id').trim();
  const hasContent = resolveLocalizedText(data.content, 'en').trim() || resolveLocalizedText(data.content, 'id').trim();
  return Boolean(
    hasTitle ||
    hasDesc ||
    hasContent ||
    data.tags?.length ||
    data.githubUrl?.trim() ||
    data.paperUrl?.trim() ||
    data.demoUrl?.trim() ||
    data.metaDescription?.trim() ||
    data.ogImage?.trim() ||
    data.keywords?.trim() ||
    data.metaTitle?.trim()
  );
}

function getWordCount(text: string): number {
  const normalized = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')
    .replace(/[>#*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized ? normalized.split(' ').length : 0;
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

function loadTwitterScript(callback: () => void) {
  if ((window as any).twttr && (window as any).twttr.widgets) {
    callback();
    return;
  }

  const existingScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
  if (existingScript) {
    existingScript.addEventListener('load', () => {
      if ((window as any).twttr && (window as any).twttr.widgets) {
        callback();
      }
    });
    const interval = setInterval(() => {
      if ((window as any).twttr && (window as any).twttr.widgets) {
        clearInterval(interval);
        callback();
      }
    }, 100);
    setTimeout(() => clearInterval(interval), 5000);
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://platform.twitter.com/widgets.js';
  script.async = true;
  script.charset = 'utf-8';
  script.onload = () => {
    if ((window as any).twttr && (window as any).twttr.widgets) {
      callback();
    }
  };
  document.body.appendChild(script);
}

export function ProjectEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<RichTextEditorRef>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCreateRef = useRef(false);
  const dbIdRef = useRef<string | undefined>(undefined);
  const justCreatedRef = useRef(false);
  const [project, setProject] = useState<Project>(emptyProject);

  // Sync dbIdRef with project._id whenever it changes
  useEffect(() => {
    dbIdRef.current = project._id;
  }, [project._id]);
  const [localTitle, setLocalTitle] = useState(''); // Local state for smooth title typing
  const [loading, setLoading] = useState(!!slug);
  const [isSaving, setIsSaving] = useState(false);
  const [projectsSectionEnabled, setProjectsSectionEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [assetReuserOpen, setAssetReuserOpen] = useState(false);

  const { language: autoFixLanguage, setLanguage: setAutoFixLanguage } = useAutoFixLanguage();
  const exactLocalizedTitle = getExactLocalizedText(project.title, autoFixLanguage);
  const exactLocalizedContent = getExactLocalizedText(project.content, autoFixLanguage);
  const previewHtml = useRenderedMarkdown(exactLocalizedContent || '*Start writing to see preview...*');

  useEffect(() => {
    const hasTweets = document.querySelector('.twitter-tweet');
    if (!hasTweets) return;

    const isDark = document.documentElement.classList.contains('dark');
    document.querySelectorAll('.twitter-tweet').forEach((bq) => {
      bq.setAttribute('data-theme', isDark ? 'dark' : 'light');
    });

    loadTwitterScript(() => {
      if ((window as any).twttr && (window as any).twttr.widgets) {
        (window as any).twttr.widgets.load();
      }
    });
  }, [previewHtml]);

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
    if (!range || range.word.length < 3) { setCaretWord(null); setCaretSuggestions([]); return; }
    if (isRangeProtected(text, range.start, range.end)) { setCaretWord(null); setCaretSuggestions([]); return; }
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
        setProjectsSectionEnabled(settings?.sections?.projects?.enabled !== false);
      })
      .catch(() => {
        // If settings fail, default to enabled so admin isn't blocked.
        setProjectsSectionEnabled(true);
      });
  }, []);

  const draftKey = `project_draft_${slug || 'new'}`;

  // ── useAdminAutosave: all 6 principles in one hook ────────────────────────
  const autosave = useAdminAutosave<Project>({
    storageKey: draftKey,
    data: project,
    enabled: !loading,
    hasMeaningfulData: hasMeaningfulProjectDraft,
    saveToServer: async (snapshot) => {
      const currentDbId = dbIdRef.current || snapshot._id;
      if (currentDbId) {
        await api.put(`/api/projects/${currentDbId}`, { ...snapshot, _id: currentDbId });
        const updated = { ...snapshot, _id: currentDbId };
        if (updated.id) {
          setRuntimeCache(`admin:projects:item:${updated.id}`, updated);
        }
        invalidateRuntimeCache('admin:projects:list');
        setProject(updated);
        return updated;
      } else if (!pendingCreateRef.current) {
        pendingCreateRef.current = true;
        const autoSlug = snapshot.id || createAutosaveDraftId(
          resolveLocalizedText(snapshot.title, autoFixLanguage), 
          resolveLocalizedText(snapshot.content, autoFixLanguage), 
          'project'
        );
        const response = await api.post('/api/projects', { ...snapshot, id: autoSlug });
        if (response._id) {
          dbIdRef.current = response._id;
          const updated = { ...snapshot, _id: response._id, id: response.id || autoSlug };
          setRuntimeCache(`admin:projects:item:${response.id || autoSlug}`, updated);
          invalidateRuntimeCache('admin:projects:list');
          justCreatedRef.current = true;
          setProject(updated);
          navigate(`/admin/projects/edit/${response.id || autoSlug}`, { replace: true });
          pendingCreateRef.current = false;
          return updated;
        }
      }
    },
    localDebounceMs: 800,
    serverDebounceMs: 3000,
    periodicIntervalMs: 30_000,
    resetStatusMs: 1500,
    maxRetries: 3,
  });

  // Sync localTitle when project changes from external source
  useEffect(() => {
    setLocalTitle(exactLocalizedTitle);
  }, [exactLocalizedTitle, autoFixLanguage]);

  // Title is persisted immediately so fast navigation cannot lose edits.
  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    setProject(prev => ({ ...prev, title: setLocalizedText(prev.title, autoFixLanguage, value) }));
  };

  // Use resolveLocalizedText with fallback to ensure counter works even when content
  // is stored in a different language than the currently selected one
  const contentForCounter = resolveLocalizedText(project.content, autoFixLanguage);
  const plainContent = contentForCounter
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/[>#*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = plainContent ? plainContent.split(' ').length : 0;
  const characterCount = plainContent.length;

  // Check for local draft on mount
  useEffect(() => {
    const draft = autosave.readDraft();
    if (draft && hasMeaningfulProjectDraft(draft.data) && (Date.now() - draft.timestamp) < 86_400_000) {
      setShowDraftRecovery(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Load project if editing existing one — use single-item endpoint with fallback
  useEffect(() => {
    if (!slug || slug === 'new') {
      setLoading(false);
      return;
    }
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }
    const cacheKey = `admin:projects:item:${slug}`;
    const cached = getRuntimeCache<Project>(cacheKey);
    if (cached) {
      setProject(cached);
      setLoading(false);
      // Initialize autosave dirty-flag baseline with cached data
      autosave.markAsSaved(cached);
      api
        .get(`/api/projects/admin/${encodeURIComponent(slug)}`)
        .then((data: Project) => {
          setRuntimeCache(cacheKey, data);
          setProject(data);
          autosave.markAsSaved(data);
        })
        .catch(() => {
          api.get('/api/projects').then((projects: Project[]) => {
            const found = projects.find(p => p.id === slug || p._id === slug);
            if (found) {
              setRuntimeCache(cacheKey, found);
              setProject(found);
              autosave.markAsSaved(found);
            }
          }).catch(console.error);
        });
      return;
    }
    setLoading(true);
    api
      .get(`/api/projects/admin/${encodeURIComponent(slug)}`)
      .then((data: Project) => {
        setRuntimeCache(cacheKey, data);
        setProject(data);
        autosave.markAsSaved(data);
      })
      .catch(() => {
        // Fallback: load all and search client-side
        api.get('/api/projects').then((projects: Project[]) => {
          const found = projects.find(p => p.id === slug || p._id === slug);
          if (found) {
            setRuntimeCache(cacheKey, found);
            setProject(found);
            autosave.markAsSaved(found);
          }
        }).catch(console.error);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const restoreDraft = () => {
    try {
      const draft = autosave.readDraft();
      if (draft) {
        setProject(draft.data);
      }
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
    setShowDraftRecovery(false);
  };

  const discardDraft = () => {
    const confirmMessage = autoFixLanguage === 'id'
      ? 'Apakah Anda yakin ingin membuang draft lokal ini? Ketikan Anda yang belum disimpan ke server akan terhapus secara permanen.'
      : 'Are you sure you want to discard this local draft? Your unsaved writing will be permanently deleted.';

    if (window.confirm(confirmMessage)) {
      autosave.clearDraft({ backup: true });
      setShowDraftRecovery(false);
    }
  };

  const restoreBackupDraft = () => {
    const backup = autosave.readBackupDraft();
    if (backup) {
      setProject(backup.data);
      autosave.persistLocalDraft(backup.data);
    }
    autosave.clearBackupDraft();
  };

  const discardBackupDraft = () => {
    autosave.clearBackupDraft();
  };

  // Stable update callback
  const handleUpdateProject = useCallback((updatedProject: Project) => {
    setProject(updatedProject);
  }, []);

  // Stable callback for content updates
  const handleContentCommit = useCallback((content: string) => {
    setProject(prev => ({
      ...prev, content: setLocalizedText(prev.content, autoFixLanguage, content)
    }));
  }, [autoFixLanguage]);

  const handleAutoFixContent = useCallback((nextContent: string) => {
    setProject(prev => {
      if (getExactLocalizedText(prev.content, autoFixLanguage) === nextContent) return prev;
      return { ...prev, content: setLocalizedText(prev.content, autoFixLanguage, nextContent) };
    });
  }, [autoFixLanguage]);

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
    handler();
    return () => {
      textarea.removeEventListener('keyup', handler);
      textarea.removeEventListener('click', handler);
      textarea.removeEventListener('mouseup', handler);
      textarea.removeEventListener('select', handler);
      textarea.removeEventListener('input', handler);
    };
  }, [updateCaretSuggestions, project._id, project.id]);

  const applyCaretSuggestion = useCallback((replacement: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !caretWord) return;
    const text = textarea.value ?? '';
    const nextText = text.slice(0, caretWord.start) + replacement + text.slice(caretWord.end);
    textarea.value = nextText;
    handleAutoFixContent(nextText);
    const nextPos = caretWord.start + replacement.length;
    setTimeout(() => { textarea.focus(); textarea.selectionStart = nextPos; textarea.selectionEnd = nextPos; }, 0);
    setTimeout(() => updateCaretSuggestions(), 0);
  }, [caretWord, handleAutoFixContent, updateCaretSuggestions]);

  const insertMarkdown = (before: string, after: string = '') => {
    if (editorRef.current) {
      editorRef.current.insertMarkdown(before + after);
    } else {
      setProject(prev => {
        const current = getExactLocalizedText(prev.content, autoFixLanguage);
        const newText = current + before + after;
        return { ...prev, content: setLocalizedText(prev.content, autoFixLanguage, newText) };
      });
    }
  };

  const insertImageMarkdown = (imageMarkdown: string) => {
    const match = imageMarkdown.match(/!\[(.*?)\]\((.*?)\)/);
    if (match && editorRef.current) {
      editorRef.current.insertImage(match[1], match[2]);
    } else if (editorRef.current) {
      editorRef.current.insertMarkdown(imageMarkdown);
    } else {
      setProject(prev => ({
        ...prev,
        content: setLocalizedText(prev.content, autoFixLanguage, `${getExactLocalizedText(prev.content, autoFixLanguage)}\n${imageMarkdown}\n`)
      }));
    }
  };

  const insertLinkMarkdown = (linkMarkdown: string) => {
    const match = linkMarkdown.match(/\[(.*?)\]\((.*?)\)/);
    if (match && editorRef.current) {
      editorRef.current.insertLink(match[1], match[2]);
    } else if (editorRef.current) {
      editorRef.current.insertMarkdown(linkMarkdown);
    } else {
      setProject(prev => ({
        ...prev,
        content: setLocalizedText(prev.content, autoFixLanguage, `${getExactLocalizedText(prev.content, autoFixLanguage)}${getExactLocalizedText(prev.content, autoFixLanguage) ? '\n' : ''}${linkMarkdown}`)
      }));
    }
  };

  const handleSave = async () => {
    console.log('handleSave called with project:', project);
    
    if (!exactLocalizedTitle) {
      alert('Title is required');
      return;
    }

    // Auto-generate slug if not provided
    let finalProject = { ...project };
    if (!finalProject.id && exactLocalizedTitle) {
      const autoSlug = exactLocalizedTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      finalProject.id = autoSlug;
      // Update state dengan slug yang di-generate
      setProject(prev => ({ ...prev, id: autoSlug }));
      console.log('Auto-generated slug:', autoSlug);
    }

    let payload: Project = { ...finalProject };

    console.log('Payload to save:', payload);

    // Sanitize base64 images to URLs if present
    if (hasBase64Images(exactLocalizedContent)) {
      setIsSaving(true);
      try {
        const sanitized = await sanitizeMarkdown(exactLocalizedContent);
        payload.content = setLocalizedText(payload.content, autoFixLanguage, sanitized);
      } catch (err) {
        console.error('Image sanitization failed:', err);
        alert('Warning: Some images may have failed to upload, but content will be saved');
      }
    }

    setIsSaving(true);
    try {
      console.log('Making API call...');
      const currentDbId = dbIdRef.current || project._id;
      if (currentDbId) {
        console.log('Updating existing project with _id:', currentDbId);
        await api.put(`/api/projects/${currentDbId}`, { ...payload, _id: currentDbId });
        const updatedProject = { ...payload, _id: currentDbId } as Project;
        if (updatedProject.id) {
          setRuntimeCache(`admin:projects:item:${updatedProject.id}`, updatedProject);
        }
        invalidateRuntimeCache('admin:projects:list');
        setProject(updatedProject);
        autosave.markAsSaved(updatedProject);
      } else {
        console.log('Creating new project...');
        // Create new project and capture the _id from response
        const response = await api.post('/api/projects', payload);
        console.log('API response:', response);
        // Update state with the _id returned from server
        dbIdRef.current = response._id;
        const newProject = { ...payload, _id: response._id } as Project;
        if (newProject.id) {
          setRuntimeCache(`admin:projects:item:${newProject.id}`, newProject);
        }
        invalidateRuntimeCache('admin:projects:list');
        setProject(newProject);
        autosave.markAsSaved(newProject);
      }
      
      alert('Project saved successfully!');
      navigate('/admin/projects');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <p className="text-[#94A3B8]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#1E293B] border-b border-[#334155] py-3 px-4 sm:px-6">
        <div className="flex items-center justify-between max-w-[90rem] mx-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/admin/projects')}
              className="p-2 text-[#94A3B8] hover:text-[#60A5FA] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                {project._id ? 'Edit Project' : 'New Project'}
              </h1>
              <p className="text-xs text-[#94A3B8] truncate max-w-[150px] sm:max-w-none">
                {exactLocalizedTitle || 'Untitled'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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

            {/* Autosave Indicator */}
            {autosave.status === 'saving' && (
              <span className="flex items-center text-amber-500 font-medium text-xs">
                <Clock className="w-4 h-4 mr-1 animate-spin" /> Saving...
              </span>
            )}
            {autosave.status === 'retrying' && (
              <span className="flex items-center text-amber-500 font-medium text-xs">
                <Clock className="w-4 h-4 mr-1 animate-spin" /> Retrying...
              </span>
            )}
            {autosave.status === 'saved' && (
              <span className="flex items-center text-emerald-500 font-medium text-xs">
                <Check className="w-4 h-4 mr-1" /> Saved
              </span>
            )}
            {autosave.status === 'error' && (
              <span className="flex items-center text-red-500 font-medium text-xs">
                <AlertCircle className="w-4 h-4 mr-1" /> Error
              </span>
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

            {project.status === 'published' && (
              <button
                onClick={async () => {
                  if (!confirm('Withdraw this project?')) return;
                  try {
                    const updated = { ...project, status: 'draft' as const };
                    if (project._id) {
                      await api.put(`/api/projects/${project._id}`, updated);
                      setProject(updated);
                      alert('Project withdrawn');
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Failed');
                  }
                }}
                className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                Withdraw
              </button>
            )}

            <button
              onClick={() => handleSave()}
              disabled={isSaving || !exactLocalizedTitle}
              className="px-3 sm:px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving
                ? 'Saving...'
                : project.status === 'published'
                  ? 'Update Published'
                  : project.status === 'scheduled'
                    ? 'Save Scheduled'
                    : 'Save Draft'}
            </button>
          </div>
        </div>
      </header>

      {/* Multi-Tab Collision Warning Banner */}
      {autosave.hasCollision && (
        <div className="bg-amber-600/90 text-white px-6 py-2.5 flex items-center gap-2 text-sm font-medium border-b border-amber-700 animate-pulse">
          <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
          <span>
            Peringatan: Dokumen ini sedang dibuka di tab lain. Tutup tab ini atau tab lainnya untuk mencegah data tertimpa secara tidak sengaja.
          </span>
        </div>
      )}

      {/* Backup Draft Recovery Banner */}
      {autosave.hasBackup && !autosave.hasDraft && (
        <div className="bg-indigo-600/90 text-white px-6 py-2.5 flex items-center justify-between gap-2 text-sm font-medium border-b border-indigo-700">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4.5 h-4.5 flex-shrink-0" />
            <span>
              {autoFixLanguage === 'id'
                ? `Terdeteksi draf cadangan dari ${autosave.backupTimestamp ? formatDraftTime(autosave.backupTimestamp) : 'sebelumnya'} yang dibuang secara tidak sengaja.`
                : `Detected a backup draft from ${autosave.backupTimestamp ? formatDraftTime(autosave.backupTimestamp) : 'previously'} that was discarded accidentally.`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={restoreBackupDraft}
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded text-xs font-semibold transition-colors"
            >
              {autoFixLanguage === 'id' ? 'Pulihkan' : 'Restore'}
            </button>
            <button
              onClick={discardBackupDraft}
              className="text-white/80 hover:text-white text-xs font-medium transition-colors"
            >
              {autoFixLanguage === 'id' ? 'Abaikan' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content - 12 Column Grid */}
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 max-w-[90rem] mx-auto">
          {/* Editor Area - col-span-8 on large screens */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            
            {/* Language Tabs & ID Display */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#334155] pb-2">
              <div className="flex items-center gap-1">
                {(!project.contentLanguage || project.contentLanguage === 'bilingual' || project.contentLanguage === 'id') && (
                  <button
                    onClick={() => setAutoFixLanguage('id')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${autoFixLanguage === 'id' ? 'bg-[#1E40AF] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                  >
                    🇮🇩 Indonesia
                  </button>
                )}
                {(!project.contentLanguage || project.contentLanguage === 'bilingual' || project.contentLanguage === 'en') && (
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
                    {project._id || 'Unsaved'}
                  </code>
                </div>
                <div className="flex items-center gap-1">
                  <span>Slug:</span>
                  <code className="bg-[#0F172A] px-1.5 py-0.5 rounded text-[#60A5FA] select-all cursor-text font-mono">
                    {project.id || 'Unsaved'}
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
                placeholder={autoFixLanguage === 'id' ? 'Judul Proyek...' : 'Project Title...'}
                className="w-full text-2xl sm:text-3xl font-bold text-[#F8FAFC] bg-transparent border-b-2 border-[#334155] pb-3 focus:outline-none focus:border-[#60A5FA] transition-colors placeholder:text-[#475569]"
              />
            </div>

            {/* Toolbar Area (Now handled inside RichTextEditor, we keep the flex layout for align actions) */}
            <div className="flex items-center justify-end gap-2 flex-wrap">

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
                  <label className="text-xs text-[#94A3B8] font-medium mb-2">VISUAL EDITOR</label>
                  <RichTextEditor
                    ref={editorRef}
                    initialValue={exactLocalizedContent}
                    onCommit={handleContentCommit}
                    id={`${project._id || project.id}-${autoFixLanguage}`}
                    onOpenImageDialog={() => setImageDialogOpen(true)}
                    onOpenLinkDialog={() => setLinkDialogOpen(true)}
                    onOpenAssetReuser={() => setAssetReuserOpen(true)}
                    className="flex-1 min-h-[60vh]"
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
              <RichTextEditor
                ref={editorRef}
                initialValue={exactLocalizedContent}
                onCommit={handleContentCommit}
                id={`${project._id || project.id}-${autoFixLanguage}`}
                onOpenImageDialog={() => setImageDialogOpen(true)}
                onOpenLinkDialog={() => setLinkDialogOpen(true)}
                onOpenAssetReuser={() => setAssetReuserOpen(true)}
                className="w-full min-h-[70vh]"
              />
            )}
          </div>

          {/* Sidebar - col-span-4 on large screens */}
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-20">
              <ProjectSidebar
                project={project}
                onUpdate={handleUpdateProject}
                onSave={handleSave}
                isSaving={isSaving}
                wordCount={wordCount}
                characterCount={characterCount}
                sectionEnabled={projectsSectionEnabled}
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
      />

      <AssetReuserDialog
        isOpen={assetReuserOpen}
        onClose={() => setAssetReuserOpen(false)}
        sourceLanguage={autoFixLanguage === 'en' ? 'id' : 'en'}
        otherLanguageContent={getExactLocalizedText(project.content, autoFixLanguage === 'en' ? 'id' : 'en')}
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
        type="project"
        data={{
          ...project,
          title: resolveLocalizedText(project.title, autoFixLanguage),
          description: resolveLocalizedText(project.description, autoFixLanguage),
          content: resolveLocalizedText(project.content, autoFixLanguage),
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
