import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';

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

export function WritingsManager() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Writing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); api.get('/api/writings').then(setItems).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus writing ini?')) return;
    await api.del(`/api/writings/${id}`); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Writings</h1>
        <button onClick={() => navigate('/admin/writings/edit/new')} className="flex items-center gap-2 bg-[#1E40AF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1E3A8A]"><Plus className="w-4 h-4" /> Add Writing</button>
      </div>

      {loading ? <p className="text-[#94A3B8]">Loading...</p> : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-[#334155] text-left">
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase">Title</th>
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase hidden md:table-cell">Category</th>
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase hidden md:table-cell">Date</th>
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase hidden md:table-cell">Status</th>
              <th className="px-6 py-3 text-xs font-medium text-[#94A3B8] uppercase text-right">Actions</th>
            </tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} className="border-b border-[#334155] last:border-0 hover:bg-[#334155]/20 transition-colors">
                  <td className="px-6 py-4"><p className="text-[#F8FAFC] font-medium text-sm">{item.title}</p><p className="text-[#94A3B8] text-xs mt-1 line-clamp-1">{item.excerpt}</p></td>
                  <td className="px-6 py-4 hidden md:table-cell"><span className="text-xs bg-[#334155] text-[#94A3B8] px-2 py-1 rounded">{item.category}</span></td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-[#94A3B8]">{item.date}</td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.status === 'published' ? 'bg-green-500' : item.status === 'scheduled' ? 'bg-blue-500' : 'bg-yellow-500'}`}></span>
                      <span className="text-xs font-medium text-[#94A3B8]">
                        {item.status === 'published' ? 'Published' : item.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate(`/admin/writings/edit/${item.id}`)} className="p-2 text-[#94A3B8] hover:text-[#60A5FA] transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item._id!)} className="p-2 text-[#94A3B8] hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-[#94A3B8]">No writings yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
