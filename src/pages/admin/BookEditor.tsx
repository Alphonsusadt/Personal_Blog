import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { BookToolbar } from '../../components/BookToolbar';
import { BookSidebar } from '../../components/BookSidebar';
import { ImageUploadDialog } from '../../components/ImageUploadDialog';
import { sanitizeMarkdown } from '../../lib/mediaUploader';
import { hasBase64Images } from '../../utils/media';
import { ArrowLeft, Check, Clock, Eye, EyeOff } from 'lucide-react';
import { renderMarkdown } from '../../utils/renderers';

interface Book {
  _id?: string;
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  category: string;
  takeaways: string[];
  review: string;
  status?: 'draft' | 'published';
}

const emptyBook: Book = {
  id: '',
  title: '',
  author: '',
  cover: '',
  rating: 5,
  category: 'technical',
  takeaways: [],
  review: '',
  status: 'draft',
};

export function BookEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [book, setBook] = useState<Book>(emptyBook);
  const [loading, setLoading] = useState(!!slug);
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  useEffect(() => {
    if (!slug || slug === 'new') {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/api/books`)
      .then((books: Book[]) => {
        const found = books.find(b => b.id === slug);
        if (found) {
          setBook(found);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (loading || !book.title) return;

    setAutosaveStatus('saving');
    clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        if (book._id) {
          await api.put(`/api/books/${book._id}`, book);
        } else if (book.id) {
          await api.post('/api/books', book);
        }
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Autosave failed:', err);
        setAutosaveStatus('idle');
      }
    }, 3000);

    return () => clearTimeout(autoSaveTimeoutRef.current);
  }, [book, loading]);

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setBook({ ...book, review: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
  };

  const handleSave = async () => {
    if (!book.title || !book.id) {
      alert('Title and Slug are required');
      return;
    }

    let payload: Book = { ...book };

    // Sanitize base64 images to URLs if present in review
    if (hasBase64Images(payload.review)) {
      setIsSaving(true);
      try {
        const sanitized = await sanitizeMarkdown(payload.review);
        payload.review = sanitized;
      } catch (err) {
        console.error('Image sanitization failed:', err);
        alert('Peringatan: Beberapa gambar mungkin gagal diupload, namun konten akan disimpan');
      }
    }

    setIsSaving(true);
    try {
      if (book._id) {
        await api.put(`/api/books/${book._id}`, payload);
      } else {
        await api.post('/api/books', payload);
      }
      alert('Book saved successfully!');
      navigate('/admin/books');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save book');
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
              onClick={() => navigate('/admin/books')}
              className="p-2 text-[#94A3B8] hover:text-[#60A5FA] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#F8FAFC]">
                {book._id ? 'Edit Book' : 'New Book'}
              </h1>
              <p className="text-xs text-[#94A3B8]">{book.title || 'Untitled'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

            {book.status === 'published' && (
              <button
                onClick={async () => {
                  if (!confirm('Withdraw this book?')) return;
                  try {
                    const updated = { ...book, status: 'draft' as const };
                    if (book._id) {
                      await api.put(`/api/books/${book._id}`, updated);
                      setBook(updated);
                      alert('Book withdrawn');
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Failed');
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                Withdraw
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || !book.title || !book.id}
              className="px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : book.status === 'published' ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl">
          {/* Editor Area - Left */}
          <div className="md:col-span-2 space-y-4">
            {/* Title & Author */}
            <div className="space-y-3">
              <input
                type="text"
                value={book.title}
                onChange={e => setBook({ ...book, title: e.target.value })}
                placeholder="Book Title..."
                className="w-full text-3xl font-bold text-[#F8FAFC] bg-transparent border-b-2 border-[#334155] pb-3 focus:outline-none focus:border-[#60A5FA] transition-colors placeholder:text-[#475569]"
              />
              <input
                type="text"
                value={book.author}
                onChange={e => setBook({ ...book, author: e.target.value })}
                placeholder="Author name..."
                className="w-full text-lg text-[#94A3B8] bg-transparent border-b border-[#334155] pb-2 focus:outline-none focus:border-[#60A5FA] focus:text-[#F8FAFC] transition-colors placeholder:text-[#475569]"
              />
            </div>

            {/* Toolbar with Preview Toggle */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <BookToolbar textareaRef={textareaRef} onInsert={insertMarkdown} />

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
                    value={book.review}
                    onChange={e => setBook({ ...book, review: e.target.value })}
                    placeholder="Book review... (Markdown, LaTeX $$...$$ supported)"
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
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(book.review || '*Start writing to see preview...*') }}
                  />
                </div>
              </div>
            ) : (
              /* Full Editor (no preview) */
              <textarea
                ref={textareaRef}
                value={book.review}
                onChange={e => setBook({ ...book, review: e.target.value })}
                placeholder="Book review... (Markdown, LaTeX $$...$$ supported)"
                className="w-full min-h-[70vh] bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-4 text-sm font-mono focus:outline-none focus:border-[#60A5FA] resize-none"
              />
            )}
          </div>

          {/* Sidebar - Right */}
          <div className="md:col-span-1">
            <BookSidebar
              book={book}
              onUpdate={setBook}
              onSave={handleSave}
              isSaving={isSaving}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
