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
import { renderMarkdown } from '../../utils/renderers';
import { formatDraftTime } from '../../hooks/useLocalDraft';
import { IsolatedContentEditor } from '../../components/IsolatedInput';
import { AutoFixButton } from '../../components/AutoFixButton';
import { useAutoFixLanguage } from '../../hooks/useAutoFixLanguage';
import { getAutoFixSuggestionsForWord } from '../../utils/textAutoFix';
import { getSpellSuggestions } from '../../utils/spellSuggester';

interface Project {
  _id?: string;
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  content: string;
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
    data.title?.trim() ||
    data.description?.trim() ||
    data.content?.trim() ||
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
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const localDraftStatusTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingCreateRef = useRef(false);

  const [project, setProject] = useState<Project>(emptyProject);
  const [localTitle, setLocalTitle] = useState(''); // Local state for smooth title typing
  const [loading, setLoading] = useState(!!slug);
  const [isSaving, setIsSaving] = useState(false);
  const [projectsSectionEnabled, setProjectsSectionEnabled] = useState(true);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [localDraftStatus, setLocalDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

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

  const persistDraftNow = useCallback((nextProject: Project) => {
    try {
      setLocalDraftStatus('saving');
      localStorage.setItem(draftKey, JSON.stringify({ data: nextProject, timestamp: Date.now() }));
      setLocalDraftStatus('saved');
      clearTimeout(localDraftStatusTimeoutRef.current);
      localDraftStatusTimeoutRef.current = setTimeout(() => setLocalDraftStatus('idle'), 900);
    } catch (e) {
      console.error('Local draft error:', e);
    }
  }, [draftKey]);

  // Sync localTitle when project changes from external source
  useEffect(() => {
    setLocalTitle(project.title);
  }, [project.title]);

  // Title is persisted immediately so fast navigation cannot lose edits.
  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    setProject(prev => {
      const nextProject = { ...prev, title: value };
      persistDraftNow(nextProject);
      return nextProject;
    });
  };

