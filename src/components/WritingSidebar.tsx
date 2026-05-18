import { X, RefreshCw } from 'lucide-react';
import React, { useCallback, useRef } from 'react';
import { ImageGallery } from './ImageGallery';
import { generateSlug, isValidSlug } from '../utils/slugify';
import { IsolatedInput, IsolatedTextarea, IsolatedTagInput } from './IsolatedInput';
import { useAutoFixLanguage } from '../hooks/useAutoFixLanguage';
import { resolveLocalizedText, setLocalizedText, type LocalizedTextValue } from '../lib/localized';
import { TranslationButtonGroup } from './TranslationButtonGroup';
import { TranslationStatusBadge } from './TranslationStatusBadge';

interface Writing {
  _id?: string;
  id: string;
  title: LocalizedTextValue;
  excerpt: LocalizedTextValue;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  content: LocalizedTextValue;
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
}

interface WritingSidebarProps {
  writing: Writing;
  onUpdate: (writing: Writing) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  wordCount?: number;
  characterCount?: number;
  sectionEnabled?: boolean;
}

const categories = ['reflections', 'stories', 'fiction'];

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

export function WritingSidebar({ writing, onUpdate, onSave, isSaving, wordCount = 0, characterCount = 0, sectionEnabled = true }: WritingSidebarProps) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [translationStatus, setTranslationStatus] = React.useState<any>(null);
  const { language, setLanguage } = useAutoFixLanguage();
  void onSave;
  void isSaving;
  
  // Use ref to always have latest writing without causing re-renders
  const writingRef = useRef(writing);
  writingRef.current = writing;

  // Stable callbacks - use ref to get latest writing
  const handleExcerptCommit = useCallback((value: string) => {
    onUpdate({ ...writingRef.current, excerpt: setLocalizedText(writingRef.current.excerpt, language, value) });
  }, [language, onUpdate]);

  const handleReadTimeCommit = useCallback((value: string) => {
    onUpdate({ ...writingRef.current, readTime: value });
  }, [onUpdate]);

  const handleAddTag = useCallback((tag: string) => {
    onUpdate({ ...writingRef.current, tags: [...writingRef.current.tags, tag] });
  }, [onUpdate]);

  const handleMetaTitleCommit = useCallback((value: string) => {
    onUpdate({ ...writingRef.current, metaTitle: value });
  }, [onUpdate]);

  const handleMetaDescriptionCommit = useCallback((value: string) => {
    onUpdate({ ...writingRef.current, metaDescription: value });
  }, [onUpdate]);

  const handleKeywordsCommit = useCallback((value: string) => {
    onUpdate({ ...writingRef.current, keywords: value });
  }, [onUpdate]);

  const handleOgImageCommit = useCallback((value: string) => {
    onUpdate({ ...writingRef.current, ogImage: value });
  }, [onUpdate]);

  // Auto-generate slug ONLY when: 1) Creating new item, 2) User clicks regenerate
  // REMOVED auto-generation on title change - causes re-renders and scroll jumps!
  // useEffect(() => {
  //   if (writing.title && (!writing.id || !slugManuallyEdited)) {
  //     const autoSlug = generateSlug(writing.title);
  //     if (autoSlug && autoSlug !== writing.id) {
  //       onUpdate({ ...writing, id: autoSlug });
  //     }
  //   }
  // }, [writing.title, slugManuallyEdited, writing.id]);

  const handleSlugChange = (newSlug: string) => {
    onUpdate({ ...writing, id: newSlug });
  };

  const handleRegenerateSlug = () => {
    const autoSlug = generateSlug(resolveLocalizedText(writing.title, language));
    if (autoSlug) {
      onUpdate({ ...writing, id: autoSlug });
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

  const localizedTitle = resolveLocalizedText(writing.title, language);
  const localizedExcerpt = resolveLocalizedText(writing.excerpt, language);

  const removeTag = (index: number) => {
    onUpdate({ ...writing, tags: writing.tags.filter((_, i) => i !== index) });
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
          <p className="text-[11px] text-[#94A3B8]">Mengganti ini akan mengubah isi Title, Excerpt, dan Content di editor sesuai bahasa yang dipilih.</p>
        </div>
      </SidebarCard>

      {/* Content Mode & Translation Link */}
      <SidebarCard title="Content Mode & Linking" cardKey="contentMode" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Mode Konten (Content Language)</label>
            <select
              value={writing.contentLanguage || 'bilingual'}
              onChange={e => onUpdate({ ...writing, contentLanguage: e.target.value as 'en' | 'id' | 'bilingual' })}
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            >
              <option value="bilingual">Bilingual (Satu post, dua bahasa)</option>
              <option value="id">Hanya Indonesia</option>
              <option value="en">Hanya English</option>
            </select>
            <p className="text-[11px] text-[#94A3B8] mt-1">Pilih 'Hanya Indonesia' jika kamu membuat post terpisah dan ingin dihubungkan secara manual.</p>
          </div>

          {writing.contentLanguage !== 'bilingual' && (
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Link to Translation (ID Writing)</label>
              <IsolatedInput
                id={writing.id + '-translation-of'}
                initialValue={writing.translationOfId || ''}
                onCommit={(val) => onUpdate({ ...writing, translationOfId: val })}
                placeholder="Masukkan ID writing terjemahannya..."
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
              />
              <p className="text-[11px] text-[#94A3B8] mt-1">Jika ini post bahasa ID, masukkan ID post bahasa EN-nya agar terhubung di website.</p>
            </div>
          )}
        </div>
      </SidebarCard>

      {/* Status Card */}
      <SidebarCard title="Status" cardKey="status" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          <select
            value={writing.status || 'draft'}
            disabled={!sectionEnabled}
            onChange={e => {
              const nextStatus = e.target.value as 'draft' | 'published' | 'scheduled';
              onUpdate({
                ...writing,
                status: nextStatus,
                publishAt: nextStatus === 'scheduled' ? writing.publishAt || new Date().toISOString() : '',
              });
            }}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>

          {!sectionEnabled ? (
            <p className="text-[11px] text-[#94A3B8]">
              Writings section dimatikan di Settings. Publish/Schedule dinonaktifkan (kamu masih bisa simpan).
            </p>
          ) : null}
          {writing.status === 'scheduled' && (
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Publish At</label>
              <input
                type="datetime-local"
                value={toDateTimeLocal(writing.publishAt)}
                disabled={!sectionEnabled}
                onChange={e => onUpdate({ ...writing, publishAt: fromDateTimeLocal(e.target.value) })}
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-[#94A3B8] mt-1">Akan otomatis tampil saat waktunya tiba.</p>
            </div>
          )}
          <div className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-[#334155]">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${writing.status === 'published' ? 'bg-green-500' : writing.status === 'scheduled' ? 'bg-blue-500' : 'bg-yellow-500'}`}></span>
            <span className="text-xs text-[#94A3B8]">
              {writing.status === 'published'
                ? 'Sudah dipublikasi'
                : writing.status === 'scheduled'
                  ? 'Terjadwal untuk publish'
                  : 'Masih draft'}
            </span>
          </div>
        </div>
      </SidebarCard>

      {/* Writing Stats */}
      <SidebarCard title="Writing Stats" cardKey="stats" collapsed={collapsed} onToggle={toggleCard}>
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

      {/* Image Gallery */}
      {writing.content && (
        <ImageGallery
          content={resolveLocalizedText(writing.content, language)}
          onRemoveImage={(markdown) => {
            const newContent = resolveLocalizedText(writing.content, language).replace(markdown, '');
            onUpdate({ ...writing, content: setLocalizedText(writing.content, language, newContent) });
          }}
        />
      )}

      {/* Category Card */}
      <SidebarCard title="Category" cardKey="category" collapsed={collapsed} onToggle={toggleCard}>
        <select
          value={writing.category}
          onChange={e => onUpdate({ ...writing, category: e.target.value })}
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </SidebarCard>

      {/* Tags Card */}
      <SidebarCard title="Tags" cardKey="tags" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {writing.tags.map((tag, i) => (
              <span key={i} className="flex items-center gap-1 bg-[#0F172A] text-[#60A5FA] text-xs px-2 py-1 rounded">
                {tag}
                <button onClick={() => removeTag(i)} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <IsolatedTagInput
            onAddTag={handleAddTag}
            placeholder="Add tag..."
            className="flex-1 bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          />
        </div>
      </SidebarCard>

      {/* Excerpt Card */}
      <SidebarCard title="Excerpt" cardKey="excerpt" collapsed={collapsed} onToggle={toggleCard}>
        <IsolatedTextarea
          id={writing.id}
          initialValue={localizedExcerpt}
          onCommit={handleExcerptCommit}
          rows={3}
          placeholder="Brief summary of your writing..."
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] resize-none"
        />
      </SidebarCard>

      {/* Date & Read Time */}
      <SidebarCard title="Date & Read Time" cardKey="dateTime" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Published Date</label>
            <input
              type="date"
              value={writing.date}
              onChange={e => onUpdate({ ...writing, date: e.target.value })}
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Read Time</label>
            <IsolatedInput
              id={writing.id}
              initialValue={writing.readTime}
              onCommit={handleReadTimeCommit}
              placeholder="e.g., 5 min"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>
        </div>
      </SidebarCard>

      {/* ID/Slug Card */}
      <SidebarCard title="ID/Slug" cardKey="slug" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={writing.id}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="unique-slug"
              className={`flex-1 bg-[#0F172A] border text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] ${
                writing.id && !isValidSlug(writing.id) ? 'border-red-500' : 'border-[#334155]'
              }`}
            />
            <button
              type="button"
              onClick={handleRegenerateSlug}
              disabled={!writing.title}
              className="p-2 text-[#94A3B8] hover:text-[#60A5FA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Generate from title"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {writing.id && !isValidSlug(writing.id) && (
            <p className="text-xs text-red-400">Invalid slug format (only lowercase, numbers, and hyphens)</p>
          )}
        </div>
        <p className="text-xs text-[#94A3B8] mt-2">URL-friendly identifier (no spaces)</p>
      </SidebarCard>

      {/* SEO Card */}
      <SidebarCard title="SEO" cardKey="seo" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          {/* Meta Title */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Meta Title</label>
            <IsolatedInput
              id={writing.id + '-meta-title'}
              initialValue={writing.metaTitle || localizedTitle}
              onCommit={handleMetaTitleCommit}
              placeholder="Auto-filled from title"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <p className="text-xs text-[#64748B] mt-1">{(writing.metaTitle || localizedTitle).length}/60 chars</p>
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Meta Description</label>
            <IsolatedTextarea
              id={writing.id + '-meta-desc'}
              initialValue={writing.metaDescription || localizedExcerpt}
              onCommit={handleMetaDescriptionCommit}
              placeholder="Auto-filled from excerpt"
              rows={3}
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] resize-none"
            />
            <p className="text-xs text-[#64748B] mt-1">{(writing.metaDescription || localizedExcerpt).length}/160 chars</p>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Keywords</label>
            <IsolatedInput
              id={writing.id + '-keywords'}
              initialValue={writing.keywords || writing.tags.join(', ')}
              onCommit={handleKeywordsCommit}
              placeholder="Auto-filled from tags"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>

          {/* OG Image */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">OG Image URL</label>
            <IsolatedInput
              id={writing.id + '-og-image'}
              initialValue={writing.ogImage || ''}
              onCommit={handleOgImageCommit}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <p className="text-xs text-[#64748B] mt-1">For social media sharing (1200x630px recommended)</p>
          </div>
        </div>
      </SidebarCard>

      {/* Translation Card */}
      <SidebarCard title="Translation" cardKey="translation" collapsed={collapsed} onToggle={() => setCollapsed(prev => ({ ...prev, translation: !prev.translation }))}>
        <div className="space-y-3">
          <TranslationButtonGroup
            postId={writing._id}
            contentType="writing"
            onTranslationStart={() => {
              // Optional: show loading state
            }}
            onTranslationComplete={(result: any) => {
              setTranslationStatus({
                status: 'completed',
                method: result.method,
                language: result.targetLanguage || 'en',
              });
              
              // Merge translated data into the existing writing object so UI updates instantly
              const lang = result.targetLanguage || 'en';
              const updatedWriting = { ...writing };
              
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
              if (result.content) translations.content = result.content;

              for (const [field, translatedText] of Object.entries(translations)) {
                if (typeof translatedText === 'string') {
                  if (field === 'metaTitle' || field === 'metaDescription' || field === 'keywords') {
                    (updatedWriting as any)[field] = translatedText;
                  } else {
                    (updatedWriting as any)[field] = applyTranslation((writing as any)[field], translatedText);
                  }
                }
              }
              
              onUpdate(updatedWriting);
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