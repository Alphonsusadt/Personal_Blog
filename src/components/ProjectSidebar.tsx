import { X, Github, FileText, ExternalLink } from 'lucide-react';
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
  devStatus?: 'planning' | 'ongoing' | 'completed';
  date?: string;
  githubUrl?: string;
  paperUrl?: string;
  demoUrl?: string;
}

interface ProjectSidebarProps {
  project: Project;
  onUpdate: (project: Project) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
}

const categories = ['signal-processing', 'control', 'data-analysis'];
const devStatuses = [
  { value: 'planning', label: 'Planning', color: 'bg-blue-500' },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-yellow-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
];

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

  const currentDevStatus = devStatuses.find(s => s.value === project.devStatus) || devStatuses[0];

  return (
    <aside className="space-y-4">
      {/* Publication Status Card */}
      <SidebarCard title="Publication Status" cardKey="status">
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

      {/* Development Status Card */}
      <SidebarCard title="Development Status" cardKey="devStatus">
        <div className="space-y-3">
          <select
            value={project.devStatus || 'planning'}
            onChange={e => onUpdate({ ...project, devStatus: e.target.value as 'planning' | 'ongoing' | 'completed' })}
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

      {/* Short Description Card (like Excerpt) */}
      <SidebarCard title="Short Description" cardKey="description">
        <textarea
          value={project.description}
          onChange={e => onUpdate({ ...project, description: e.target.value })}
          rows={3}
          placeholder="Brief summary of your project..."
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] resize-none"
        />
        <p className="text-[11px] text-[#94A3B8] mt-2">Appears in project cards and previews</p>
      </SidebarCard>

      {/* Project Links Card */}
      <SidebarCard title="Project Links" cardKey="links">
        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
              <Github className="w-3.5 h-3.5" />
              GitHub Repository
            </label>
            <input
              type="url"
              value={project.githubUrl || ''}
              onChange={e => onUpdate({ ...project, githubUrl: e.target.value })}
              placeholder="https://github.com/..."
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
              <FileText className="w-3.5 h-3.5" />
              Paper / Documentation
            </label>
            <input
              type="url"
              value={project.paperUrl || ''}
              onChange={e => onUpdate({ ...project, paperUrl: e.target.value })}
              placeholder="https://..."
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
              <ExternalLink className="w-3.5 h-3.5" />
              Live Demo
            </label>
            <input
              type="url"
              value={project.demoUrl || ''}
              onChange={e => onUpdate({ ...project, demoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
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
            <option key={c} value={c}>{c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
          ))}
        </select>
      </SidebarCard>

      {/* Tech Stack & Tags Card */}
      <SidebarCard title="Tech Stack & Tags" cardKey="tags">
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
              placeholder="e.g., Python, MATLAB..."
              className="flex-1 bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <button
              onClick={addTag}
              className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg text-sm hover:bg-[#475569] transition-colors"
            >
              Add
            </button>
          </div>
          <p className="text-[11px] text-[#94A3B8]">Add tools: MATLAB, Python, Signal Processing, etc.</p>
        </div>
      </SidebarCard>

      {/* Date Card */}
      <SidebarCard title="Project Date" cardKey="date">
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Start/Completion Date</label>
          <input
            type="date"
            value={project.date || ''}
            onChange={e => onUpdate({ ...project, date: e.target.value })}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          />
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
