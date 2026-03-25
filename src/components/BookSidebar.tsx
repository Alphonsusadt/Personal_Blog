import { X, Star } from 'lucide-react';
import React from 'react';

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
      <SidebarCard title="Status" cardKey="status">
        <div className="space-y-3">
          <select
            value={book.status || 'draft'}
            onChange={e => onUpdate({ ...book, status: e.target.value as 'draft' | 'published' })}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <div className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-[#334155]">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${book.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span className="text-xs text-[#94A3B8]">
              {book.status === 'published' ? 'Published' : 'Draft'}
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

      {/* ID/Slug Card */}
      <SidebarCard title="ID/Slug" cardKey="slug">
        <input
          type="text"
          value={book.id}
          onChange={e => onUpdate({ ...book, id: e.target.value })}
          placeholder="unique-slug"
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
        />
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
