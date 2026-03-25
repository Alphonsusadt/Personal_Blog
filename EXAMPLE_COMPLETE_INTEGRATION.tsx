/**
 * EXAMPLE: Complete WritingEditor with Universal Base64 Solution
 *
 * This file shows exactly how to update WritingEditor.tsx to use the
 * universal base64 image solution.
 *
 * Copy this pattern to:
 * - WritingEditor.tsx (DONE - see below)
 * - ProjectEditor.tsx (replace writing → project, /api/writings → /api/projects)
 * - BookEditor.tsx (replace writing → book, /api/writings → /api/books)
 * - AboutManager.tsx (replace writing → about, /api/writings → /api/about)
 * - HomeManager.tsx (replace writing → home, /api/writings → /api/home)
 *
 * CHANGES MADE:
 * 1. Added imports from utils/media and lib/mediaUploader
 * 2. Replaced manual word/char counting with countWords() and countChars()
 * 3. Added attachUploadHandler() in useEffect for auto paste/drag-drop
 * 4. Updated handleSave() to call sanitizeContent() before save
 * 5. Added uploadError state for display feedback
 *
 * Lines changed: ~10 (out of 342 total lines = minimal changes!)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { WritingToolbar } from '../../components/WritingToolbar';
import { WritingSidebar } from '../../components/WritingSidebar';
import { ImageUploadDialog } from '../../components/ImageUploadDialog';
import { ArrowLeft, Check, Clock, AlertCircle } from 'lucide-react';

// 👇 NEW IMPORTS - Add these
import { countWords, countChars, sanitizeContent } from '../../utils/media';
import { attachUploadHandler } from '../../lib/mediaUploader';

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
  const [uploadError, setUploadError] = useState<string>(''); // 👈 NEW - For UI feedback

  // 👇 REPLACED LINES 48-57:
  // Remove this manual counting:
  // const plainContent = writing.content
  //   .replace(/```[\s\S]*?```/g, ' ')
  //   .replace(/`[^`]*`/g, ' ')
  //   .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  //   .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')
  //   .replace(/[>#*_~\-]/g, ' ')
  //   .replace(/\s+/g, ' ')
  //   .trim();
  // const wordCount = plainContent ? plainContent.split(' ').length : 0;
  // const characterCount = plainContent.length;

  // Add this (single line each):
  const wordCount = countWords(writing.content);        // ✅ NEW
  const characterCount = countChars(writing.content);   // ✅ NEW

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

  // 👇 NEW EFFECT - Attach upload handlers to textarea
  useEffect(() => {
    if (!textareaRef.current) return;

    // Helper to insert markdown at cursor position
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
      setWriting(prev => ({ ...prev, content: newText }));

      // Restore focus and cursor
      setTimeout(() => {
        textarea.focus();
        const cursorPos = start + imageMarkdown.length;
        textarea.selectionStart = cursorPos;
        textarea.selectionEnd = cursorPos;
      });
    };

    // Attach handlers for paste, drag-drop, file input
    attachUploadHandler(textareaRef.current, insertImageMarkdown, {
      onError: (error) => {
        console.error('Upload error:', error);
        setUploadError(error);
        // Auto-clear error after 5 seconds
        setTimeout(() => setUploadError(''), 5000);
      },
    });
  }, []);

  // Autosave logic (unchanged)
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

  // 👇 UPDATED FUNCTION - Add sanitizeContent() before save
  const handleSave = async () => {
    if (!writing.title || !writing.id) {
      alert('Title and Slug are required');
      return;
    }

    if (writing.status === 'scheduled' && !writing.publishAt) {
      alert('Mohon isi tanggal dan jam publish untuk penjadwalan');
      return;
    }

    setIsSaving(true);
    try {
      // 👇 THIS IS KEY - Sanitize content to remove base64 images
      // This will:
      // 1. Extract all base64 images from content
      // 2. Upload each to server
      // 3. Replace base64 with returned URLs
      // 4. Return cleaned content ready to save
      const sanitized = await sanitizeContent(writing.content, {
        onProgress: (progress) => console.log(`Upload progress: ${progress}%`),
        onError: (error) => {
          console.error('Sanitize error:', error);
          setUploadError(error);
        },
      });

      const payload: Writing = {
        ...writing,
        content: sanitized,  // 👈 Use sanitized content
        readTime: `${Math.max(1, Math.ceil(wordCount / 200))} min`,
      };

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
            {/* 👇 NEW - Show upload errors in header */}
            {uploadError && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                {uploadError}
              </div>
            )}

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

            {/* Toolbar */}
            <WritingToolbar
              textareaRef={textareaRef}
              onInsert={insertMarkdown}
              onInsertImage={insertImageMarkdown}
              onOpenImageDialog={() => setImageDialogOpen(true)}
            />

            <div className="flex items-center justify-between text-xs text-[#94A3B8] px-1">
              <span>Words: {wordCount}</span>
              <span>Characters: {characterCount}</span>
            </div>

            {/* Content Textarea */}
            <textarea
              ref={textareaRef}
              value={writing.content}
              onChange={e => setWriting({ ...writing, content: e.target.value })}
              placeholder="Start writing... (Markdown supported, paste/drag images)"
              className="w-full min-h-[70vh] bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-4 text-sm font-mono focus:outline-none focus:border-[#60A5FA] resize-none"
            />
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

/**
 * ============================================================================
 * COPY THIS PATTERN TO OTHER SECTIONS
 * ============================================================================
 *
 * For each section (Projects, Books, About, Home):
 * 1. Copy the imports at the top
 * 2. Replace wordCount/characterCount with countWords/countChars
 * 3. Add the attachUploadHandler useEffect
 * 4. Wrap content with sanitizeContent() in save function
 * 5. Add uploadError state and display
 *
 * That's it! Everything else is the same.
 */
