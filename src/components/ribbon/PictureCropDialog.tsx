/**
 * Picture Format › Crop: kotak potong yang bisa digeser & diubah ukurannya (8 titik),
 * dengan pilihan rasio. Hasil dalam fraksi 0–1 dari ukuran asli gambar.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Rect = { x: number; y: number; w: number; h: number };
type Handle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const RATIOS: Array<{ label: string; value: number | null }> = [
  { label: 'Bebas', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
];
const MIN = 0.05;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function PictureCropDialog({ src, onCancel, onApply, busy }: {
  src: string;
  onCancel: () => void;
  onApply: (rect: Rect) => void;
  busy?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect>({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  const [ratio, setRatio] = useState<number | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Rasio dalam satuan fraksi: w/h (fraksi) = rasio piksel × (tinggi asli / lebar asli).
  const fracRatio = (r: number) => (natural ? r * (natural.h / natural.w) : r);

  const applyRatio = (r: number | null) => {
    setRatio(r);
    if (!r) return;
    setRect(prev => {
      const fr = fracRatio(r);
      let w = prev.w, h = w / fr;
      if (h > 1) { h = 1; w = h * fr; }
      if (w > 1) { w = 1; h = w / fr; }
      const cx = prev.x + prev.w / 2, cy = prev.y + prev.h / 2;
      return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h };
    });
  };

  const start = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const sx = e.clientX, sy = e.clientY;
    const r0 = rect;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / box.width, dy = (ev.clientY - sy) / box.height;
      if (handle === 'move') {
        setRect({ ...r0, x: clamp(r0.x + dx, 0, 1 - r0.w), y: clamp(r0.y + dy, 0, 1 - r0.h) });
        return;
      }
      let { x, y, w, h } = r0;
      if (handle.includes('e')) w = clamp(r0.w + dx, MIN, 1 - r0.x);
      if (handle.includes('s')) h = clamp(r0.h + dy, MIN, 1 - r0.y);
      if (handle.includes('w')) { const nx = clamp(r0.x + dx, 0, r0.x + r0.w - MIN); w = r0.w + (r0.x - nx); x = nx; }
      if (handle.includes('n')) { const ny = clamp(r0.y + dy, 0, r0.y + r0.h - MIN); h = r0.h + (r0.y - ny); y = ny; }
      if (ratio) {
        const fr = fracRatio(ratio);
        if (handle === 'n' || handle === 's') w = h * fr; else h = w / fr;
        if (x + w > 1) { w = 1 - x; h = w / fr; }
        if (y + h > 1) { h = 1 - y; w = h * fr; }
        if (handle.includes('w')) x = r0.x + r0.w - w;
        if (handle.includes('n')) y = r0.y + r0.h - h;
      }
      setRect({ x, y, w, h });
    };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  const pctStyle = (v: number) => `${v * 100}%`;
  const handles: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const pos: Record<string, React.CSSProperties> = {
    nw: { left: -6, top: -6, cursor: 'nwse-resize' }, n: { left: 'calc(50% - 6px)', top: -6, cursor: 'ns-resize' },
    ne: { right: -6, top: -6, cursor: 'nesw-resize' }, e: { right: -6, top: 'calc(50% - 6px)', cursor: 'ew-resize' },
    se: { right: -6, bottom: -6, cursor: 'nwse-resize' }, s: { left: 'calc(50% - 6px)', bottom: -6, cursor: 'ns-resize' },
    sw: { left: -6, bottom: -6, cursor: 'nesw-resize' }, w: { left: -6, top: 'calc(50% - 6px)', cursor: 'ew-resize' },
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] bg-black/70 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl w-full max-w-3xl text-[#F8FAFC]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]">
          <h3 className="font-semibold">Crop Picture</h3>
          <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-[#334155]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 flex flex-col items-center gap-3">
          <div ref={boxRef} className="relative select-none touch-none max-w-full" style={{ lineHeight: 0 }}>
            <img
              src={src}
              alt=""
              draggable={false}
              crossOrigin="anonymous"
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }}
            />
            {/* Area di luar kotak digelapkan, seperti di Word */}
            <div
              className="absolute border-2 border-white cursor-move"
              style={{ left: pctStyle(rect.x), top: pctStyle(rect.y), width: pctStyle(rect.w), height: pctStyle(rect.h), boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
              onPointerDown={start('move')}
            >
              {handles.map(h => (
                <span key={h} onPointerDown={start(h)} className="absolute w-3 h-3 bg-white border border-[#1E293B] rounded-sm" style={pos[h]} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#94A3B8]">Rasio:</span>
            {RATIOS.map(r => (
              <button
                key={r.label}
                type="button"
                onClick={() => applyRatio(r.value)}
                className={`px-2.5 py-1 rounded-md border ${ratio === r.value ? 'bg-[#1E40AF] border-[#1E40AF] text-white' : 'border-[#334155] hover:bg-[#334155]'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#334155]">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm bg-[#334155] hover:bg-[#475569]">Batal</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply(rect)}
            className="px-4 py-2 rounded-lg text-sm bg-[#1E40AF] hover:bg-[#1E3A8A] text-white disabled:opacity-50"
          >
            {busy ? 'Memproses…' : 'Potong'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
