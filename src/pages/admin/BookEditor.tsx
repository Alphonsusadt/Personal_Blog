import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { BookToolbar } from '../../components/BookToolbar';
import { BookSidebar } from '../../components/BookSidebar';
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

function hasMeaningfulBookDraft(data: Book): boolean {
  return Boolean(
    data.title?.trim() ||
    data.author?.trim() ||
    data.cover?.trim() ||
    data.review?.trim() ||
    data.takeaways?.length ||
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

export function BookEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const localDraftStatusTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingCreateRef = useRef(false);

  const [book, setBook] = useState<Book>(emptyBook);
  const [localTitle, setLocalTitle] = useState(''); // Local state for smooth title typing
  const [loading, setLoading] = useState(!!slug);
  const [isSaving, setIsSaving] = useState(false);
  const [booksSectionEnabled, setBooksSectionEnabled] = useState(true);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [localDraftStatus, setLocalDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

  useEffect(() => {
    api.get('/api/settings')
      .then((settings: any) => {
        setBooksSectionEnabled(settings?.sections?.books?.enabled !== false);
      })
      .catch(() => {
        setBooksSectionEnabled(true);
      });
  }, []);

  const draftKey = `book_draft_${slug || 'new'}`;

  const persistDraftNow = useCallback((nextBook: Book) => {
    try {
      setLocalDraftStatus('saving');
      localStorage.setItem(draftKey, JSON.stringify({ data: nextBook, timestamp: Date.now() }));
      setLocalDraftStatus('saved');
      clearTimeout(localDraftStatusTimeoutRef.current);
      localDraftStatusTimeoutRef.current = setTimeout(() => setLocalDraftStatus('idle'), 900);
    } catch (e) {
      console.error('Local draft error:', e);
    }
  }, [draftKey]);

  // Sync localTitle when book changes from external source
  useEffect(() => {
    setLocalTitle(book.title);
  }, [book.title]);

  // Title is persisted immediately so fast navigation cannot lose edits.
  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    setBook(prev => {
      const nextBook = { ...prev, title: value };
      persistDraftNow(nextBook);
      return nextBook;
    });
  };

  const plainContent = book.review
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
        if (hasMeaningfulBookDraft(parsed.data) && (Date.now() - parsed.timestamp) < 86400000) {
          setShowDraftRecovery(false);
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
      .get(`/api/books`)
      .then((books: Book[]) => {
        const found = books.find(b => b.id === slug || b._id === slug);
        if (found) {
          setBook(found);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  // Periodic backup write without touching indicator state.
  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ data: book, timestamp: Date.now() }));
      } catch (e) { console.error('Local draft error:', e); }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [book, loading, draftKey]);

  useEffect(() => {
    return () => clearTimeout(localDraftStatusTimeoutRef.current);
  }, []);

  // Server autosave - 3s (FASTER!)
  useEffect(() => {
    const canAutosaveToServer = Boolean(book.title.trim() || getWordCount(book.review) >= 50);

    if (loading || !canAutosaveToServer) return;
    clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setAutosaveStatus('saving');
      try {
        if (book._id) {
          await api.put(`/api/books/${book._id}`, book);
        } else if (!pendingCreateRef.current) {
          pendingCreateRef.current = true;
          const draftId = book.id || createAutosaveDraftId(book.title, book.review, 'book');
          const response = await api.post('/api/books', { ...book, id: draftId });
          setBook(prev => ({ ...prev, _id: response._id }));
          pendingCreateRef.current = false;
        } else { setAutosaveStatus('idle'); return; }
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus('idle'), 1500);
      } catch (err) { pendingCreateRef.current = false; console.error('Autosave failed:', err); setAutosaveStatus('idle'); }
    }, 3000);
    return () => clearTimeout(autoSaveTimeoutRef.current);
  }, [book, loading]);

  // SAVE ON EXIT: Save to localStorage when user leaves the page
  useEffect(() => {
    const saveBeforeUnload = () => {
      try {
        const draftData = {
          data: book,
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
  }, [book, draftKey]);

  const restoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setBook(parsed.data);
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
  const handleUpdateBook = useCallback((updatedBook: Book) => {
    persistDraftNow(updatedBook);
    setBook(updatedBook);
  }, [persistDraftNow]);

  // Stable callback for review content updates
  const handleReviewCommit = useCallback((review: string) => {
    setBook(prev => {
      const nextBook = { ...prev, review };
      persistDraftNow(nextBook);
      return nextBook;
    });
  }, [persistDraftNow]);

  const handleAutoFixReview = useCallback((nextReview: string) => {
    setBook(prev => {
      if (prev.review === nextReview) return prev;
      const nextBook = { ...prev, review: nextReview };
      persistDraftNow(nextBook);
      return nextBook;
    });
  }, [persistDraftNow]);

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setBook(prev => {
      const nextBook = { ...prev, review: newText };
      persistDraftNow(nextBook);
      return nextBook;
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
      setBook(prev => {
        const nextBook = { ...prev, review: `${prev.review}\n${imageMarkdown}\n` };
        persistDraftNow(nextBook);
        return nextBook;
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${imageMarkdown}${text.substring(end)}`;
    setBook(prev => {
      const nextBook = { ...prev, review: newText };
      persistDraftNow(nextBook);
      return nextBook;
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
      setBook(prev => {
        const nextBook = { ...prev, review: `${prev.review}${prev.review ? '\n' : ''}${linkMarkdown}` };
        persistDraftNow(nextBook);
        return nextBook;
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${linkMarkdown}${text.substring(end)}`;
    setBook(prev => {
      const nextBook = { ...prev, review: newText };
      persistDraftNow(nextBook);
      return nextBook;
    });

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + linkMarkdown.length;
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
    });
  };

  const handleSave = async () => {
    console.log('handleSave called with book:', book);
    
    if (!book.title) {
      alert('Title is required');
      return;
    }

    // Auto-generate slug if not provided
    let finalBook = { ...book };
    if (!finalBook.id && finalBook.title) {
      const autoSlug = finalBook.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      finalBook.id = autoSlug;
      // Update state dengan slug yang di-generate
      setBook(prev => ({ ...prev, id: autoSlug }));
      console.log('Auto-generated slug:', autoSlug);
    }

    let payload: Book = { ...finalBook };

    console.log('Payload to save:', payload);

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
      console.log('Making API call...');
      if (book._id) {
        console.log('Updating existing book with _id:', book._id);
        await api.put(`/api/books/${book._id}`, payload);
      } else {
        console.log('Creating new book...');
        // Create new book and capture the _id from response
        const response = await api.post('/api/books', payload);
        console.log('API response:', response);
        // Update state with the _id returned from server
        setBook(prev => ({ ...prev, _id: response._id }));
      }
      clearLocalDraft();
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
              disabled={isSaving || !book.title}
              className="px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving
                ? 'Saving...'
                : book.status === 'published'
                  ? 'Update'
                  : booksSectionEnabled
                    ? 'Publish'
                    : 'Save'}
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
                value={localTitle}
                onChange={e => handleTitleChange(e.target.value)}
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
              <BookToolbar 
                textareaRef={textareaRef} 
                onInsert={insertMarkdown}
                onInsertImage={insertImageMarkdown}
                onOpenImageDialog={() => setImageDialogOpen(true)}
                onOpenLinkDialog={() => setLinkDialogOpen(true)}
              />

              <div className="flex items-center gap-2">
                <AutoFixButton
                  text={book.review}
                  onApply={handleAutoFixReview}
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

            {/* Content Area - Editor or Split View */}
            {showPreview ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Editor */}
                <div className="flex flex-col h-full">
                  <label className="text-xs text-[#94A3B8] font-medium mb-2">MARKDOWN</label>
                  <IsolatedContentEditor
                    initialValue={book.review}
                    onCommit={handleReviewCommit}
                    id={book._id || book.id}
                    textareaRef={textareaRef}
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
              <IsolatedContentEditor
                initialValue={book.review}
                onCommit={handleReviewCommit}
                id={book._id || book.id}
                textareaRef={textareaRef}
                placeholder="Book review... (Markdown, LaTeX $$...$$ supported)"
                className="w-full min-h-[70vh] bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-4 py-4 text-sm font-mono focus:outline-none focus:border-[#60A5FA] resize-none"
              />
            )}
          </div>

          {/* Sidebar - Right */}
          <div className="md:col-span-1">
            <BookSidebar
              book={book}
              onUpdate={handleUpdateBook}
              onSave={handleSave}
              isSaving={isSaving}
              sectionEnabled={booksSectionEnabled}
            />
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
        type="book"
        data={book}
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
