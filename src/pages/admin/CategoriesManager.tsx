import { useState, useEffect, useMemo } from 'react';
import { api, API_BASE, invalidateRuntimeCache } from '../../lib/api';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Tag, X, Check } from 'lucide-react';
import { ICON_MAP, AVAILABLE_ICON_NAMES, getLucideIcon } from '../../lib/iconMap';

interface CategoryItem {
  _id: string;
  section: string;
  value: string;
  label: { en: string; id: string };
  icon: string;
  enabled: boolean;
  order: number;
}

type SectionKey = 'projects' | 'writings' | 'books';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'projects', label: 'Projects' },
  { key: 'writings', label: 'Writings' },
  { key: 'books', label: 'Books' },
];

const SECTION_COLORS: Record<SectionKey, string> = {
  projects: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  writings: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  books: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const POPULAR_LUCIDE_ICONS = AVAILABLE_ICON_NAMES;

/**
 * Convert a Flaticon page URL into a direct PNG URL.
 * e.g. https://www.flaticon.com/free-icon/eucharist_10221243?...
 *   → https://cdn-icons-png.flaticon.com/512/10221/10221243.png
 */
function resolveFlaticonUrl(input: string): string {
  try {
    const url = new URL(input);
    // Match Flaticon page URLs: /free-icon/name_ID or /premium-icon/name_ID
    const match = url.pathname.match(/\/(?:free|premium)-icon\/[^/]+_(\d+)$/);
    if (match && (url.hostname === 'www.flaticon.com' || url.hostname === 'flaticon.com')) {
      const id = match[1];
      const folder = id.slice(0, id.length - 3);
      return `https://cdn-icons-png.flaticon.com/512/${folder}/${id}.png`;
    }
  } catch { /* not a valid URL, ignore */ }
  return input;
}

function CategoryIconPreview({ icon, size = 18 }: { icon: string; size?: number }) {
  const resolved = resolveFlaticonUrl(icon);
  // Resolve relative paths to CMS server URL, and proxy CDN URLs through CMS
  let src = resolved;
  if (resolved.startsWith('/')) {
    src = `${API_BASE}${resolved}`;
  } else if (resolved.startsWith('http') && !resolved.includes('/uploads/')) {
    src = `${API_BASE}/api/media/icon-proxy?url=${encodeURIComponent(resolved)}`;
  }
  const isUrl = src.startsWith('http') || src.startsWith('/');
  const isEmoji = /\p{Emoji}/u.test(icon) && !icon.startsWith('http') && icon.length <= 4;

  if (!icon) return <Tag style={{ width: size, height: size }} className="text-[#94A3B8]" />;

  if (isUrl) {
    return <img src={src} alt="" style={{ width: size, height: size }} className="object-contain" />;
  }

  if (isEmoji) {
    return <span style={{ fontSize: size }}>{icon}</span>;
  }

  const IconComp = getLucideIcon(icon);
  if (IconComp) return <IconComp size={size} className="text-[#94A3B8]" />;

  return <Tag style={{ width: size, height: size }} className="text-[#94A3B8]" />;
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CategoryItem | null;
  onSave: (data: { section: string; value: string; label: { en: string; id: string }; icon: string; order: number }) => void;
  onCancel: () => void;
}) {
  const [section, setSection] = useState<SectionKey>(initial?.section as SectionKey || 'projects');
  const [value, setValue] = useState(initial?.value || '');
  const [labelEn, setLabelEn] = useState(initial?.label?.en || '');
  const [labelId, setLabelId] = useState(initial?.label?.id || '');
  const [icon, setIcon] = useState(initial?.icon || '');
  const [order, setOrder] = useState(initial?.order ?? 1);
  const [iconSearch, setIconSearch] = useState('');

  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return POPULAR_LUCIDE_ICONS;
    return POPULAR_LUCIDE_ICONS.filter((name) =>
      name.toLowerCase().includes(iconSearch.toLowerCase())
    );
  }, [iconSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !labelEn.trim()) return;

    // If icon is an external URL, proxy it through backend first
    let finalIcon = icon.trim();
    if (finalIcon.startsWith('http')) {
      try {
        const res = await api.post('/api/media/proxy-icon', { url: finalIcon });
        finalIcon = res.url;
      } catch (err) {
        // If proxy fails, keep the original URL but warn the user
        console.warn('Failed to proxy icon, using original URL:', err);
        alert(
          'Warning: Could not cache the icon locally. The icon may not display correctly on the public site due to hotlink protection.\n\n' +
          'Make sure the CMS server is running and try again.'
        );
      }
    }

    onSave({
      section,
      value: value.trim().toLowerCase().replace(/\s+/g, '-'),
      label: { en: labelEn.trim(), id: labelId.trim() || labelEn.trim() },
      icon: finalIcon,
      order,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 mb-6">
      <h3 className="text-[#F8FAFC] font-medium mb-4">{initial ? 'Edit Category' : 'Add New Category'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as SectionKey)}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            disabled={!!initial}
          >
            {SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Value (slug)</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. signal-processing"
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            disabled={!!initial}
          />
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Label (English)</label>
          <input
            type="text"
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
            placeholder="e.g. Signal Processing"
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Label (Indonesia)</label>
          <input
            type="text"
            value={labelId}
            onChange={(e) => setLabelId(e.target.value)}
            placeholder="e.g. Pemrosesan Sinyal"
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Order</label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
            min={1}
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-[#94A3B8] mb-1">
            Icon — emoji, <a href="https://lucide.dev/icons" target="_blank" rel="noopener" className="text-[#60A5FA] underline">Lucide name</a>, or paste a <a href="https://www.flaticon.com" target="_blank" rel="noopener" className="text-[#60A5FA] underline">Flaticon</a> link (auto-converted)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={icon}
              onChange={(e) => {
                const val = e.target.value.trim();
                // Auto-convert Flaticon page URLs to direct PNG
                setIcon(val !== e.target.value ? val : resolveFlaticonUrl(e.target.value));
              }}
              onBlur={() => setIcon(resolveFlaticonUrl(icon))}
              placeholder="e.g. 🧠 or Activity or paste Flaticon link"
              className="flex-1 bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
            />
            <div className="w-10 h-10 flex items-center justify-center bg-[#0F172A] border border-[#334155] rounded-lg">
              <CategoryIconPreview icon={icon} size={22} />
            </div>
          </div>
          <div className="mt-2">
            <input
              type="text"
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder="Search Lucide icons..."
              className="w-full bg-[#0F172A] border border-[#334155] text-[#94A3B8] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#60A5FA]"
            />
            <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto">
              {filteredIcons.map((name) => {
                const IconComp = getLucideIcon(name);
                if (!IconComp) return null;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    className={`p-1.5 rounded transition-colors ${icon === name ? 'bg-[#1E40AF] text-white' : 'bg-[#0F172A] text-[#94A3B8] hover:bg-[#334155]'}`}
                    title={name}
                  >
                    <IconComp size={16} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button type="submit" className="flex items-center gap-2 bg-[#1E40AF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1E3A8A]">
          <Check className="w-4 h-4" /> {initial ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 text-[#94A3B8] hover:text-[#F8FAFC] px-4 py-2 rounded-lg text-sm">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </form>
  );
}

export function CategoriesManager() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSection, setFilterSection] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/api/categories')
      .then((data: CategoryItem[]) => setItems(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (data: { section: string; value: string; label: { en: string; id: string }; icon: string; order: number }) => {
    try {
      await api.post('/api/categories', data);
      invalidateRuntimeCache();
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleUpdate = async (data: { section: string; value: string; label: { en: string; id: string }; icon: string; order: number }) => {
    if (!editing) return;
    try {
      await api.put(`/api/categories/${editing._id}`, data);
      invalidateRuntimeCache();
      setEditing(null);
      load();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleToggle = async (item: CategoryItem) => {
    try {
      await api.patch(`/api/categories/${item._id}/toggle`, {});
      invalidateRuntimeCache();
      load();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (item: CategoryItem) => {
    if (!confirm(`Hapus kategori "${item.label.en}"?`)) return;
    try {
      await api.del(`/api/categories/${item._id}`);
      invalidateRuntimeCache();
      load();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const filtered = filterSection === 'all' ? items : items.filter((i) => i.section === filterSection);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">Categories</h1>
          <p className="text-sm text-[#94A3B8]">Kelola kategori untuk Projects, Writings, dan Books.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="bg-[#1E293B] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          >
            <option value="all">All Sections</option>
            {SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#1E40AF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1E3A8A]"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {showForm && !editing && (
        <CategoryForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <CategoryForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
      )}

      {loading ? (
        <p className="text-[#94A3B8]">Loading...</p>
      ) : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#334155] text-left">
                <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase">Label</th>
                <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase">Section</th>
                <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase hidden md:table-cell">Value (slug)</th>
                <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase hidden md:table-cell">Order</th>
                <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase">Enabled</th>
                <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const sectionKey = item.section as SectionKey;
                return (
                  <tr key={item._id} className="border-b border-[#334155] last:border-0 hover:bg-[#334155]/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 flex items-center justify-center">
                          <CategoryIconPreview icon={item.icon} size={20} />
                        </div>
                        <div>
                          <p className="text-[#F8FAFC] text-sm font-medium">{item.label.en}</p>
                          <p className="text-[#94A3B8] text-xs">{item.label.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded border ${SECTION_COLORS[sectionKey] || 'bg-[#334155] text-[#94A3B8]'}`}>
                        {item.section}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <code className="text-xs text-[#94A3B8] bg-[#0F172A] px-2 py-1 rounded">{item.value}</code>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-[#94A3B8]">{item.order}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(item)}
                        className={`transition-colors ${item.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-[#475569] hover:text-[#94A3B8]'}`}
                        title={item.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {item.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setShowForm(false); setEditing(item); }}
                          className="p-2 text-[#94A3B8] hover:text-[#60A5FA] transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 text-[#94A3B8] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#94A3B8]">
                    No categories yet. Click "Add Category" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
