import { X, Star, RefreshCw } from 'lucide-react';
import { ImageGallery } from './ImageGallery';
import React, { useCallback, useRef } from 'react';
import { generateSlug, isValidSlug } from '../utils/slugify';
import { IsolatedInput, IsolatedTextarea, IsolatedTagInput } from './IsolatedInput';
import { useAutoFixLanguage } from '../hooks/useAutoFixLanguage';
import { resolveLocalizedText, setLocalizedText, type LocalizedTextValue } from '../lib/localized';
import { TranslationButtonGroup } from './TranslationButtonGroup';
import { TranslationStatusBadge } from './TranslationStatusBadge';
import { api } from '../lib/api';

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
  // SEO Fields
  metaDescription?: string;
  ogImage?: string;
  keywords?: string;
  metaTitle?: string;
  contentLanguage?: 'en' | 'id' | 'bilingual';
  translationOfId?: string;
  devStatus?: 'planning' | 'ongoing' | 'completed';
}

interface BookSidebarProps {
  book: Book;
  onUpdate: (book: Book) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  wordCount?: number;
  characterCount?: number;
  sectionEnabled?: boolean;
}

interface CategoryItem {
  value: string;
  label: string | { en: string; id: string };
  enabled?: boolean;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { value: 'technical', label: { en: 'Technical', id: 'Teknis' } },
  { value: 'biography', label: { en: 'Biography', id: 'Biografi' } },
  { value: 'spiritual', label: { en: 'Spiritual', id: 'Spiritual' } },
  { value: 'philosophy', label: { en: 'Philosophy', id: 'Filosofi' } },
];

const devStatuses = [
  { value: 'planning', label: 'Planning', color: 'bg-blue-500' },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
];

function SidebarCard({
  title,
  cardKey,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  cardKey: string;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
      <h3
        className="font-medium text-sm text-[#F8FAFC] mb-3 cursor-pointer flex items-center justify-between"
        onClick={() => onToggle(cardKey)}
      >
        {title}
        <span className="text-[#94A3B8]">{collapsed[cardKey] ? '▶' : '▼'}</span>
      </h3>
      {!collapsed[cardKey] && <div>{children}</div>}
    </div>
  );
}

