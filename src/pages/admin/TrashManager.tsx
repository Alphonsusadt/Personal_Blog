import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { RotateCcw, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { resolveLocalizedText } from '../../lib/localized';

interface TrashedItem {
  _id: string;
  id: string;
  title: any;
  type: 'project' | 'writing' | 'book';
  deletedAt: string;
  daysRemaining: number;
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export function TrashManager() {
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get('/api/trash')
      .then((data: any) => {
        if (Array.isArray(data)) {
          setItems(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (item: TrashedItem) => {
    setActioningId(item._id);
    try {
      await api.post(`/api/trash/restore/${item.type}/${item._id}`, {});
      load();
    } catch (err) {
      console.error('Failed to restore item:', err);
      alert('Gagal memulihkan konten.');
    } finally {
      setActioningId(null);
    }
  };

  const handlePermanentDelete = async (item: TrashedItem) => {
    const isConfirmed = confirm(
      `PENTING: Apakah Anda yakin ingin menghapus "${resolveLocalizedText(item.title, 'id') || resolveLocalizedText(item.title, 'en') || 'Untitled'}" secara permanen?\n\nTindakan ini tidak dapat dibatalkan, data di Supabase akan dibersihkan, dan semua gambar di Cloudinary yang terkait dengan konten ini akan dihapus secara permanen!`
    );
    if (!isConfirmed) return;

    setActioningId(item._id);
    try {
      await api.del(`/api/trash/permanent/${item.type}/${item._id}`);
      load();
    } catch (err) {
      console.error('Failed to permanently delete item:', err);
      alert('Gagal menghapus konten secara permanen.');
    } finally {
      setActioningId(null);
    }
  };

  const handleEmptyTrash = async () => {
    const isConfirmed = confirm(
      `PERINGATAN KRITIS: Apakah Anda yakin ingin mengosongkan seluruh tong sampah secara permanen?\n\nSemua data di MongoDB dan Supabase akan dihapus secara permanen, dan seluruh aset gambar di Cloudinary terkait akan dihancurkan selamanya! Tindakan ini 100% tidak dapat dibatalkan!`
    );
    if (!isConfirmed) return;

    setLoading(true);
    try {
      await api.del('/api/trash/empty');
      load();
    } catch (err) {
      console.error('Failed to empty trash:', err);
      alert('Gagal mengosongkan tong sampah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-[#EF4444]" />
            Tong Trash / Trash Bin
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Konten yang dihapus akan disimpan di sini selama <strong>30 hari</strong> sebelum dibersihkan secara otomatis oleh sistem (termasuk Supabase & Cloudinary).
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-red-500/20 disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" /> Kosongkan Sampah
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-[#94A3B8] text-sm flex items-center gap-2">
          Memuat data tong sampah...
        </p>
      ) : (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#334155] text-left">
                <th className="px-6 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Judul / Konten</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Section</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#94A3B8] uppercase hidden md:table-cell">Tanggal Dihapus</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Waktu Tersisa</th>
                <th className="px-6 py-3 text-xs font-semibold text-[#94A3B8] uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const resolvedTitle = resolveLocalizedText(item.title, 'id') || resolveLocalizedText(item.title, 'en') || 'Untitled';
                
                // Color mapping for days remaining
                const daysRemainingColor = 
                  item.daysRemaining > 20 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                  item.daysRemaining > 10 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                  'bg-red-500/15 text-red-400 border-red-500/30';

                const typeLabels = {
                  project: { label: 'Project', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
                  writing: { label: 'Writing', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
                  book: { label: 'Library', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
                };

                const typeConfig = typeLabels[item.type] || { label: item.type, color: 'bg-[#334155] text-[#94A3B8] border-[#334155]' };

                return (
                  <tr key={item._id} className="border-b border-[#334155] last:border-0 hover:bg-[#334155]/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[#F8FAFC] font-medium text-sm line-clamp-1">{resolvedTitle}</span>
                        <span className="text-[10px] text-[#94A3B8] mt-0.5 font-mono select-all">{item.id || item._id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-xs text-[#94A3B8]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                        {formatDateTime(item.deletedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${daysRemainingColor}`}>
                        {item.daysRemaining} hari lagi
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={actioningId !== null}
                          onClick={() => handleRestore(item)}
                          className="flex items-center gap-1 text-xs text-[#60A5FA] hover:text-[#3B82F6] font-medium px-2 py-1 bg-[#60A5FA]/10 hover:bg-[#60A5FA]/20 border border-[#60A5FA]/20 rounded transition-all disabled:opacity-50"
                          title="Pulihkan kembali"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Pulihkan</span>
                        </button>
                        <button
                          disabled={actioningId !== null}
                          onClick={() => handlePermanentDelete(item)}
                          className="flex items-center gap-1 text-xs text-[#EF4444] hover:text-[#DC2626] font-medium px-2 py-1 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 rounded transition-all disabled:opacity-50"
                          title="Hapus Permanen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Hapus Permanen</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Trash2 className="w-8 h-8 text-[#475569]" />
                      <p className="text-sm font-medium">Tong sampah kosong</p>
                      <p className="text-xs text-[#64748B]">Tidak ada data yang dihapus baru-baru ini.</p>
                    </div>
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
