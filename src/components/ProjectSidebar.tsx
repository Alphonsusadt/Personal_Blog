import { X } from 'lucide-react';
import React from 'react';

interface Project {
  _id?: string;
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  content: string;
  status?: 'draft' | 'published';
}

interface ProjectSidebarProps {
  project: Project;
  onUpdate: (project: Project) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
}

const categories = ['signal-processing', 'control', 'data-analysis'];

export function ProjectSidebar({ project, onUpdate, onSave, isSaving }: ProjectSidebarProps) {
  const [tagInput, setTagInput] = React.useState('');
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const toggleCard = (cardName: string) => {
    setCollapsed(prev => ({ ...prev, [cardName]: !prev[cardName] }));
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const newTags = [...project.tags, tagInput.trim()];
    onUpdate({ ...project, tags: newTags });
    setTagInput('');
  };

  const removeTag = (index: number) => {
    onUpdate({ ...project, tags: project.tags.filter((_, i) => i !== index) });
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
            value={project.status || 'draft'}
            onChange={e => onUpdate({ ...project, status: e.target.value as 'draft' | 'published' })}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <div className="flex items-center gap-2 p-2 bg-[#0F172A] rounded-lg border border-[#334155]">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${project.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span className="text-xs text-[#94A3B8]">
              {project.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
      </SidebarCard>

      {/* Category Card */}
      <SidebarCard title="Category" cardKey="category">
        <select
          value={project.category}
          onChange={e => onUpdate({ ...project, category: e.target.value })}
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c.replace('-', ' ').toUpperCase()}</option>
          ))}
        </select>
      </SidebarCard>

      {/* Tags Card */}
      <SidebarCard title="Tags" cardKey="tags">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {project.tags.map((tag, i) => (
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

      {/* ID/Slug Card */}
      <SidebarCard title="ID/Slug" cardKey="slug">
        <input
          type="text"
          value={project.id}
          onChange={e => onUpdate({ ...project, id: e.target.value })}
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
        {isSaving ? 'Saving...' : 'Update Project'}
      </button>
    </aside>
  );
}
