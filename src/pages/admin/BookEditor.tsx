import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getRuntimeCache, setRuntimeCache, invalidateRuntimeCache } from '../../lib/api';
import { BookToolbar } from '../../components/BookToolbar';
import { BookSidebar } from '../../components/BookSidebar';
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

interface Book {
  _id?: string;
  id: string;
  title: LocalizedTextValue;
  author: LocalizedTextValue;
  cover: string;
  rating: number;
  category: string;
  takeaways: string[];
  review: LocalizedTextValue;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  metaDescription?: string;
  ogImage?: string;
  keywords?: string;
  metaTitle?: string;
  contentLanguage?: 'en' | 'id' | 'bilingual';
  translationOfId?: string;
  devStatus?: 'planning' | 'ongoing' | 'completed';
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
  devStatus: 'planning',
};

function hasMeaningfulBookDraft(data: Book): boolean {
  const hasTitle = resolveLocalizedText(data.title, 'en').trim() || resolveLocalizedText(data.title, 'id').trim();
  const hasAuthor = resolveLocalizedText(data.author, 'en').trim() || resolveLocalizedText(data.author, 'id').trim();
  const hasReview = resolveLocalizedText(data.review, 'en').trim() || resolveLocalizedText(data.review, 'id').trim();
  return Boolean(
    hasTitle ||
    hasAuthor ||
    data.cover?.trim() ||
    hasReview ||
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
  const pendingCreateRef = useRef(false);
  const dbIdRef = useRef<string | undefined>(undefined);
  const justCreatedRef = useRef(false);
  const [book, setBook] = useState<Book>(emptyBook);

  // Sync dbIdRef with book._id whenever it changes
  useEffect(() => {
    dbIdRef.current = book._id;
  }, [book._id]);
  const [localTitle, setLocalTitle] = useState(''); // Local state for smooth title typing
  const [loading, setLoading] = useState(!!slug);
  const [isSaving, setIsSaving] = useState(false);
  const [booksSectionEnabled, setBooksSectionEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [assetReuserOpen, setAssetReuserOpen] = useState(false);

  const { language: autoFixLanguage, setLanguage: setAutoFixLanguage } = useAutoFixLanguage();
  const exactLocalizedTitle = getExactLocalizedText(book.title, autoFixLanguage);
  const exactLocalizedAuthor = getExactLocalizedText(book.author, autoFixLanguage);
  const exactLocalizedReview = getExactLocalizedText(book.review, autoFixLanguage);
  const previewHtml = useRenderedMarkdown(exactLocalizedReview || '*Start writing to see preview...*');

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
        setBooksSectionEnabled(settings?.sections?.books?.enabled !== false);
      })
      .catch(() => {
        setBooksSectionEnabled(true);
      });
  }, []);

  const draftKey = `book_draft_${slug || 'new'}`;

  // ── useAdminAutosave: all 6 principles in one hook ────────────────────────
  const autosave = useAdminAutosave<Book>({
    storageKey: draftKey,
    data: book,
    enabled: !loading,
    hasMeaningfulData: hasMeaningfulBookDraft,
    saveToServer: async (snapshot) => {
      const currentDbId = dbIdRef.current || snapshot._id;
      if (currentDbId) {
        await api.put(`/api/books/${currentDbId}`, { ...snapshot, _id: currentDbId });
        const updated = { ...snapshot, _id: currentDbId };
        if (updated.id) {
          setRuntimeCache(`admin:books:item:${updated.id}`, updated);
        }
        invalidateRuntimeCache('admin:books:list');
        setBook(updated);
        return updated;
      } else if (!pendingCreateRef.current) {
        pendingCreateRef.current = true;
        const autoSlug = snapshot.id || createAutosaveDraftId(
          resolveLocalizedText(snapshot.title, autoFixLanguage), 
          resolveLocalizedText(snapshot.review, autoFixLanguage), 
          'book'
        );
        const response = await api.post('/api/books', { ...snapshot, id: autoSlug });
        if (response._id) {
          dbIdRef.current = response._id;
          const updated = { ...snapshot, _id: response._id, id: response.id || autoSlug };
          setRuntimeCache(`admin:books:item:${response.id || autoSlug}`, updated);
          invalidateRuntimeCache('admin:books:list');
          justCreatedRef.current = true;
          setBook(updated);
          navigate(`/admin/books/edit/${response.id || autoSlug}`, { replace: true });
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

  // Sync localTitle when book changes from external source
  useEffect(() => {
    setLocalTitle(exactLocalizedTitle);
  }, [exactLocalizedTitle, autoFixLanguage]);

  // Title is persisted immediately so fast navigation cannot lose edits.
  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    setBook(prev => ({ ...prev, title: setLocalizedText(prev.title, autoFixLanguage, value) }));
  };

  // Use resolveLocalizedText with fallback to ensure counter works even when content
  // is stored in a different language than the currently selected one
  const reviewForCounter = resolveLocalizedText(book.review, autoFixLanguage);
  const plainContent = reviewForCounter
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
    if (draft && hasMeaningfulBookDraft(draft.data) && (Date.now() - draft.timestamp) < 86_400_000) {
      setShowDraftRecovery(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Load book if editing existing one — use single-item endpoint with fallback
  useEffect(() => {
    if (!slug || slug === 'new') {
      setLoading(false);
      return;
    }
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }
    const cacheKey = `admin:books:item:${slug}`;
    const cached = getRuntimeCache<Book>(cacheKey);
    if (cached) {
      setBook(cached);
      setLoading(false);
      // Initialize autosave dirty-flag baseline with cached data
      autosave.markAsSaved(cached);
      api
        .get(`/api/books/admin/${encodeURIComponent(slug)}`)
        .then((data: Book) => {
          setRuntimeCache(cacheKey, data);
          setBook(data);
          autosave.markAsSaved(data);
        })
        .catch(() => {
          api.get('/api/books').then((books: Book[]) => {
            const found = books.find(b => b.id === slug || b._id === slug);
            if (found) {
              setRuntimeCache(cacheKey, found);
              setBook(found);
              autosave.markAsSaved(found);
            }
          }).catch(console.error);
        });
      return;
    }
    setLoading(true);
    api
      .get(`/api/books/admin/${encodeURIComponent(slug)}`)
      .then((data: Book) => {
        setRuntimeCache(cacheKey, data);
        setBook(data);
        autosave.markAsSaved(data);
      })
      .catch(() => {
        // Fallback: load all and search client-side
        api.get('/api/books').then((books: Book[]) => {
          const found = books.find(b => b.id === slug || b._id === slug);
          if (found) {
            setRuntimeCache(cacheKey, found);
            setBook(found);
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
        setBook(draft.data);
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
  const handleUpdateBook = useCallback((updatedBook: Book) => {
    setBook(updatedBook);
  }, []);

  // Stable callback for review content updates
  const handleReviewCommit = useCallback((review: string) => {
    setBook(prev => ({ ...prev, review: setLocalizedText(prev.review, autoFixLanguage, review) }));
  }, [autoFixLanguage]);

  const handleAutoFixReview = useCallback((nextReview: string) => {
    setBook(prev => {
      if (getExactLocalizedText(prev.review, autoFixLanguage) === nextReview) return prev;
      return { ...prev, review: setLocalizedText(prev.review, autoFixLanguage, nextReview) };
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
  }, [updateCaretSuggestions, book._id, book.id]);

  const applyCaretSuggestion = useCallback((replacement: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !caretWord) return;
    const text = textarea.value ?? '';
    const nextText = text.slice(0, caretWord.start) + replacement + text.slice(caretWord.end);
    textarea.value = nextText;
    handleAutoFixReview(nextText);
    const nextPos = caretWord.start + replacement.length;
    setTimeout(() => { textarea.focus(); textarea.selectionStart = nextPos; textarea.selectionEnd = nextPos; }, 0);
    setTimeout(() => updateCaretSuggestions(), 0);
  }, [caretWord, handleAutoFixReview, updateCaretSuggestions]);

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;

    if (!textarea) {
      setBook(prev => {
        const current = getExactLocalizedText(prev.review, autoFixLanguage);
        const newText = current + before + after;
        const nextBook = { ...prev, review: setLocalizedText(prev.review, autoFixLanguage, newText) };
        return nextBook;
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

    setBook(prev => {
      const nextBook = { ...prev, review: setLocalizedText(prev.review, autoFixLanguage, newText) };
      return nextBook;
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
      setBook(prev => {
        const nextBook = { ...prev, review: setLocalizedText(prev.review, autoFixLanguage, `${getExactLocalizedText(prev.review, autoFixLanguage)}\n${imageMarkdown}\n`) };
        return nextBook;
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${imageMarkdown}${text.substring(end)}`;
    setBook(prev => {
      const nextBook = { ...prev, review: setLocalizedText(prev.review, autoFixLanguage, newText) };
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
        const nextBook = { ...prev, review: setLocalizedText(prev.review, autoFixLanguage, `${getExactLocalizedText(prev.review, autoFixLanguage)}${getExactLocalizedText(prev.review, autoFixLanguage) ? '\n' : ''}${linkMarkdown}`) };
        return nextBook;
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = `${text.substring(0, start)}${linkMarkdown}${text.substring(end)}`;
    setBook(prev => {
      const nextBook = { ...prev, review: setLocalizedText(prev.review, autoFixLanguage, newText) };
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
    
    if (!exactLocalizedTitle) {
      alert('Title is required');
      return;
    }

    // Auto-generate slug if not provided
    let finalBook = { ...book };
    if (!finalBook.id && exactLocalizedTitle) {
      const autoSlug = exactLocalizedTitle
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
    if (hasBase64Images(exactLocalizedReview)) {
      setIsSaving(true);
      try {
        const sanitized = await sanitizeMarkdown(exactLocalizedReview);
        payload.review = setLocalizedText(payload.review, autoFixLanguage, sanitized);
      } catch (err) {
        console.error('Image sanitization failed:', err);
        alert('Peringatan: Beberapa gambar mungkin gagal diupload, namun konten akan disimpan');
      }
    }

    setIsSaving(true);
    try {
      console.log('Making API call...');
      const currentDbId = dbIdRef.current || book._id;
      if (currentDbId) {
        console.log('Updating existing book with _id:', currentDbId);
        await api.put(`/api/books/${currentDbId}`, { ...payload, _id: currentDbId });
        const updatedBook = { ...payload, _id: currentDbId } as Book;
        if (updatedBook.id) {
          setRuntimeCache(`admin:books:item:${updatedBook.id}`, updatedBook);
        }
        invalidateRuntimeCache('admin:books:list');
        setBook(updatedBook);
        autosave.markAsSaved(updatedBook);
      } else {
        console.log('Creating new book...');
        const response = await api.post('/api/books', payload);
        // Update state with the _id returned from server
        dbIdRef.current = response._id;
        const newBook = { ...payload, _id: response._id } as Book;
        if (newBook.id) {
          setRuntimeCache(`admin:books:item:${newBook.id}`, newBook);
        }
        invalidateRuntimeCache('admin:books:list');
        setBook(newBook);
        autosave.markAsSaved(newBook);
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
              <p className="text-xs text-[#94A3B8]">{exactLocalizedTitle || 'Untitled'}</p>
              
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

            {/* Autosave Indicator */}
            {autosave.status === 'saving' && (
              <span className="flex items-center text-amber-500 font-medium">
                <Clock className="w-4 h-4 mr-1 animate-spin" /> Saving...
              </span>
            )}
            {autosave.status === 'retrying' && (
              <span className="flex items-center text-amber-500 font-medium">
                <Clock className="w-4 h-4 mr-1 animate-spin" /> Retrying...
              </span>
            )}
            {autosave.status === 'saved' && (
              <span className="flex items-center text-emerald-500 font-medium">
                <Check className="w-4 h-4 mr-1" /> Saved
              </span>
            )}
            {autosave.status === 'error' && (
              <span className="flex items-center text-red-500 font-medium">
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
              onClick={() => handleSave()}
              disabled={isSaving || !exactLocalizedTitle}
              className="px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving
                ? 'Saving...'
                : book.status === 'published'
                  ? 'Update Published'
                  : book.status === 'scheduled'
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

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl">
          {/* Editor Area - Left */}
          <div className="md:col-span-2 space-y-4">
            
            {/* Language Tabs & ID Display */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#334155] pb-2">
              <div className="flex items-center gap-1">
                {(!book.contentLanguage || book.contentLanguage === 'bilingual' || book.contentLanguage === 'id') && (
                  <button
                    onClick={() => setAutoFixLanguage('id')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${autoFixLanguage === 'id' ? 'bg-[#1E40AF] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                  >
                    🇮🇩 Indonesia
                  </button>
                )}
                {(!book.contentLanguage || book.contentLanguage === 'bilingual' || book.contentLanguage === 'en') && (
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
                    {book._id || 'Unsaved'}
                  </code>
                </div>
                <div className="flex items-center gap-1">
                  <span>Slug:</span>
                  <code className="bg-[#0F172A] px-1.5 py-0.5 rounded text-[#60A5FA] select-all cursor-text font-mono">
                    {book.id || 'Unsaved'}
                  </code>
                </div>
              </div>
            </div>

            {/* Title & Author */}
            <div className="space-y-3">
              <input
                type="text"
                value={localTitle}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder={autoFixLanguage === 'id' ? 'Judul Buku...' : 'Book Title...'}
                className="w-full text-3xl font-bold text-[#F8FAFC] bg-transparent border-b-2 border-[#334155] pb-3 focus:outline-none focus:border-[#60A5FA] transition-colors placeholder:text-[#475569]"
              />
              <input
                type="text"
                value={exactLocalizedAuthor}
                onChange={e => setBook(prev => ({ ...prev, author: setLocalizedText(prev.author, autoFixLanguage, e.target.value) }))}
                placeholder={autoFixLanguage === 'id' ? 'Nama Penulis...' : 'Author name...'}
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
                onOpenAssetReuser={() => setAssetReuserOpen(true)}
              />

              <div className="flex items-center gap-2">
                <AutoFixButton
                  text={exactLocalizedReview}
                  onApply={handleAutoFixReview}
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
                    initialValue={exactLocalizedReview}
                    onCommit={handleReviewCommit}
                    id={`${book._id || book.id}-${autoFixLanguage}`}
                    textareaRef={textareaRef}
                    spellCheck
                    lang={autoFixLanguage}
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
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            ) : (
              /* Full Editor (no preview) */
              <IsolatedContentEditor
                initialValue={exactLocalizedReview}
                onCommit={handleReviewCommit}
                id={`${book._id || book.id}-${autoFixLanguage}`}
                textareaRef={textareaRef}
                spellCheck
                lang={autoFixLanguage}
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
              wordCount={wordCount}
              characterCount={characterCount}
              sectionEnabled={booksSectionEnabled}
              onBeforeTranslate={autosave.saveNow}
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

      <AssetReuserDialog
        isOpen={assetReuserOpen}
        onClose={() => setAssetReuserOpen(false)}
        sourceLanguage={autoFixLanguage === 'en' ? 'id' : 'en'}
        otherLanguageContent={getExactLocalizedText(book.review, autoFixLanguage === 'en' ? 'id' : 'en')}
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
        type="book"
        data={{
          ...book,
          title: resolveLocalizedText(book.title, autoFixLanguage),
          author: resolveLocalizedText(book.author, autoFixLanguage),
          review: resolveLocalizedText(book.review, autoFixLanguage),
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
