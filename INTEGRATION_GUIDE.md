/**
 * ============================================================================
 * INTEGRATION EXAMPLES - UNIVERSAL BASE64 IMAGE SOLUTION
 * ============================================================================
 *
 * Panduang Step-by-Step untuk integrate solution di semua section CMS
 *
 * Struktur File yang Sudah Dibuat:
 * - src/utils/media.ts - Core utilities (stripBase64, countWords, countChars, etc)
 * - src/lib/mediaUploader.ts - Upload handler dengan event interception
 * - cms/server/routes/media.js - Backend endpoint untuk image upload
 * - cms/server/index.js - Updated dengan media routes
 * - cms/package.json - Added multer dependency
 *
 * ============================================================================
 * STEP 1: UPDATE EXISTING PAGES
 * ============================================================================
 *
 * Untuk WRITINGS, PROJECTS, BOOKS, ABOUT, HOME - lakukan update yang sama:
 *
 * A. Update Editor Component (WritingEditor, ProjectEditor, BookEditor, etc)
 *
 *    1. Import utilities
 *       ```
 *       import { countWords, countChars, sanitizeContent } from '../../utils/media';
 *       import { attachUploadHandler } from '../../lib/mediaUploader';
 *       ```
 *
 *    2. Replace word/char counting logic dengan utility functions
 *       OLD:
 *       const plainContent = writing.content.replace(/.../, ' ')...
 *       const wordCount = plainContent ? plainContent.split(' ').length : 0;
 *       const characterCount = plainContent.length;
 *
 *       NEW:
 *       const wordCount = countWords(writing.content);
 *       const characterCount = countChars(writing.content);
 *
 *    3. Attach upload handler ke textarea dalam useEffect
 *       ```
 *       useEffect(() => {
 *         if (!textareaRef.current) return;
 *         attachUploadHandler(textareaRef.current, insertImageMarkdown, {
 *           onError: (error) => console.error(error),
 *         });
 *       }, []);
 *       ```
 *
 *    4. Update handleSave untuk sanitize content sebelum save
 *       ```
 *       const handleSave = async () => {
 *         // ... existing validation ...
 *         const sanitized = await sanitizeContent(writing.content);
 *         const payload = { ...writing, content: sanitized };
 *         // ... save to API ...
 *       }
 *       ```
 *
 * B. Update Image Upload Dialog Component
 *
 *    1. Import prepareImageUpload
 *       ```
 *       import { prepareImageUpload, uploadImage } from '../../lib/mediaUploader';
 *       ```
 *
 *    2. Replace handleFileSelect logic
 *       OLD: Manual canvas compression
 *       NEW:
 *       ```
 *       const handleFileSelect = async (file?: File) => {
 *         if (!file) return;
 *         setError('');
 *         setIsLoading(true);
 *         try {
 *           await prepareImageUpload(file, (base64, altText) => {
 *             setPreview(base64);
 *             setAltText(altText);
 *           }, {
 *             onError: setError,
 *           });
 *         } finally {
 *           setIsLoading(false);
 *         }
 *       }
 *       ```
 *
 *    3. Update handleInsert untuk upload langsung saat insert
 *       ```
 *       const handleInsert = async () => {
 *         if (!preview) return;
 *         setIsLoading(true);
 *         try {
 *           const blob = dataURLtoBlob(preview);
 *           const file = new File([blob], `${altText}.jpg`);
 *           const imageUrl = await uploadImage(file, {
 *             onError: setError,
 *           });
 *           const imageMarkdown = `\n![${altText}](${imageUrl})\n`;
 *           onInsert(imageMarkdown);
 *         } finally {
 *           setIsLoading(false);
 *           resetForm();
 *         }
 *       }
 *       ```
 *
 * ============================================================================
 * STEP 2: MINIMAL REQUIRED CHANGES PER SECTION
 * ============================================================================
 *
 * Setiap section hanya butuh 3 perubahan sederhana:
 *
 * ✓ WRITINGS Section:
 *   File: src/pages/admin/WritingEditor.tsx
 *   - Line 1: Add import from utils/media
 *   - Line 48-57: Replace word/char count dengan countWords() & countChars()
 *   - useEffect hook: Add attachUploadHandler() call
 *   - handleSave: Wrap content dengan sanitizeContent() sebelum POST/PUT
 *
 * ✓ PROJECTS Section:
 *   File: src/pages/admin/ProjectEditor.tsx
 *   - Sama seperti Writings (tinggal ubah variable names)
 *
 * ✓ BOOKS Section:
 *   File: src/pages/admin/BookEditor.tsx
 *   - Sama seperti Writings (tinggal ubah variable names)
 *
 * ✓ ABOUT Page:
 *   File: src/pages/admin/AboutManager.tsx (atau AboutEditor jika ada)
 *   - Sama seperti Writings
 *
 * ✓ HOME Page:
 *   File: src/pages/admin/HomeManager.tsx (atau HomeEditor jika ada)
 *   - Sama seperti Writings
 *
 * ============================================================================
 * STEP 3: BACKEND SETUP
 * ============================================================================
 *
 * 1. Install multer dependency:
 *    cd cms
 *    npm install multer
 *
 * 2. Create public/uploads directory:
 *    mkdir -p cms/public/uploads
 *
 * 3. Update cms/.env dengan PUBLIC_URL (opsional):
 *    PUBLIC_URL=http://localhost:5000
 *
 * 4. Semua sudah siap! Backend akan:
 *    - Accept POST /api/media/upload
 *    - Save file ke cms/public/uploads/
 *    - Return imageUrl sebagai http://localhost:5000/uploads/{filename}
 *    - Track metadata di MongoDB collection 'media'
 *
 * ============================================================================
 * STEP 4: TESTING
 * ============================================================================
 *
 * 1. Start backend:
 *    cd cms && npm start
 *
 * 2. Start frontend:
 *    npm run dev
 *
 * 3. Test di Writing Editor:
 *    - Paste/drag-drop image ke textarea
 *    - Upload dialog -> select image -> click Insert
 *    - Verify image URL muncul di content (bukan base64)
 *    - Save & check database - content punya URL bukan base64
 *
 * 4. Test word/char count:
 *    - Upload image
 *    - Verify word/char count tidak berubah (base64 sudah di-strip)
 *
 * ============================================================================
 * COMPLETE EXAMPLE: WritingEditor Integration
 * ============================================================================
 *
 * File: src/pages/admin/WritingEditor.tsx
 *
 * Perubahan yang diperlukan:
 */

