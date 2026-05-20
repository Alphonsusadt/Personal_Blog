import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getRuntimeCache, setRuntimeCache, invalidateRuntimeCache } from '../../lib/api';
import { Plus, Pencil, Trash2, Clock, Calendar, Eye, EyeOff, Filter } from 'lucide-react';
import { resolveLocalizedText, getTranslationStatus, type LocalizedTextValue } from '../../lib/localized';

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
  contentLanguage?: 'en' | 'id' | 'bilingual';
  translationOfId?: string;
  visible?: boolean;
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // SEO Fields
  metaDescription?: string;
  ogImage?: string;
  keywords?: string;
  metaTitle?: string;
  devStatus?: 'planning' | 'ongoing' | 'completed';
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export function WritingsManager() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Writing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLang, setFilterLang] = useState<'all' | 'bilingual' | 'en' | 'id'>('all');
  const cacheKey = 'admin:writings:list';

  const load = () => {
    const cached = getRuntimeCache<Writing[]>(cacheKey);
    if (cached) {
      setItems(cached);
      setLoading(false);
      api.get('/api/writings')
        .then((fresh) => {
          setRuntimeCache(cacheKey, fresh);
          setItems(fresh);
        })
        .catch(console.error);
      return;
    }

    setLoading(true);
    api.get('/api/writings')
      .then((fresh) => {
        setRuntimeCache(cacheKey, fresh);
        setItems(fresh);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus writing ini?')) return;
    await api.del(`/api/writings/${id}`);
    invalidateRuntimeCache('admin:writings:list');
    const item = items.find(i => i._id === id);
    if (item?.id) {
      invalidateRuntimeCache(`admin:writings:item:${item.id}`);
    }
    load();
  };

  const handleToggleVisibility = async (item: Writing) => {
    if (!item._id) return;
    await api.put(`/api/writings/${item._id}`, {
      ...item,
      visible: item.visible === false,
    });
    invalidateRuntimeCache('admin:writings:list');
    if (item.id) {
      invalidateRuntimeCache(`admin:writings:item:${item.id}`);
    }
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">Writings</h1>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#94A3B8]" />
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value as any)}
              className="bg-[#1E293B] border border-[#334155] text-[#F8FAFC] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#60A5FA]"
            >
              <option value="all">Semua Bahasa</option>
              <option value="bilingual">Bilingual (Dua Bahasa)</option>
              <option value="id">Hanya Indonesia (ID)</option>
              <option value="en">Hanya English (EN)</option>
            </select>
          </div>
        </div>
        <button onClick={() => navigate('/admin/writings/edit/new')} className="flex items-center gap-2 bg-[#1E40AF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1E3A8A]"><Plus className="w-4 h-4" /> Add Writing</button>
      </div>

      {loading ? <p className="text-[#94A3B8]">Loading...</p> : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-[#334155] text-left">
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase">Title</th>
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase hidden md:table-cell">Category</th>
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase hidden lg:table-cell">Created / Updated</th>
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase hidden md:table-cell">Status</th>
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase text-right">Actions</th>
            </tr></thead>
            <tbody>
              {items.filter(item => {
                if (filterLang === 'all') return true;
                const status = getTranslationStatus([item.title, item.content], item.translationOfId, item.contentLanguage);
                if (filterLang === 'bilingual') return status === 'bilingual';
                if (filterLang === 'id') return status === 'single-id';
                if (filterLang === 'en') return status === 'single-en';
                return true;
              }).map(item => {
                const status = getTranslationStatus([item.title, item.content], item.translationOfId, item.contentLanguage);
                return (
                <tr key={item._id} className="border-b border-[#334155] last:border-0 hover:bg-[#334155]/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[#F8FAFC] font-medium text-sm">{resolveLocalizedText(item.title, 'id') || resolveLocalizedText(item.title, 'en') || 'Untitled'}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        status === 'bilingual' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        status === 'single-id' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {status === 'bilingual' ? 'Bilingual' : status === 'single-id' ? 'Single (ID)' : 'Single (EN)'}
                      </span>
                    </div>
                    <p className="text-[#94A3B8] text-xs line-clamp-1">{resolveLocalizedText(item.excerpt, 'id') || resolveLocalizedText(item.excerpt, 'en')}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="text-xs bg-[#334155] text-[#94A3B8] px-2 py-1 rounded font-medium">{item.category}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                        (item.devStatus || 'planning') === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        (item.devStatus || 'planning') === 'ongoing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {(item.devStatus || 'planning') === 'completed' ? 'Completed' : (item.devStatus || 'planning') === 'ongoing' ? 'Ongoing' : 'Planning'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="text-xs text-[#94A3B8] space-y-1">
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateTime(item.createdAt)}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateTime(item.updatedAt)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.status === 'published' ? 'bg-green-500' : item.status === 'scheduled' ? 'bg-blue-500' : 'bg-yellow-500'}`}></span>
                      <div>
                        <span className="text-xs font-medium text-[#94A3B8]">
                          {item.status === 'published' ? 'Published' : item.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                        </span>
                        {item.status === 'scheduled' && item.publishAt && (
                          <p className="text-[10px] text-blue-400">{formatDateTime(item.publishAt)}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate(`/admin/writings/edit/${item.id || item._id || ''}`)} className="p-2 text-[#94A3B8] hover:text-[#60A5FA] transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleToggleVisibility(item)} className="p-2 text-[#94A3B8] hover:text-emerald-400 transition-colors" title={item.visible === false ? 'Show on public site' : 'Hide from public site'}>
                      {item.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(item._id!)} className="p-2 text-[#94A3B8] hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div></td>
                </tr>
                );
              })}
              {items.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-[#94A3B8]">No writings yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
