import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getRuntimeCache, setRuntimeCache } from '../../lib/api';
import { ProjectToolbar } from '../../components/ProjectToolbar';
import { ProjectSidebar } from '../../components/ProjectSidebar';
import { ImageUploadDialog } from '../../components/ImageUploadDialog';
import { LinkInsertDialog } from '../../components/LinkInsertDialog';
import { FullPagePreview } from '../../components/FullPagePreview';
import { sanitizeMarkdown } from '../../lib/mediaUploader';
import { hasBase64Images } from '../../utils/media';
import { ArrowLeft, Check, Clock, Eye, EyeOff, Maximize2, HardDrive, AlertCircle } from 'lucide-react';
import { useRenderedMarkdown } from '../../hooks/useRenderedMarkdown';
import { formatDraftTime } from '../../hooks/useLocalDraft';
import { IsolatedContentEditor } from '../../components/IsolatedInput';
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
  return Boolean(
    resolveLocalizedText(data.title, 'en').trim() ||
    resolveLocalizedText(data.description, 'en').trim() ||
    resolveLocalizedText(data.content, 'en').trim() ||
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

export function ProjectEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [project, setProject] = useState<Project>(emptyProject);
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
      if (snapshot._id) {
        await api.put(`/api/projects/${snapshot._id}`, snapshot);
      } else {
        const autoSlug = snapshot.id || createAutosaveDraftId(
          resolveLocalizedText(snapshot.title, autoFixLanguage), 
          resolveLocalizedText(snapshot.content, autoFixLanguage), 
          'project'
        );
        const response = await api.post('/api/projects', { ...snapshot, id: autoSlug });
        setProject(prev => ({ ...prev, _id: response._id }));
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

  const plainContent = exactLocalizedContent
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
    const cacheKey = `admin:projects:item:${slug}`;
    const cached = getRuntimeCache<Project>(cacheKey);
    if (cached) {
      setProject(cached);
      setLoading(false);
      api
        .get(`/api/projects/admin/${encodeURIComponent(slug)}`)
        .then((data: Project) => {
          setRuntimeCache(cacheKey, data);
          setProject(data);
        })
        .catch(() => {
          api.get('/api/projects').then((projects: Project[]) => {
            const found = projects.find(p => p.id === slug || p._id === slug);
            if (found) {
              setRuntimeCache(cacheKey, found);
              setProject(found);
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
      })
      .catch(() => {
        // Fallback: load all and search client-side
        api.get('/api/projects').then((projects: Project[]) => {
          const found = projects.find(p => p.id === slug || p._id === slug);
          if (found) {
            setRuntimeCache(cacheKey, found);
            setProject(found);
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
    autosave.clearDraft();
    setShowDraftRecovery(false);
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
    const textarea = textareaRef.current;

    if (!textarea) {
      setProject(prev => {
        const current = getExactLocalizedText(prev.content, autoFixLanguage);
        const newText = current + before + after;
        const nextProject = { ...prev, content: setLocalizedText(prev.content, autoFixLanguage, newText) };
        persistDraftNow(nextProject);
        return nextProject;
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);

    textarea.value = newText;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    setProject(prev => {
      const nextProject = { ...prev, content: setLocalizedText(prev.content, autoFixLanguage, newText) };
      persistDraftNow(nextProject);
      return nextProject;
    });

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 0);
  };

  const insertImageMarkdown = (imageMarkdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setProject(prev => {
        const nextProject = { ...prev, content: `${getExactLocalizedText(prev.content, autoFixLanguage)}\n${imageMarkdown}\n` };
        persistDraftNow(nextProject);
        return nextProject;
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${imageMarkdown}${text.substring(end)}`;
    setProject(prev => {
      const nextProject = { ...prev, content: newText };
      persistDraftNow(nextProject);
      return nextProject;
    });

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + imageMarkdown.length;
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
    });
  };

  const insertLinkMarkdown = (linkMarkdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setProject(prev => {
        const nextProject = { ...prev, content: `${getExactLocalizedText(prev.content, autoFixLanguage)}${getExactLocalizedText(prev.content, autoFixLanguage) ? '\n' : ''}${linkMarkdown}` };
        persistDraftNow(nextProject);
        return nextProject;
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${linkMarkdown}${text.substring(end)}`;
    setProject(prev => {
      const nextProject = { ...prev, content: newText };
      persistDraftNow(nextProject);
      return nextProject;
    });

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + linkMarkdown.length;
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
    });
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
      if (project._id) {
        console.log('Updating existing project with _id:', project._id);
        await api.put(`/api/projects/${project._id}`, payload);
        setProject(payload);
        autosave.markAsSaved(payload);
      } else {
        console.log('Creating new project...');
        // Create new project and capture the _id from response
        const response = await api.post('/api/projects', payload);
        console.log('API response:', response);
        // Update state with the _id returned from server
        const newProject = { ...payload, _id: response._id };
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

            {/* Toolbar with Preview Toggle */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <ProjectToolbar 
                textareaRef={textareaRef} 
                onInsert={insertMarkdown}
                onInsertImage={insertImageMarkdown}
                onOpenImageDialog={() => setImageDialogOpen(true)}
                onOpenLinkDialog={() => setLinkDialogOpen(true)}
                onOpenAssetReuser={project.contentLanguage === 'bilingual' ? () => setAssetReuserOpen(true) : undefined}
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
                    id={`${project._id || project.id}-${autoFixLanguage}`}
                    textareaRef={textareaRef}
                    spellCheck
                    lang={autoFixLanguage}
                    placeholder="Project content... (Markdown, LaTeX $$...$$ supported)"
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
                id={`${project._id || project.id}-${autoFixLanguage}`}
                textareaRef={textareaRef}
                spellCheck
                lang={autoFixLanguage}
                placeholder="Project content... (Markdown, LaTeX $$...$$ supported)"
                className="w-full min-h-[70vh] bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-4 text-sm font-mono focus:outline-none focus:border-[#60A5FA] resize-none"
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
        data={project as never}
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
