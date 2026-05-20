import { X, Github, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { ImageGallery } from './ImageGallery';
import React, { useCallback, useRef } from 'react';
import { generateSlug, isValidSlug } from '../utils/slugify';
import { IsolatedInput, IsolatedTextarea, IsolatedTagInput } from './IsolatedInput';
import { useAutoFixLanguage } from '../hooks/useAutoFixLanguage';
import { resolveLocalizedText, setLocalizedText, type LocalizedTextValue } from '../lib/localized';
import { TranslationButtonGroup } from './TranslationButtonGroup';
import { TranslationStatusBadge } from './TranslationStatusBadge';
import { api } from '../lib/api';

interface Project {
  _id?: string;
  id: string;
  title: LocalizedTextValue;
  description: LocalizedTextValue;
  tags: string[];
  category: string;
  content: LocalizedTextValue;
  status?: 'draft' | 'published' | 'scheduled';
  devStatus?: 'planning' | 'ongoing' | 'completed';
  date?: string;
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  githubUrl?: string;
  paperUrl?: string;
  demoUrl?: string;
  // SEO Fields
  metaDescription?: string;
  ogImage?: string;
  keywords?: string;
  metaTitle?: string;
  contentLanguage?: 'en' | 'id' | 'bilingual';
  translationOfId?: string;
}

interface ProjectSidebarProps {
  project: Project;
  onUpdate: (project: Project) => void;
  onSave: (shouldPublish?: boolean) => Promise<void>;
  isSaving?: boolean;
  wordCount?: number;
  characterCount?: number;
  sectionEnabled?: boolean;
  onBeforeTranslate?: () => Promise<void>;
}

interface CategoryItem {
  value: string;
  label: string | { en: string; id: string };
  enabled?: boolean;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { value: 'signal-processing', label: { en: 'Signal Processing', id: 'Pemrosesan Sinyal' } },
  { value: 'control', label: { en: 'Control', id: 'Kontrol' } },
  { value: 'data-analysis', label: { en: 'Data Analysis', id: 'Analisis Data' } },
];

const devStatuses = [
  { value: 'planning', label: 'Planning', color: 'bg-blue-500' },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-yellow-500' },
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

export function ProjectSidebar({ project, onUpdate, onSave, isSaving, wordCount = 0, characterCount = 0, sectionEnabled = true, onBeforeTranslate }: ProjectSidebarProps) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [translationStatus, setTranslationStatus] = React.useState<any>(null);
  const { language, setLanguage } = useAutoFixLanguage();
  const [categoriesList, setCategoriesList] = React.useState<CategoryItem[]>(DEFAULT_CATEGORIES);

  React.useEffect(() => {
    let active = true;
    api.get('/api/categories?section=projects')
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
            if (c.enabled || c.value === project.category) {
              mergedMap.set(c.value, c);
            }
          });

          if (project.category && !mergedMap.has(project.category)) {
            const formattedLabel = project.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            mergedMap.set(project.category, {
              value: project.category,
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
  }, [project.category]);

  const getCategoryLabelText = (label: string | { en: string; id: string }) => {
    if (typeof label === 'string') return label;
    if (language === 'id') return label.id || label.en;
    return label.en || label.id;
  };

  void onSave;
  void isSaving;
  
  // Use ref to always have latest project without causing re-renders  
  const projectRef = useRef(project);
  projectRef.current = project;

  // Stable callbacks - use ref to get latest project
  const handleDescriptionCommit = useCallback((value: string) => {
    onUpdate({ ...projectRef.current, description: setLocalizedText(projectRef.current.description, language, value) });
  }, [language, onUpdate]);

  const handleGithubUrlCommit = useCallback((value: string) => {
    onUpdate({ ...projectRef.current, githubUrl: value });
  }, [onUpdate]);

  const handlePaperUrlCommit = useCallback((value: string) => {
    onUpdate({ ...projectRef.current, paperUrl: value });
  }, [onUpdate]);

  const handleDemoUrlCommit = useCallback((value: string) => {
    onUpdate({ ...projectRef.current, demoUrl: value });
  }, [onUpdate]);

  const handleAddTag = useCallback((tag: string) => {
    onUpdate({ ...projectRef.current, tags: [...projectRef.current.tags, tag] });
  }, [onUpdate]);

  const handleMetaTitleCommit = useCallback((value: string) => {
    onUpdate({ ...projectRef.current, metaTitle: value });
  }, [onUpdate]);

  const handleMetaDescriptionCommit = useCallback((value: string) => {
    onUpdate({ ...projectRef.current, metaDescription: value });
  }, [onUpdate]);

  const handleKeywordsCommit = useCallback((value: string) => {
    onUpdate({ ...projectRef.current, keywords: value });
  }, [onUpdate]);

  const handleOgImageCommit = useCallback((value: string) => {
    onUpdate({ ...projectRef.current, ogImage: value });
  }, [onUpdate]);

  // Auto-generate slug ONLY when: 1) Creating new item, 2) User clicks regenerate
  // REMOVED auto-generation on title change - causes re-renders and scroll jumps!
  // useEffect(() => {
  //   if (project.title && (!project.id || !slugManuallyEdited)) {
  //     const autoSlug = generateSlug(project.title);
  //     if (autoSlug && autoSlug !== project.id) {
  //       onUpdate({ ...project, id: autoSlug });
  //     }
  //   }
  // }, [project.title, slugManuallyEdited, project.id]);

  const handleSlugChange = (newSlug: string) => {
    onUpdate({ ...project, id: newSlug });
  };

  const handleRegenerateSlug = () => {
    const autoSlug = generateSlug(resolveLocalizedText(project.title, language));
    if (autoSlug) {
      onUpdate({ ...project, id: autoSlug });
    }
  };

  const removeTag = (index: number) => {
    onUpdate({ ...project, tags: project.tags.filter((_, i) => i !== index) });
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



  const currentDevStatus = devStatuses.find(s => s.value === project.devStatus) || devStatuses[0];
  const localizedTitle = resolveLocalizedText(project.title, language);
  const localizedDescription = resolveLocalizedText(project.description, language);

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
          <p className="text-[11px] text-[#94A3B8]">Mengganti ini akan mengubah isi Title, Description, dan Content di editor sesuai bahasa yang dipilih.</p>
        </div>
      </SidebarCard>

      {/* Content Mode & Translation Link */}
      <SidebarCard title="Content Mode & Linking" cardKey="contentMode" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Mode Konten (Content Language)</label>
            <select
              value={project.contentLanguage || 'bilingual'}
              onChange={e => onUpdate({ ...project, contentLanguage: e.target.value as 'en' | 'id' | 'bilingual' })}
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            >
              <option value="bilingual">Bilingual (Satu post, dua bahasa)</option>
              <option value="id">Hanya Indonesia</option>
              <option value="en">Hanya English</option>
            </select>
            <p className="text-[11px] text-[#94A3B8] mt-1">Pilih 'Hanya Indonesia' jika kamu membuat post terpisah dan ingin dihubungkan secara manual.</p>
          </div>

          {project.contentLanguage !== 'bilingual' && (
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Link to Translation (ID Project)</label>
              <IsolatedInput
                id={project.id + '-translation-of'}
                initialValue={project.translationOfId || ''}
                onCommit={(val) => onUpdate({ ...project, translationOfId: val })}
                placeholder="Masukkan ID project terjemahannya..."
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
              />
              <p className="text-[11px] text-[#94A3B8] mt-1">Jika ini post bahasa ID, masukkan ID post bahasa EN-nya agar terhubung di website.</p>
            </div>
          )}
        </div>
      </SidebarCard>

      {/* Project Stats */}
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

      {/* Publication Status Card */}
      <SidebarCard title="Publication Status" cardKey="status" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          <select
            value={project.status || 'draft'}
            disabled={!sectionEnabled}
            onChange={e => {
              const newStatus = e.target.value as 'draft' | 'published' | 'scheduled';
              const updates: Partial<Project> = { status: newStatus };
              if (newStatus === 'scheduled' && !project.publishAt) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                updates.publishAt = tomorrow.toISOString();
              }
              onUpdate({ ...project, ...updates });
            }}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="draft">📝 Draft</option>
            <option value="published">✅ Published</option>
            <option value="scheduled">⏰ Scheduled</option>
          </select>

          {!sectionEnabled ? (
            <p className="text-[11px] text-[#94A3B8]">
              Projects section dimatikan di Settings. Publish/Schedule dinonaktifkan (kamu masih bisa simpan).
            </p>
          ) : null}

          {/* Datetime picker untuk scheduled */}
          {project.status === 'scheduled' && (
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Publish At</label>
              <input
                type="datetime-local"
                value={toDateTimeLocal(project.publishAt)}
                disabled={!sectionEnabled}
                onChange={e => onUpdate({ ...project, publishAt: fromDateTimeLocal(e.target.value) })}
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
              project.status === 'published' ? 'bg-green-500' : 
              project.status === 'scheduled' ? 'bg-blue-500' : 'bg-yellow-500'
            }`}></span>
            <span className="text-xs text-[#94A3B8]">
              {project.status === 'published' ? 'Live - Sudah dipublikasi' : 
               project.status === 'scheduled' ? `Terjadwal - ${project.publishAt ? new Date(project.publishAt).toLocaleString('id-ID') : ''}` : 
               'Draft - Belum dipublikasi'}
            </span>
          </div>
        </div>
      </SidebarCard>

      {/* Development Status Card */}
      <SidebarCard title="Development Status" cardKey="devStatus" collapsed={collapsed} onToggle={toggleCard}>
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
      <SidebarCard title="Short Description" cardKey="description" collapsed={collapsed} onToggle={toggleCard}>
        <IsolatedTextarea
          id={project.id}
          initialValue={localizedDescription}
          onCommit={handleDescriptionCommit}
          rows={3}
          placeholder="Brief summary of your project..."
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] resize-none"
        />
        <p className="text-[11px] text-[#94A3B8] mt-2">Appears in project cards and previews</p>
      </SidebarCard>

      {/* Project Links Card */}
      <SidebarCard title="Project Links" cardKey="links" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
              <Github className="w-3.5 h-3.5" />
              GitHub Repository
            </label>
            <IsolatedInput
              id={project.id}
              type="url"
              initialValue={project.githubUrl || ''}
              onCommit={handleGithubUrlCommit}
              placeholder="https://github.com/..."
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
              <FileText className="w-3.5 h-3.5" />
              Paper / Documentation
            </label>
            <IsolatedInput
              id={project.id}
              type="url"
              initialValue={project.paperUrl || ''}
              onCommit={handlePaperUrlCommit}
              placeholder="https://..."
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
              <ExternalLink className="w-3.5 h-3.5" />
              Live Demo
            </label>
            <IsolatedInput
              id={project.id}
              type="url"
              initialValue={project.demoUrl || ''}
              onCommit={handleDemoUrlCommit}
              placeholder="https://..."
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>
        </div>
      </SidebarCard>

      {/* Category Card */}
      <SidebarCard title="Category" cardKey="category" collapsed={collapsed} onToggle={toggleCard}>
        <select
          value={project.category}
          onChange={e => onUpdate({ ...project, category: e.target.value })}
          className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
        >
          {categoriesList.map(c => (
            <option key={c.value} value={c.value}>{getCategoryLabelText(c.label)}</option>
          ))}
        </select>
      </SidebarCard>

      {/* Tech Stack & Tags Card */}
      <SidebarCard title="Tech Stack & Tags" cardKey="tags" collapsed={collapsed} onToggle={toggleCard}>
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
          <IsolatedTagInput
            onAddTag={handleAddTag}
            placeholder="e.g., Python, MATLAB..."
            className="flex-1 bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          />
          <p className="text-[11px] text-[#94A3B8] mt-2">Add tools: MATLAB, Python, Signal Processing, etc.</p>
        </div>
      </SidebarCard>

      {/* Date Card */}
      <SidebarCard title="Project Date" cardKey="date" collapsed={collapsed} onToggle={toggleCard}>
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
      <SidebarCard title="ID/Slug" cardKey="slug" collapsed={collapsed} onToggle={toggleCard}>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={project.id}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="unique-slug"
              className={`flex-1 bg-[#0F172A] border text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] ${
                project.id && !isValidSlug(project.id) ? 'border-red-500' : 'border-[#334155]'
              }`}
            />
            <button
              type="button"
              onClick={handleRegenerateSlug}
              disabled={!project.title}
              className="p-2 text-[#94A3B8] hover:text-[#60A5FA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Generate from title"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {project.id && !isValidSlug(project.id) && (
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
              id={project.id + '-meta-title'}
              initialValue={project.metaTitle || localizedTitle}
              onCommit={handleMetaTitleCommit}
              placeholder="Auto-filled from title"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <p className="text-xs text-[#64748B] mt-1">{(project.metaTitle || localizedTitle).length}/60 chars</p>
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Meta Description</label>
            <IsolatedTextarea
              id={project.id + '-meta-desc'}
              initialValue={project.metaDescription || localizedDescription}
              onCommit={handleMetaDescriptionCommit}
              placeholder="Auto-filled from description"
              rows={3}
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA] resize-none"
            />
            <p className="text-xs text-[#64748B] mt-1">{(project.metaDescription || localizedDescription).length}/160 chars</p>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">Keywords</label>
            <IsolatedInput
              id={project.id + '-keywords'}
              initialValue={project.keywords || project.tags.join(', ')}
              onCommit={handleKeywordsCommit}
              placeholder="Auto-filled from tags"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
          </div>

          {/* OG Image */}
          <div>
            <label className="block text-xs text-[#94A3B8] mb-1">OG Image URL</label>
            <IsolatedInput
              id={project.id + '-og-image'}
              initialValue={project.ogImage || ''}
              onCommit={handleOgImageCommit}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <p className="text-xs text-[#64748B] mt-1">For social media sharing (1200x630px recommended)</p>
          </div>
        </div>
      </SidebarCard>

      {/* Image Gallery Card */}
      <SidebarCard title="Images" cardKey="images" collapsed={collapsed} onToggle={toggleCard}>
        <ImageGallery
          content={resolveLocalizedText(project.content, language)}
          onRemoveImage={(markdown) => {
            const updatedContent = resolveLocalizedText(project.content, language).replace(markdown, '');
            onUpdate({ ...project, content: setLocalizedText(project.content, language, updatedContent) });
          }}
        />
      </SidebarCard>

      {/* Translation Card */}
      <SidebarCard title="Translation" cardKey="translation" collapsed={collapsed} onToggle={() => setCollapsed(prev => ({ ...prev, translation: !prev.translation }))}>
        <div className="space-y-3">
          <TranslationButtonGroup
            postId={project._id}
            contentType="project"
            currentLanguage={language}
            onBeforeTranslate={onBeforeTranslate}
            onTranslationStart={() => {
              // Optional: show loading state
            }}
            onTranslationComplete={(result: any) => {
              setTranslationStatus({
                status: 'completed',
                method: result.method,
                language: result.targetLanguage || 'en',
              });

              // Merge translated data into the existing project object so UI updates instantly
              const lang = result.targetLanguage || 'en';
              const updatedProject = { ...project };

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
              if (result.content) translations.description = result.content;

              for (const [field, translatedText] of Object.entries(translations)) {
                if (typeof translatedText === 'string') {
                  if (field === 'metaTitle' || field === 'metaDescription' || field === 'keywords') {
                    (updatedProject as any)[field] = translatedText;
                  } else {
                    (updatedProject as any)[field] = applyTranslation((project as any)[field], translatedText);
                  }
                }
              }

              onUpdate(updatedProject);
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