  const plainContent = project.content
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
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setDraftTimestamp(parsed.timestamp);
        if (hasMeaningfulProjectDraft(parsed.data) && (Date.now() - parsed.timestamp) < 86400000) {
          setShowDraftRecovery(true);
        }
      }
    } catch (e) {
      console.error('Failed to check draft:', e);
    }
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

  // Periodic backup write without touching indicator state.
  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ data: project, timestamp: Date.now() }));
      } catch (e) { console.error('Local draft error:', e); }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [project, loading, draftKey]);

  useEffect(() => {
    return () => clearTimeout(localDraftStatusTimeoutRef.current);
  }, []);

  // Server autosave - 3s (FASTER!)
  useEffect(() => {
    const canAutosaveToServer = Boolean(project.title.trim() || getWordCount(project.content) >= 50);

    if (loading || !canAutosaveToServer) return;
    clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setAutosaveStatus('saving');
      try {
        if (project._id) {
          await api.put(`/api/projects/${project._id}`, project);
        } else if (!pendingCreateRef.current) {
          pendingCreateRef.current = true;
          const draftId = project.id || createAutosaveDraftId(project.title, project.content, 'project');
          const response = await api.post('/api/projects', { ...project, id: draftId });
          setProject(prev => ({ ...prev, _id: response._id }));
          pendingCreateRef.current = false;
        } else { setAutosaveStatus('idle'); return; }
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus('idle'), 1500);
      } catch (err) { pendingCreateRef.current = false; console.error('Autosave failed:', err); setAutosaveStatus('idle'); }
    }, 3000);
    return () => clearTimeout(autoSaveTimeoutRef.current);
  }, [project, loading]);

  // SAVE ON EXIT: Save to localStorage when user leaves the page
  useEffect(() => {
    const saveBeforeUnload = () => {
      try {
        const draftData = {
          data: project,
          timestamp: Date.now(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        console.log('Draft saved before exit');
      } catch (e) {
        console.error('Failed to save draft before exit:', e);
      }
    };

    window.addEventListener('beforeunload', saveBeforeUnload);
    
    return () => {
      saveBeforeUnload();
      window.removeEventListener('beforeunload', saveBeforeUnload);
    };
  }, [project, draftKey]);

  const restoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setProject(parsed.data);
      }
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
    setShowDraftRecovery(false);
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {
      console.error('Failed to discard draft:', e);
    }
    setShowDraftRecovery(false);
  };

  const clearLocalDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  };

  // Stable update callback
  const handleUpdateProject = useCallback((updatedProject: Project) => {
    persistDraftNow(updatedProject);
    setProject(updatedProject);
  }, [persistDraftNow]);

  // Stable callback for content updates
  const handleContentCommit = useCallback((content: string) => {
    setProject(prev => {
      const nextProject = { ...prev, content };
      persistDraftNow(nextProject);
      return nextProject;
    });
  }, [persistDraftNow]);

  const handleAutoFixContent = useCallback((nextContent: string) => {
    setProject(prev => {
      if (prev.content === nextContent) return prev;
      const nextProject = { ...prev, content: nextContent };
      persistDraftNow(nextProject);
      return nextProject;
    });
  }, [persistDraftNow]);

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
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setProject(prev => {
      const nextProject = { ...prev, content: newText };
      persistDraftNow(nextProject);
      return nextProject;
    });

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
  };

  const insertImageMarkdown = (imageMarkdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setProject(prev => {
        const nextProject = { ...prev, content: `${prev.content}\n${imageMarkdown}\n` };
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
        const nextProject = { ...prev, content: `${prev.content}${prev.content ? '\n' : ''}${linkMarkdown}` };
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

  const handleSave = async (shouldPublish: boolean = false) => {
    console.log('handleSave called with project:', project);
    
    if (!project.title) {
      alert('Title is required');
      return;
    }

    // Auto-generate slug if not provided
    let finalProject = { ...project };
    if (!finalProject.id && finalProject.title) {
      const autoSlug = finalProject.title
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

    let payload: Project = {
      ...finalProject,
      // If button says "Publish" (not already published), set status to published
      status: shouldPublish ? 'published' : finalProject.status
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
        alert('Warning: Some images may have failed to upload, but content will be saved');
      }
    }

    setIsSaving(true);
    try {
      console.log('Making API call...');
      if (project._id) {
        console.log('Updating existing project with _id:', project._id);
        await api.put(`/api/projects/${project._id}`, payload);
      } else {
        console.log('Creating new project...');
        // Create new project and capture the _id from response
        const response = await api.post('/api/projects', payload);
        console.log('API response:', response);
        // Update state with the _id returned from server
        setProject(prev => ({ ...prev, _id: response._id }));
      }
      clearLocalDraft();
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
                {project.title || 'Untitled'}
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

            {/* Local Draft Indicator */}
            {localDraftStatus !== 'idle' && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                localDraftStatus === 'saving'
                  ? 'text-yellow-400 bg-yellow-400/10'
                  : 'text-green-400 bg-green-400/10'
              }`}>
                <HardDrive className={`w-3 h-3 ${localDraftStatus === 'saving' ? 'animate-pulse' : ''}`} />
                <span>{localDraftStatus === 'saving' ? 'Local save...' : 'Local ✓'}</span>
              </div>
            )}

            {/* Server Autosave Indicator */}
            {autosaveStatus !== 'idle' && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                autosaveStatus === 'saving' ? 'text-yellow-400 bg-yellow-400/10' : 'text-green-400 bg-green-400/10'
              }`}>
                {autosaveStatus === 'saving' && (
                  <>
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {autosaveStatus === 'saved' && (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Server ✓</span>
                  </>
                )}
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
              onClick={() => {
                const shouldPublish = projectsSectionEnabled && project.status !== 'published';
                handleSave(shouldPublish);
              }}
              disabled={isSaving || !project.title}
              className="px-3 sm:px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving
                ? 'Saving...'
                : project.status === 'published'
                  ? 'Update'
                  : projectsSectionEnabled
                    ? 'Publish'
                    : 'Save'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - 12 Column Grid */}
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 max-w-[90rem] mx-auto">
          {/* Editor Area - col-span-8 on large screens */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {/* Title Input */}
            <div>
              <input
                type="text"
                value={localTitle}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Project Title..."
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
              />

              <div className="flex items-center gap-2">
                <AutoFixButton
                  text={project.content}
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
                    initialValue={project.content}
                    onCommit={handleContentCommit}
                    id={project._id || project.id}
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
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(project.content || '*Start writing to see preview...*') }}
                  />
                </div>
              </div>
            ) : (
              /* Full Editor (no preview) */
              <IsolatedContentEditor
                initialValue={project.content}
                onCommit={handleContentCommit}
                id={project._id || project.id}
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
        data={project}
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
                    {draftTimestamp ? formatDraftTime(draftTimestamp) : 'sebelumnya'}
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
