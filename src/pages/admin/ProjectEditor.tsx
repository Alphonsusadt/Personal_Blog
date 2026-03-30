import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { ProjectToolbar } from '../../components/ProjectToolbar';
import { ProjectSidebar } from '../../components/ProjectSidebar';
import { ImageUploadDialog } from '../../components/ImageUploadDialog';
import { FullPagePreview } from '../../components/FullPagePreview';
import { sanitizeMarkdown } from '../../lib/mediaUploader';
import { hasBase64Images } from '../../utils/media';
import { ArrowLeft, Check, Clock, Eye, EyeOff, Maximize2, HardDrive, AlertCircle } from 'lucide-react';
import { renderMarkdown } from '../../utils/renderers';
import { formatDraftTime } from '../../hooks/useLocalDraft';

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

export function ProjectEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [project, setProject] = useState<Project>(emptyProject);
  const [loading, setLoading] = useState(!!slug);
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [localDraftStatus, setLocalDraftStatus] = useState<'idle' | 'saved'>('idle');
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

  const draftKey = `project_draft_${slug || 'new'}`;

  // Check for local draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setDraftTimestamp(parsed.timestamp);
        if (parsed.data.content && (Date.now() - parsed.timestamp) < 86400000) {
          setShowDraftRecovery(true);
        }
      }
    } catch (e) {
      console.error('Failed to check draft:', e);
    }
  }, [draftKey]);

  useEffect(() => {
    if (!slug || slug === 'new') {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/api/projects`)
      .then((projects: Project[]) => {
        const found = projects.find(p => p.id === slug);
        if (found) {
          setProject(found);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  // Local storage autosave
  useEffect(() => {
    if (loading) return;
    
    const timeout = setTimeout(() => {
      try {
        const draftData = { data: project, timestamp: Date.now() };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        setLocalDraftStatus('saved');
        setTimeout(() => setLocalDraftStatus('idle'), 1500);
      } catch (e) {
        console.error('Failed to save local draft:', e);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [project, loading, draftKey]);

  // Server autosave logic (3 seconds delay)
  useEffect(() => {
    if (loading || !project.title) return;

    setAutosaveStatus('saving');
    clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        if (project._id) {
          await api.put(`/api/projects/${project._id}`, project);
        } else if (project.id) {
          // For new drafts, capture the _id from POST response
          const response = await api.post('/api/projects', project);
          // Update state with the _id so subsequent autosaves use PUT
          setProject(prev => ({ ...prev, _id: response._id }));
        } else {
          // If no slug yet, don't try to save to server - only local autosave works
          setAutosaveStatus('idle');
          return;
        }
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Autosave failed:', err);
        setAutosaveStatus('idle');
        // Don't alert for autosave failures - just silently fail and rely on local draft
      }
    }, 3000);

    return () => clearTimeout(autoSaveTimeoutRef.current);
  }, [project, loading]);

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

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setProject({ ...project, content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
  };

  const insertImageMarkdown = (imageMarkdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setProject(prev => ({ ...prev, content: `${prev.content}\n${imageMarkdown}\n` }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${imageMarkdown}${text.substring(end)}`;
    setProject({ ...project, content: newText });

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + imageMarkdown.length;
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
            {/* Local Draft Indicator */}
            {localDraftStatus === 'saved' && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <HardDrive className="w-3 h-3" />
                <span className="hidden sm:inline">Local</span>
              </div>
            )}

            {autosaveStatus !== 'idle' && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-[#94A3B8]">
                {autosaveStatus === 'saving' && (
                  <>
                    <Clock className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                )}
                {autosaveStatus === 'saved' && (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    Server
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
              onClick={() => handleSave(project.status !== 'published')}
              disabled={isSaving || !project.title}
              className="px-3 sm:px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : project.status === 'published' ? 'Update' : 'Publish'}
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
                value={project.title}
                onChange={e => setProject({ ...project, title: e.target.value })}
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

            {/* Content Area - Editor or Split View */}
            {showPreview ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Editor */}
                <div className="flex flex-col h-full">
                  <label className="text-xs text-[#94A3B8] font-medium mb-2">MARKDOWN</label>
                  <textarea
                    ref={textareaRef}
                    value={project.content}
                    onChange={e => setProject({ ...project, content: e.target.value })}
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
              <textarea
                ref={textareaRef}
                value={project.content}
                onChange={e => setProject({ ...project, content: e.target.value })}
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
                onUpdate={setProject}
                onSave={handleSave}
                isSaving={isSaving}
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
