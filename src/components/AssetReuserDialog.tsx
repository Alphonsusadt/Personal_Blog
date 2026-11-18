/**
 * Panel "Dari Bahasa Lain": semua gambar, embed, tabel, kode, rumus, dan link dari versi
 * bahasa satunya, siap dipakai di versi yang sedang ditulis.
 *
 *  - Sisipkan (di posisi kursor) atau drag langsung ke paragraf — tata letak gambar
 *    (wrap, lebar, posisi, gaya, caption) ikut terbawa.
 *  - Link: pilih kata di editor lalu "Pakai di teks terpilih".
 *  - "Salin semua ke posisi yang sama": aset yang belum dipakai ditaruh di urutan paragraf
 *    yang sama dengan versi sumber (bisa di-Undo dengan Ctrl+Z).
 *
 * Panel tidak menutupi editor, jadi bisa tetap terbuka sambil menulis.
 */
import { useDeferredValue, useMemo, useState, type RefObject } from 'react';
import { X, Image as ImageIcon, Code, Link2, Table2, Sigma, Youtube, Instagram, Twitter, Check, CopyPlus, GripVertical } from 'lucide-react';
import type { RichTextEditorRef } from './RichTextEditor';
import { assetKeys, extractAssets, placeAssetsLikeSource, type AssetKind, type BilingualAsset } from '../lib/bilingualAssets';

interface AssetReuserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Konten tersimpan versi bahasa lain (rich HTML atau Markdown lama). */
  otherLanguageContent: string;
  /** Konten versi yang sedang ditulis (untuk tanda ✓ dan penempatan otomatis). */
  currentContent: string;
  editorRef: RefObject<RichTextEditorRef | null>;
  sourceLanguage: 'id' | 'en';
}

type Filter = 'all' | 'media' | 'blocks' | 'links';
const FILTERS: Array<{ id: Filter; label: string; kinds: AssetKind[] }> = [
  { id: 'all', label: 'Semua', kinds: ['image', 'embed', 'table', 'code', 'math', 'link'] },
  { id: 'media', label: 'Gambar & Embed', kinds: ['image', 'embed'] },
  { id: 'blocks', label: 'Tabel & Kode', kinds: ['table', 'code', 'math'] },
  { id: 'links', label: 'Link', kinds: ['link'] },
];

function KindIcon({ asset }: { asset: BilingualAsset }) {
  const cls = 'w-4 h-4 shrink-0';
  if (asset.kind === 'embed') {
    if (asset.preview.includes('youtu')) return <Youtube className={`${cls} text-rose-400`} />;
    if (asset.preview.includes('instagram')) return <Instagram className={`${cls} text-pink-400`} />;
    return <Twitter className={`${cls} text-sky-400`} />;
  }
  if (asset.kind === 'image') return <ImageIcon className={`${cls} text-[#60A5FA]`} />;
  if (asset.kind === 'table') return <Table2 className={`${cls} text-emerald-400`} />;
  if (asset.kind === 'math') return <Sigma className={`${cls} text-amber-400`} />;
  if (asset.kind === 'link') return <Link2 className={`${cls} text-[#60A5FA]`} />;
  return <Code className={`${cls} text-purple-400`} />;
}

