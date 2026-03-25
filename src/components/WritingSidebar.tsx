import { X } from 'lucide-react';
import React from 'react';
import { ImageGallery } from './ImageGallery';

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

interface WritingSidebarProps {
  writing: Writing;
  onUpdate: (writing: Writing) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  wordCount?: number;
  characterCount?: number;
  onRemoveImage?: (markdown: string) => void;
}

const categories = ['reflections', 'stories', 'fiction'];

export function WritingSidebar({ writing, onUpdate, onSave, isSaving, wordCount = 0, characterCount = 0, onRemoveImage }: WritingSidebarProps) {
  const [tagInput, setTagInput] = React.useState('');
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

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

  const addTag = () => {
    if (!tagInput.trim()) return;
    const newTags = [...writing.tags, tagInput.trim()];
    onUpdate({ ...writing, tags: newTags });
    setTagInput('');
  };

  const removeTag = (index: number) => {
    onUpdate({ ...writing, tags: writing.tags.filter((_, i) => i !== index) });
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
      <SidebarCard title="Status" cardKey="status">
        <div className="space-y-3">
          <select
            value={writing.status || 'draft'}
            onChange={e => {
              const nextStatus = e.target.value as 'draft' | 'published' | 'scheduled';
              onUpdate({
                ...writing,
                status: nextStatus,
                publishAt: nextStatus === 'scheduled' ? writing.publishAt || new Date().toISOString() : '',
              });
            }}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
          {writing.status === 'scheduled' && (
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Publish At</label>
              <input
                type="datetime-local"
                value={toDateTimeLocal(writing.publishAt)}
                onChange={e => onUpdate({ ...writing, publishAt: fromDateTimeLocal(e.target.value) })}
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
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
      <SidebarCard title="Writing Stats" cardKey="stats">
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
          content={writing.content}
          onRemoveImage={(markdown) => {
            const newContent = writing.content.replace(markdown, '');
            onUpdate({ ...writing, content: newContent });
            onRemoveImage?.(markdown);
          }}
        />
      )}

      {/* Category Card */}
      <SidebarCard title="Category" cardKey="category">
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
      <SidebarCard title="Tags" cardKey="tags">
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
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag..."
              className="flex-1 bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <button
              onClick={addTag}
              className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg text-sm hover:bg-[#475569] transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </SidebarCard>

      {/* Excerpt Card */}
      <SidebarCard title="Excerpt" cardKey="excerpt">
        <textarea
          value={writing.excerpt}
          onChange={e => onUpdate({ ...writing, excerpt: e.target.value })}
          rows={3}
          placeholder="Brief summary of your writing..."
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] resize-none"
        />
      </SidebarCard>

      {/* Date & Read Time */}
      <SidebarCard title="Date & Read Time" cardKey="dateTime">
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
            <input
              value={writing.readTime}
              onChange={e => onUpdate({ ...writing, readTime: e.target.value })}
              placeholder="e.g., 5 min"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>
        </div>
      </SidebarCard>

      {/* ID/Slug Card */}
      <SidebarCard title="ID/Slug" cardKey="slug">
        <input
          type="text"
          value={writing.id}
          onChange={e => onUpdate({ ...writing, id: e.target.value })}
          placeholder="unique-slug"
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
        />
        <p className="text-xs text-[#94A3B8] mt-2">URL-friendly identifier (no spaces)</p>
      </SidebarCard>

      {/* Update Button */}
      <button
        onClick={onSave}
        disabled={isSaving}
        className="w-full bg-[#1E40AF] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? 'Saving...' : 'Update Writing'}
      </button>
    </aside>
  );
}