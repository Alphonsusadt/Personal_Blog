import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { WritingToolbar } from '../../components/WritingToolbar';
import { WritingSidebar } from '../../components/WritingSidebar';
import { ImageUploadDialog } from '../../components/ImageUploadDialog';
import { sanitizeMarkdown } from '../../lib/mediaUploader';
import { hasBase64Images } from '../../utils/media';
import { ArrowLeft, Check, Clock, Eye, EyeOff } from 'lucide-react';
import { renderMarkdown } from '../../utils/renderers';

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

export function WritingEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [writing, setWriting] = useState<Writing>(emptyWriting);
  const [loading, setLoading] = useState(!!slug);
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  // Load writing if editing existing one
  useEffect(() => {
    if (!slug || slug === 'new') {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/api/writings`)
      .then((writings: Writing[]) => {
        const found = writings.find(w => w.id === slug);
        if (found) {
          setWriting(found);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  // Autosave logic
  useEffect(() => {
    if (loading || !writing.title) return;

    setAutosaveStatus('saving');
    clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        if (writing._id) {
          await api.put(`/api/writings/${writing._id}`, writing);
        } else if (writing.id) {
          await api.post('/api/writings', writing);
        }
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Autosave failed:', err);
        setAutosaveStatus('idle');
      }
    }, 3000);

    return () => clearTimeout(autoSaveTimeoutRef.current);
  }, [writing, loading]);

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setWriting({ ...writing, content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
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
    setWriting({ ...writing, content: newText });

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + imageMarkdown.length;
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
    });
  };

  const handleSave = async () => {
    if (!writing.title || !writing.id) {
      alert('Title and Slug are required');
      return;
    }

    if (writing.status === 'scheduled' && !writing.publishAt) {
      alert('Mohon isi tanggal dan jam publish untuk penjadwalan');
      return;
    }

    let payload: Writing = {
      ...writing,
      readTime: `${Math.max(1, Math.ceil(wordCount / 200))} min`,
    };

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
      if (writing._id) {
        await api.put(`/api/writings/${writing._id}`, payload);
      } else {
        await api.post('/api/writings', payload);
      }
      alert('Writing saved successfully!');
      navigate('/admin/writings');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save writing');
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

            {/* Autosave Indicator */}
            {autosaveStatus !== 'idle' && (
              <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
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
              onClick={handleSave}
              disabled={isSaving || !writing.title || !writing.id}
              className="px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving
                ? 'Saving...'
                : writing.status === 'scheduled'
                  ? 'Schedule'
                  : writing.status === 'published'
                    ? 'Update'
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
                value={writing.title}
                onChange={e => setWriting({ ...writing, title: e.target.value })}
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

            <div className="flex items-center justify-between text-xs text-[#94A3B8] px-1">
              <span>Words: {wordCount}</span>
              <span>Characters: {characterCount}</span>
            </div>

            {/* Content Area - Editor or Split View */}
            {showPreview ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Editor */}
                <div className="flex flex-col h-full">
                  <label className="text-xs text-[#94A3B8] font-medium mb-2">MARKDOWN</label>
                  <textarea
                    ref={textareaRef}
                    value={writing.content}
                    onChange={e => setWriting({ ...writing, content: e.target.value })}
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
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(writing.content || '*Start writing to see preview...*') }}
                  />
                </div>
              </div>
            ) : (
              /* Full Editor (no preview) */
              <textarea
                ref={textareaRef}
                value={writing.content}
                onChange={e => setWriting({ ...writing, content: e.target.value })}
                placeholder="Start writing... (Markdown, LaTeX $$...$$ supported)"
                className="w-full min-h-[70vh] bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-4 text-sm font-mono focus:outline-none focus:border-[#60A5FA] resize-none"
              />
            )}
          </div>

          {/* Sidebar - Right (1/3 width) */}
          <div className="md:col-span-1">
            <WritingSidebar
              writing={writing}
              onUpdate={setWriting}
              onSave={handleSave}
              isSaving={isSaving}
              wordCount={wordCount}
              characterCount={characterCount}
              onRemoveImage={() => {}}
            />
          </div>
        </div>
      </main>

      {/* Image Upload Dialog */}
      <ImageUploadDialog
        isOpen={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onInsert={insertImageMarkdown}
        onScheduleChange={(scheduled) => {
          if (scheduled && writing.status !== 'scheduled') {
            setWriting(prev => ({ ...prev, status: 'scheduled' }));
          }
        }}
      />
    </div>
  );
}
