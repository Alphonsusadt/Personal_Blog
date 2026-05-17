import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Tag, X, Check } from 'lucide-react';

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

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CategoryItem | null;
  onSave: (data: { section: string; value: string; label: { en: string; id: string }; order: number }) => void;
  onCancel: () => void;
}) {
  const [section, setSection] = useState<SectionKey>(initial?.section as SectionKey || 'projects');
  const [value, setValue] = useState(initial?.value || '');
  const [labelEn, setLabelEn] = useState(initial?.label?.en || '');
  const [labelId, setLabelId] = useState(initial?.label?.id || '');
  const [order, setOrder] = useState(initial?.order ?? 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !labelEn.trim()) return;
    onSave({
      section,
      value: value.trim().toLowerCase().replace(/\s+/g, '-'),
      label: { en: labelEn.trim(), id: labelId.trim() || labelEn.trim() },
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

  const handleCreate = async (data: { section: string; value: string; label: { en: string; id: string }; order: number }) => {
    try {
      await api.post('/api/categories', data);
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleUpdate = async (data: { section: string; value: string; label: { en: string; id: string }; order: number }) => {
    if (!editing) return;
    try {
      await api.put(`/api/categories/${editing._id}`, data);
      setEditing(null);
      load();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleToggle = async (item: CategoryItem) => {
    try {
      await api.patch(`/api/categories/${item._id}/toggle`, {});
      load();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (item: CategoryItem) => {
    if (!confirm(`Hapus kategori "${item.label.en}"?`)) return;
    try {
      await api.del(`/api/categories/${item._id}`);
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
                        <Tag className="w-4 h-4 text-[#94A3B8]" />
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