export function AssetReuserDialog({ isOpen, onClose, otherLanguageContent, currentContent, editorRef, sourceLanguage }: AssetReuserDialogProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [notice, setNotice] = useState('');
  // Isi editor berubah tiap ketikan; tanda ✓ cukup dihitung saat browser senggang.
  const deferredCurrent = useDeferredValue(currentContent);

  const assets = useMemo(() => (isOpen ? extractAssets(otherLanguageContent) : []), [isOpen, otherLanguageContent]);
  const used = useMemo(() => (isOpen ? assetKeys(deferredCurrent) : new Set<string>()), [isOpen, deferredCurrent]);

  if (!isOpen) return null;

  const langName = sourceLanguage === 'en' ? 'English' : 'Bahasa Indonesia';
  const kinds = FILTERS.find(f => f.id === filter)!.kinds;
  const shown = assets.filter(a => kinds.includes(a.kind));
  const unusedPlaceable = assets.filter(a => a.kind !== 'link' && !used.has(a.key)).length;
  const say = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(n => (n === msg ? '' : n)), 4000); };

  const insert = (a: BilingualAsset) => {
    const ed = editorRef.current;
    if (!ed) return say('Editor belum siap.');
    ed.insertHtml(a.kind === 'link' ? `<a href="${a.href?.replace(/"/g, '&quot;')}">${a.label.replace(/</g, '&lt;')}</a>` : a.html);
    say(`${a.label} disisipkan di posisi kursor.`);
  };
  const linkSelection = (a: BilingualAsset) => {
    const ok = editorRef.current?.linkSelection(a.href || '');
    say(ok ? 'Link dipasang pada teks terpilih.' : 'Pilih (blok) dulu kata di editor yang mau diberi link ini.');
  };
  const placeAll = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const { html, added } = placeAssetsLikeSource(otherLanguageContent, currentContent);
    if (!added) return say('Semua aset sudah ada di versi ini.');
    ed.replaceHtml(html);
    say(`${added} aset ditaruh di paragraf yang sama dengan versi ${langName}. Ctrl+Z untuk membatalkan.`);
  };

  return (
    <aside
      className="fixed z-[90] right-3 top-20 bottom-3 w-[min(360px,calc(100vw-1.5rem))] flex flex-col bg-[#0F172A] border border-[#334155] rounded-xl shadow-2xl"
      aria-label="Aset dari bahasa lain"
    >
      <div className="flex items-start justify-between gap-2 p-3 border-b border-[#334155]">
        <div>
          <h2 className="text-sm font-bold text-[#F8FAFC]">Dari {langName}</h2>
          <p className="text-[11px] leading-snug text-[#94A3B8]">Klik "Sisipkan" atau drag kartu ke paragraf. Tata letak gambar ikut terbawa.</p>
        </div>
        <button type="button" onClick={onClose} title="Tutup" className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#1E293B]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-2 border-b border-[#334155]">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={placeAll}
          disabled={!unusedPlaceable}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-[#1E40AF] hover:bg-[#1E3A8A] text-white disabled:opacity-40 disabled:cursor-not-allowed"
          title="Taruh setiap aset yang belum dipakai di paragraf dengan urutan yang sama"
        >
          <CopyPlus className="w-4 h-4" />
          Salin semua ke posisi yang sama {unusedPlaceable ? `(${unusedPlaceable})` : ''}
        </button>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => {
            const n = assets.filter(a => f.kinds.includes(a.kind)).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-2 py-1 text-[11px] rounded-md border ${filter === f.id ? 'bg-[#1E293B] border-[#60A5FA] text-[#F8FAFC]' : 'border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
              >
                {f.label} <span className="opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
        {notice && <p className="text-[11px] text-emerald-300" role="status">{notice}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {shown.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#94A3B8]">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
            Tidak ada aset di versi {langName}.
          </div>
        ) : shown.map((a, i) => {
          const isUsed = used.has(a.key);
          return (
            <div
              key={`${a.key}-${i}`}
              draggable={a.kind !== 'link'}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/html', a.html);
                e.dataTransfer.setData('text/plain', '');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={`group rounded-lg border bg-[#1E293B] p-2 ${isUsed ? 'border-emerald-700/60' : 'border-[#334155]'} ${a.kind !== 'link' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <div className="flex items-center gap-2 text-xs text-[#F8FAFC]">
                {a.kind !== 'link' && <GripVertical className="w-3.5 h-3.5 text-[#475569] shrink-0" />}
                <KindIcon asset={a} />
                <span className="truncate flex-1" title={a.label}>{a.label}</span>
                {isUsed && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0" title="Sudah ada di versi ini">
                    <Check className="w-3 h-3" /> dipakai
                  </span>
                )}
              </div>

              {a.kind === 'image' ? (
                <img src={a.preview} alt="" draggable={false} className="mt-2 w-full h-24 object-cover rounded-md bg-[#0F172A]" />
              ) : a.kind === 'link' ? (
                <div className="mt-1.5 space-y-1">
                  <p className="text-[11px] text-[#60A5FA] break-all">{a.href}</p>
                  {a.context && <p className="text-[11px] text-[#94A3B8] italic leading-snug">“{a.context}”</p>}
                </div>
              ) : (
                <p className="mt-1.5 text-[10px] font-mono text-[#94A3B8] line-clamp-3 break-all whitespace-pre-wrap">{a.preview}</p>
              )}

              <div className="mt-2 flex gap-1.5">
                {a.kind === 'link' && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => linkSelection(a)}
                    className="flex-1 px-2 py-1 text-[11px] rounded-md bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
                  >
                    Pakai di teks terpilih
                  </button>
                )}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(a)}
                  className={`flex-1 px-2 py-1 text-[11px] rounded-md ${a.kind === 'link' ? 'border border-[#334155] text-[#CBD5E1] hover:bg-[#334155]' : 'bg-[#1E40AF] hover:bg-[#1E3A8A] text-white'}`}
                >
                  {a.kind === 'link' ? 'Sisipkan link' : 'Sisipkan'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
