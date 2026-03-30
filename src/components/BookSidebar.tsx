import { X, Star, RefreshCw } from 'lucide-react';
import { ImageGallery } from './ImageGallery';
import React, { useState, useEffect } from 'react';
import { generateSlug, isValidSlug } from '../utils/slugify';

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

interface BookSidebarProps {
  book: Book;
  onUpdate: (book: Book) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
}

const categories = ['technical', 'biography', 'spiritual', 'philosophy'];

export function BookSidebar({ book, onUpdate, onSave, isSaving }: BookSidebarProps) {
  const [takeawayInput, setTakeawayInput] = React.useState('');
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Auto-generate slug from title when title changes (only if slug wasn't manually edited)
  useEffect(() => {
    if (book.title && (!book.id || !slugManuallyEdited)) {
      const autoSlug = generateSlug(book.title);
      if (autoSlug && autoSlug !== book.id) {
        onUpdate({ ...book, id: autoSlug });
      }
    }
  }, [book.title, slugManuallyEdited, book.id, onUpdate]);

  const handleSlugChange = (newSlug: string) => {
    setSlugManuallyEdited(true);
    onUpdate({ ...book, id: newSlug });
  };

  const handleRegenerateSlug = () => {
    const autoSlug = generateSlug(book.title);
    if (autoSlug) {
      onUpdate({ ...book, id: autoSlug });
      setSlugManuallyEdited(false);
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

  const addTakeaway = () => {
    if (!takeawayInput.trim()) return;
    const newTakeaways = [...book.takeaways, takeawayInput.trim()];
    onUpdate({ ...book, takeaways: newTakeaways });
    setTakeawayInput('');
  };

  const removeTakeaway = (index: number) => {
    onUpdate({ ...book, takeaways: book.takeaways.filter((_, i) => i !== index) });
  };

  const SidebarCard = ({ title, cardKey, children }: { title: string; cardKey: string; children: React.ReactNode }) => (
    <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
      <h3 className="font-medium text-sm text-[#F8FAFC] mb-3 cursor-pointer flex items-center justify-between"
          onClick={() => toggleCard(cardKey)}>
        {title}
        <span className="text-[#94A3B8]">{collapsed[cardKey] ? '▶' : '▼'}</span>
      </h3>
      {!collapsed[cardKey] && <div>{children}</div>}
    </div>
  );

  return (
    <aside className="space-y-4">
      {/* Status Card */}
      <SidebarCard title="Status & Scheduling" cardKey="status">
        <div className="space-y-3">
          <select
            value={book.status || 'draft'}
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
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          >
            <option value="draft">📝 Draft</option>
            <option value="published">✅ Published</option>
            <option value="scheduled">⏰ Scheduled</option>
          </select>

          {/* Datetime picker untuk scheduled */}
          {book.status === 'scheduled' && (
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Publish At</label>
              <input
                type="datetime-local"
                value={toDateTimeLocal(book.publishAt)}
                onChange={e => onUpdate({ ...book, publishAt: fromDateTimeLocal(e.target.value) })}
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
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

      {/* Category Card */}
      <SidebarCard title="Category" cardKey="category">
        <select
          value={book.category}
          onChange={e => onUpdate({ ...book, category: e.target.value })}
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </SidebarCard>

      {/* Rating Card */}
      <SidebarCard title="Rating" cardKey="rating">
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
      <SidebarCard title="Takeaways" cardKey="takeaways">
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
          <div className="flex gap-2">
            <input
              value={takeawayInput}
              onChange={e => setTakeawayInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTakeaway())}
              placeholder="Add takeaway..."
              className="flex-1 bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <button
              onClick={addTakeaway}
              className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg text-sm hover:bg-[#475569] transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </SidebarCard>

      {/* Image Gallery Card */}
      <SidebarCard title="Images" cardKey="images">
        <ImageGallery
          content={book.review}
          onRemoveImage={(markdown) => {
            const updatedReview = book.review.replace(markdown, '');
            onUpdate({ ...book, review: updatedReview });
          }}
        />
      </SidebarCard>

      {/* ID/Slug Card */}
      <SidebarCard title="ID/Slug" cardKey="slug">
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
              disabled={!book.title}
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
      <SidebarCard title="Cover URL" cardKey="cover">
        <input
          type="text"
          value={book.cover}
          onChange={e => onUpdate({ ...book, cover: e.target.value })}
          placeholder="https://..."
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
        />
      </SidebarCard>

      {/* SEO Card */}
      <SidebarCard title="SEO" cardKey="seo">
        <div className="space-y-3">
          {/* Meta Title */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Meta Title</label>
            <input
              type="text"
              value={book.metaTitle || `${book.title} by ${book.author}`}
              onChange={e => onUpdate({ ...book, metaTitle: e.target.value })}
              placeholder="Auto-filled from title and author"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <p className="text-xs text-[#64748B] mt-1">{(book.metaTitle || `${book.title} by ${book.author}`).length}/60 chars</p>
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Meta Description</label>
            <textarea
              value={book.metaDescription || `Book review: ${book.title} by ${book.author}. Rating: ${book.rating}/5 stars.`}
              onChange={e => onUpdate({ ...book, metaDescription: e.target.value })}
              placeholder="Auto-generated from book info"
              rows={3}
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] resize-none"
            />
            <p className="text-xs text-[#64748B] mt-1">{(book.metaDescription || `Book review: ${book.title} by ${book.author}. Rating: ${book.rating}/5 stars.`).length}/160 chars</p>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Keywords</label>
            <input
              type="text"
              value={book.keywords || `${book.title}, ${book.author}, book review, ${book.category}`}
              onChange={e => onUpdate({ ...book, keywords: e.target.value })}
              placeholder="Auto-generated from book details"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>

          {/* OG Image */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">OG Image URL</label>
            <input
              type="text"
              value={book.ogImage || book.cover}
              onChange={e => onUpdate({ ...book, ogImage: e.target.value })}
              placeholder="Uses book cover by default"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <p className="text-xs text-[#64748B] mt-1">For social media sharing (defaults to book cover)</p>
          </div>
        </div>
      </SidebarCard>

      {/* Update Button */}
      <button
        onClick={onSave}
        disabled={isSaving}
        className="w-full bg-[#1E40AF] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? 'Saving...' : 'Update Book'}
      </button>
    </aside>
  );
}
