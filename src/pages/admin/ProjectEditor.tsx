import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { ProjectToolbar } from '../../components/ProjectToolbar';
import { ProjectSidebar } from '../../components/ProjectSidebar';
import { sanitizeMarkdown } from '../../lib/mediaUploader';
import { hasBase64Images } from '../../utils/media';
import { ArrowLeft, Check, Clock, Eye, EyeOff } from 'lucide-react';
import { renderMarkdown } from '../../utils/renderers';

interface Project {
  _id?: string;
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  content: string;
  status?: 'draft' | 'published';
  devStatus?: 'planning' | 'ongoing' | 'completed';
  date?: string;
  githubUrl?: string;
  paperUrl?: string;
  demoUrl?: string;
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

  useEffect(() => {
    if (loading || !project.title) return;

    setAutosaveStatus('saving');
    clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        if (project._id) {
          await api.put(`/api/projects/${project._id}`, project);
        } else if (project.id) {
          await api.post('/api/projects', project);
        }
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Autosave failed:', err);
        setAutosaveStatus('idle');
      }
    }, 3000);

    return () => clearTimeout(autoSaveTimeoutRef.current);
  }, [project, loading]);

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

  const handleSave = async () => {
    if (!project.title || !project.id) {
      alert('Title and Slug are required');
      return;
    }

    let payload: Project = { ...project };

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
      if (project._id) {
        await api.put(`/api/projects/${project._id}`, payload);
      } else {
        await api.post('/api/projects', payload);
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
                {project.title || 'Untitled'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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
                    <Check className="w-3 h-3" />
                    Saved
                  </>
                )}
              </div>
            )}

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
              onClick={handleSave}
              disabled={isSaving || !project.title || !project.id}
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
              <ProjectToolbar textareaRef={textareaRef} onInsert={insertMarkdown} />

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
                <div className="space-y-2">
                  <label className="text-xs text-[#94A3B8] font-medium">MARKDOWN</label>
                  <textarea
                    ref={textareaRef}
                    value={project.content}
                    onChange={e => setProject({ ...project, content: e.target.value })}
                    placeholder="Project content... (Markdown, LaTeX $$...$$ supported)"
                    className="w-full min-h-[60vh] bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-4 text-sm font-mono focus:outline-none focus:border-[#60A5FA] resize-none"
                  />
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <label className="text-xs text-[#94A3B8] font-medium">PREVIEW</label>
                  <div
                    className="w-full min-h-[60vh] bg-[#0F172A] border border-[#334155] rounded-lg px-4 py-4 overflow-auto prose prose-invert prose-sm max-w-none"
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
    </div>
  );
}