export function BookSidebar({ book, onUpdate, onSave, isSaving, wordCount = 0, characterCount = 0, sectionEnabled = true }: BookSidebarProps) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [translationStatus, setTranslationStatus] = React.useState<any>(null);
  const { language, setLanguage } = useAutoFixLanguage();
  const [categoriesList, setCategoriesList] = React.useState<CategoryItem[]>(DEFAULT_CATEGORIES);

  const currentDevStatus = devStatuses.find(s => s.value === book.devStatus) || devStatuses[0];

  React.useEffect(() => {
    let active = true;
    api.get('/api/categories?section=books')
      .then((data: any) => {
        if (!active) return;
        if (Array.isArray(data)) {
          const serverCats = data.map((item: any) => ({
            value: item.value,
            label: item.label,
            enabled: item.enabled !== false,
          }));

          const mergedMap = new Map<string, CategoryItem>();
          DEFAULT_CATEGORIES.forEach(c => mergedMap.set(c.value, c));
          
          serverCats.forEach(c => {
            if (c.enabled || c.value === book.category) {
              mergedMap.set(c.value, c);
            }
          });

          if (book.category && !mergedMap.has(book.category)) {
            const formattedLabel = book.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            mergedMap.set(book.category, {
              value: book.category,
              label: { en: formattedLabel, id: formattedLabel }
            });
          }

          setCategoriesList(Array.from(mergedMap.values()));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch categories:', err);
      });
    return () => { active = false; };
  }, [book.category]);

  const getCategoryLabelText = (label: string | { en: string; id: string }) => {
    if (typeof label === 'string') return label;
    if (language === 'id') return label.id || label.en;
    return label.en || label.id;
  };

  void onSave;
  void isSaving;
  
  // Use ref to always have latest book without causing re-renders
  const bookRef = useRef(book);
  bookRef.current = book;

  // Stable callback for adding takeaways - use ref
  const handleAddTakeaway = useCallback((takeaway: string) => {
    onUpdate({ ...bookRef.current, takeaways: [...bookRef.current.takeaways, takeaway] });
  }, [onUpdate]);

  const handleMetaTitleCommit = useCallback((value: string) => {
    onUpdate({ ...bookRef.current, metaTitle: value });
  }, [onUpdate]);

  const handleMetaDescriptionCommit = useCallback((value: string) => {
    onUpdate({ ...bookRef.current, metaDescription: value });
  }, [onUpdate]);

  const handleKeywordsCommit = useCallback((value: string) => {
    onUpdate({ ...bookRef.current, keywords: value });
  }, [onUpdate]);

  const handleOgImageCommit = useCallback((value: string) => {
    onUpdate({ ...bookRef.current, ogImage: value });
  }, [onUpdate]);

  // Auto-generate slug ONLY when: 1) Creating new item, 2) User clicks regenerate
  // REMOVED auto-generation on title change - causes re-renders and scroll jumps!
  // useEffect(() => {
  //   if (book.title && (!book.id || !slugManuallyEdited)) {
  //     const autoSlug = generateSlug(book.title);
  //     if (autoSlug && autoSlug !== book.id) {
  //       onUpdate({ ...book, id: autoSlug });
  //     }
  //   }
  // }, [book.title, slugManuallyEdited, book.id]);

  const handleSlugChange = (newSlug: string) => {
    onUpdate({ ...book, id: newSlug });
  };

  const handleRegenerateSlug = () => {
    const autoSlug = generateSlug(resolveLocalizedText(book.title, language));
    if (autoSlug) {
      onUpdate({ ...book, id: autoSlug });
    }
  };

  const toDateTimeLocal = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const offset = parsed.getTimezoneOffset() * 60_000;
    return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
  };

  const fromDateTimeLocal = (value: string) => {
    if (!value) return '';
    return new Date(value).toISOString();
  };

  const toggleCard = (cardName: string) => {
    setCollapsed(prev => ({ ...prev, [cardName]: !prev[cardName] }));
  };

  const localizedTitle = resolveLocalizedText(book.title, language);
  const localizedAuthor = resolveLocalizedText(book.author, language);

  const removeTakeaway = (index: number) => {
    onUpdate({ ...book, takeaways: book.takeaways.filter((_, i) => i !== index) });
  };



  return (
    <aside className="space-y-4">
      {/* Editor Language (Replaces Auto Fix Label) */}
      <SidebarCard title="Editor Language / Bahasa Editor" cardKey="autofix" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-2">
          <label className="block text-xs text-[#94A3B8]">Pilih tab bahasa yang sedang diedit:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'id' | 'en')}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          >
            <option value="id">🇮🇩 Indonesia (ID)</option>
            <option value="en">🇬🇧 English (EN)</option>
          </select>
          <p className="text-[11px] text-[#94A3B8]">Mengganti ini akan mengubah isi Title, Author, dan Review di editor sesuai bahasa yang dipilih.</p>
        </div>
      </SidebarCard>

      {/* Content Mode & Translation Link */}
      <SidebarCard title="Content Mode & Linking" cardKey="contentMode" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Mode Konten (Content Language)</label>
            <select
              value={book.contentLanguage || 'bilingual'}
              onChange={e => onUpdate({ ...book, contentLanguage: e.target.value as 'en' | 'id' | 'bilingual' })}
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            >
              <option value="bilingual">Bilingual (Satu post, dua bahasa)</option>
              <option value="id">Hanya Indonesia</option>
              <option value="en">Hanya English</option>
            </select>
            <p className="text-[11px] text-[#94A3B8] mt-1">Pilih 'Hanya Indonesia' jika kamu membuat post terpisah dan ingin dihubungkan secara manual.</p>
          </div>

          {book.contentLanguage !== 'bilingual' && (
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Link to Translation (ID Book)</label>
              <IsolatedInput
                id={book.id + '-translation-of'}
                initialValue={book.translationOfId || ''}
                onCommit={(val) => onUpdate({ ...book, translationOfId: val })}
                placeholder="Masukkan ID buku terjemahannya..."
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
              />
              <p className="text-[11px] text-[#94A3B8] mt-1">Jika ini buku bahasa ID, masukkan ID buku bahasa EN-nya agar terhubung di website.</p>
            </div>
          )}
        </div>
      </SidebarCard>

      {/* Content Stats */}
      <SidebarCard title="Content Stats" cardKey="stats" collapsed={collapsed} onToggle={toggleCard}>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3">
            <p className="text-[11px] text-[#94A3B8]">Words</p>
            <p className="text-lg font-semibold text-[#F8FAFC]">{wordCount}</p>
          </div>
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3">
            <p className="text-[11px] text-[#94A3B8]">Characters</p>
            <p className="text-lg font-semibold text-[#F8FAFC]">{characterCount}</p>
          </div>
        </div>
      </SidebarCard>

      {/* Status Card */}
      <SidebarCard title="Status & Scheduling" cardKey="status" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          <select
            value={book.status || 'draft'}
            disabled={!sectionEnabled}
            onChange={e => {
              const newStatus = e.target.value as 'draft' | 'published' | 'scheduled';
              const updates: Partial<Book> = { status: newStatus };
              if (newStatus === 'scheduled' && !book.publishAt) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                updates.publishAt = tomorrow.toISOString();
              }
              onUpdate({ ...book, ...updates });
            }}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="draft">📝 Draft</option>
            <option value="published">✅ Published</option>
            <option value="scheduled">⏰ Scheduled</option>
          </select>

          {!sectionEnabled ? (
            <p className="text-[11px] text-[#94A3B8]">
              Library section dimatikan di Settings. Publish/Schedule dinonaktifkan (kamu masih bisa simpan).
            </p>
          ) : null}

          {/* Datetime picker untuk scheduled */}
          {book.status === 'scheduled' && (
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Publish At</label>
              <input
                type="datetime-local"
                value={toDateTimeLocal(book.publishAt)}
                disabled={!sectionEnabled}
                onChange={e => onUpdate({ ...book, publishAt: fromDateTimeLocal(e.target.value) })}
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Akan otomatis tampil saat waktunya tiba.
              </p>
            </div>
          )}

          {/* Status indicator */}
          <div className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-[#334155]">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${
              book.status === 'published' ? 'bg-green-500' : 
              book.status === 'scheduled' ? 'bg-blue-500' : 'bg-yellow-500'
            }`}></span>
            <span className="text-xs text-[#94A3B8]">
              {book.status === 'published' ? 'Live - Sudah dipublikasi' : 
               book.status === 'scheduled' ? `Terjadwal - ${book.publishAt ? new Date(book.publishAt).toLocaleString('id-ID') : ''}` : 
               'Draft - Belum dipublikasi'}
            </span>
          </div>
        </div>
      </SidebarCard>

      {/* Development Status Card */}
      <SidebarCard title="Development Status" cardKey="devStatus" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          <select
            value={book.devStatus || 'planning'}
            onChange={e => onUpdate({ ...book, devStatus: e.target.value as 'planning' | 'ongoing' | 'completed' })}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          >
            {devStatuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-[#334155]">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${currentDevStatus.color}`}></span>
            <span className="text-xs text-[#94A3B8]">{currentDevStatus.label}</span>
          </div>
        </div>
      </SidebarCard>

      {/* Category Card */}
      <SidebarCard title="Category" cardKey="category" collapsed={collapsed} onToggle={toggleCard}>
        <select
          value={book.category}
          onChange={e => onUpdate({ ...book, category: e.target.value })}
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
        >
          {categoriesList.map(c => (
            <option key={c.value} value={c.value}>{getCategoryLabelText(c.label)}</option>
          ))}
        </select>
      </SidebarCard>

      {/* Rating Card */}
      <SidebarCard title="Rating" cardKey="rating" collapsed={collapsed} onToggle={toggleCard}>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => onUpdate({ ...book, rating: n })}
              className="transition-colors hover:scale-110"
            >
              <Star className={`w-6 h-6 cursor-pointer ${n <= book.rating ? 'text-amber-400 fill-amber-400' : 'text-[#475569]'}`} />
            </button>
          ))}
        </div>
      </SidebarCard>

      {/* Takeaways Card */}
      <SidebarCard title="Takeaways" cardKey="takeaways" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-2">
          <div className="space-y-2 mb-2">
            {book.takeaways.map((takeaway, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 bg-[#0F172A] text-[#F8FAFC] text-xs px-3 py-2 rounded">{takeaway}</span>
                <button onClick={() => removeTakeaway(i)} className="text-[#94A3B8] hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <IsolatedTagInput
            onAddTag={handleAddTakeaway}
            placeholder="Add takeaway..."
            className="flex-1 bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          />
        </div>
      </SidebarCard>

      {/* Image Gallery Card */}
      <SidebarCard title="Images" cardKey="images" collapsed={collapsed} onToggle={toggleCard}>
        <ImageGallery
          content={resolveLocalizedText(book.review, language)}
          onRemoveImage={(markdown) => {
            const updatedReview = resolveLocalizedText(book.review, language).replace(markdown, '');
            onUpdate({ ...book, review: setLocalizedText(book.review, language, updatedReview) });
          }}
        />
      </SidebarCard>

      {/* ID/Slug Card */}
      <SidebarCard title="ID/Slug" cardKey="slug" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={book.id}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="unique-slug"
              className={`flex-1 bg-[#0F172A] border text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] ${
                book.id && !isValidSlug(book.id) ? 'border-red-500' : 'border-[#334155]'
              }`}
            />
            <button
              type="button"
              onClick={handleRegenerateSlug}
              disabled={!localizedTitle}
              className="p-2 text-[#94A3B8] hover:text-[#60A5FA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Generate from title"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {book.id && !isValidSlug(book.id) && (
            <p className="text-xs text-red-400">Invalid slug format (only lowercase, numbers, and hyphens)</p>
          )}
        </div>
        <p className="text-xs text-[#94A3B8] mt-2">URL-friendly identifier (no spaces)</p>
      </SidebarCard>

      {/* Cover URL Card */}
      <SidebarCard title="Cover URL" cardKey="cover" collapsed={collapsed} onToggle={toggleCard}>
        <input
          type="text"
          value={book.cover}
          onChange={e => onUpdate({ ...book, cover: e.target.value })}
          placeholder="https://..."
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
        />
      </SidebarCard>

      {/* SEO Card */}
      <SidebarCard title="SEO" cardKey="seo" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          {/* Meta Title */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Meta Title</label>
            <IsolatedInput
              id={book.id + '-meta-title'}
              initialValue={book.metaTitle || `${localizedTitle} by ${localizedAuthor}`}
              onCommit={handleMetaTitleCommit}
              placeholder="Auto-filled from title and author"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <p className="text-xs text-[#64748B] mt-1">{(book.metaTitle || `${localizedTitle} by ${localizedAuthor}`).length}/60 chars</p>
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Meta Description</label>
            <IsolatedTextarea
              id={book.id + '-meta-desc'}
              initialValue={book.metaDescription || `Book review: ${localizedTitle} by ${localizedAuthor}. Rating: ${book.rating}/5 stars.`}
              onCommit={handleMetaDescriptionCommit}
              placeholder="Auto-generated from book info"
              rows={3}
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] resize-none"
            />
            <p className="text-xs text-[#64748B] mt-1">{(book.metaDescription || `Book review: ${localizedTitle} by ${localizedAuthor}. Rating: ${book.rating}/5 stars.`).length}/160 chars</p>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Keywords</label>
            <IsolatedInput
              id={book.id + '-keywords'}
              initialValue={book.keywords || `${book.title}, ${book.author}, book review, ${book.category}`}
              onCommit={handleKeywordsCommit}
              placeholder="Auto-generated from book details"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>

          {/* OG Image */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">OG Image URL</label>
            <IsolatedInput
              id={book.id + '-og-image'}
              initialValue={book.ogImage || book.cover}
              onCommit={handleOgImageCommit}
              placeholder="Uses book cover by default"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <p className="text-xs text-[#64748B] mt-1">For social media sharing (defaults to book cover)</p>
          </div>
        </div>
      </SidebarCard>

      {/* Translation Card */}
      <SidebarCard title="Translation" cardKey="translation" collapsed={collapsed} onToggle={() => setCollapsed(prev => ({ ...prev, translation: !prev.translation }))}>
        <div className="space-y-3">
          <TranslationButtonGroup
            postId={book._id}
            contentType="book"
            currentLanguage={language}
            onTranslationStart={() => {
              // Optional: show loading state
            }}
            onTranslationComplete={(result: any) => {
              setTranslationStatus({
                status: 'completed',
                method: result.method,
                language: result.targetLanguage || 'en',
              });

              // Merge translated data into the existing book object so UI updates instantly
              const lang = result.targetLanguage || 'en';
              const updatedBook = { ...book };

              // Helper to safely format LocalizedText
              const applyTranslation = (current: any, newText: string) => {
                if (typeof current === 'string') {
                  try {
                    const parsed = JSON.parse(current);
                    return { ...parsed, [lang]: newText };
                  } catch {
                    const srcLang = lang === 'en' ? 'id' : 'en';
                    return { [srcLang]: current, [lang]: newText };
                  }
                }
                if (current && typeof current === 'object') {
                  return { ...current, [lang]: newText };
                }
                return { [lang]: newText };
              };

              const translations = result.translations || {};
              if (result.title) translations.title = result.title;
              if (result.content) translations.review = result.content;

              for (const [field, translatedText] of Object.entries(translations)) {
                if (typeof translatedText === 'string') {
                  if (field === 'metaTitle' || field === 'metaDescription' || field === 'keywords') {
                    (updatedBook as any)[field] = translatedText;
                  } else {
                    (updatedBook as any)[field] = applyTranslation((book as any)[field], translatedText);
                  }
                }
              }

              onUpdate(updatedBook);
            }}
            onError={(_error: string) => {
              setTranslationStatus({
                status: 'failed',
                method: null,
                language: null,
              });
            }}
          />

          {translationStatus && (
            <div className="mt-3">
              <TranslationStatusBadge
                status={translationStatus.status}
                method={translationStatus.method}
                language={translationStatus.language}
                onRollback={() => {
                  setTranslationStatus(null);
                }}
              />
            </div>
          )}
        </div>
      </SidebarCard>

    </aside>
  );
}