// ============================================================================
// CONTOH IMPLEMENTASI LENGKAP
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { WritingToolbar } from '../../components/WritingToolbar';
import { WritingSidebar } from '../../components/WritingSidebar';
import { ImageUploadDialog } from '../../components/ImageUploadDialog';
import { ArrowLeft, Check, Clock, AlertCircle } from 'lucide-react';
// 👇 TAMBAHAN: Import utilities
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
  const [uploadError, setUploadError] = useState<string>('');

  // 👇 SIMPLIFIKASI: Ganti logic manual dengan utility functions
  const wordCount = countWords(writing.content);
  const characterCount = countChars(writing.content);

  // Load writing jika edit existing
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

  // 👇 TAMBAHAN: Attach upload handler ke textarea
  useEffect(() => {
    if (!textareaRef.current) return;

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

      setTimeout(() => {
        textarea.focus();
        const cursorPos = start + imageMarkdown.length;
        textarea.selectionStart = cursorPos;
        textarea.selectionEnd = cursorPos;
      });
    };

    // Attach handlers untuk drag-drop, paste, etc
    attachUploadHandler(textareaRef.current, insertImageMarkdown, {
      onError: (error) => {
        console.error('Upload error:', error);
        setUploadError(error);
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

  // 👇 TAMBAHAN: Updated handleSave dengan sanitizeContent
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
      // 👇 KUNCI: Sanitize content untuk replace base64 dengan URLs
      const sanitized = await sanitizeContent(writing.content, {
        onProgress: (progress) => console.log(`Upload progress: ${progress}%`),
        onError: (error) => console.error('Sanitize error:', error),
      });

      const payload: Writing = {
        ...writing,
        content: sanitized,
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
            {/* 👇 TAMBAHAN: Upload Error Display */}
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

            <button
              onClick={handleSave}
              disabled={isSaving || !writing.title || !writing.id}
              className="px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl">
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

          {/* Sidebar */}
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
        onInsert={(markdown) => {
          const textarea = textareaRef.current;
          if (!textarea) {
            setWriting(prev => ({ ...prev, content: `${prev.content}\n${markdown}\n` }));
            return;
          }
          const start = textarea.selectionStart;
          const newText = `${textarea.value.substring(0, start)}${markdown}${textarea.value.substring(start)}`;
          setWriting(prev => ({ ...prev, content: newText }));
        }}
      />
    </div>
  );
}

// ============================================================================
// IMPLEMENTASI DI SECTION LAIN (WRITINGS ✓, PROJECTS, BOOKS, ABOUT, HOME)
// ============================================================================
//
// Untuk ProjectEditor, BookEditor, AboutManager, HomeManager:
// Cukup duplikat pattern di atas dengan:
// 1. Ganti "writing" dengan "project"/"book"/dll
// 2. Ganti /api/writings dengan /api/projects, /api/books, dll
// 3. Sisanya IDENTIK (utils sudah universal, handler sudah reusable)
//
// ============================================================================
