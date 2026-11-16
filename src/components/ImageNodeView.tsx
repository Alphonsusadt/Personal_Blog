/**
 * Gambar di editor, bergaya Microsoft Word:
 *  - 8 titik resize (rasio terkunci); satu tarikan = satu langkah Undo
 *  - tombol "Layout Options" di samping gambar terpilih (Wrap Text cepat)
 *  - keterangan (caption) yang bisa diketik langsung di bawah gambar
 *  - seluruh gambar bisa di-drag untuk dipindah (ditangani ProseMirror + RichTextEditor)
 *
 * Class wrapper sama persis dengan HTML yang disimpan (lihat CustomImage.renderHTML),
 * jadi tampilan di editor = tampilan di halaman publik.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { LayoutGrid } from 'lucide-react';
import { NodeSelection } from '@tiptap/pm/state';
import { isFreeWrap, type ImageWrap } from '../lib/tiptap-extensions';
import { WRAP_OPTIONS, WrapIcon } from './ribbon/imageLayout';
import { EmbedPreview } from './SocialEmbedView';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_POS: Record<Handle, CSSProperties> = {
  nw: { left: -5, top: -5, cursor: 'nwse-resize' },
  n: { left: 'calc(50% - 5px)', top: -5, cursor: 'ns-resize' },
  ne: { right: -5, top: -5, cursor: 'nesw-resize' },
  e: { right: -5, top: 'calc(50% - 5px)', cursor: 'ew-resize' },
  se: { right: -5, bottom: -5, cursor: 'nwse-resize' },
  s: { left: 'calc(50% - 5px)', bottom: -5, cursor: 'ns-resize' },
  sw: { left: -5, bottom: -5, cursor: 'nesw-resize' },
  w: { left: -5, top: 'calc(50% - 5px)', cursor: 'ew-resize' },
};

const MIN_PCT = 5;

export function ImageNodeView(props: NodeViewProps) {
  const { node, selected, updateAttributes, editor } = props;
  const { src, alt, width, wrap, align, styleVariant, caption, offsetX, offsetY } = node.attrs as {
    src: string; alt: string | null; width: string; wrap: ImageWrap; align: string; styleVariant: string; caption: string | null;
    offsetX: number; offsetY: number;
  };
  // NodeView ini juga dipakai embed sosial (YouTube/Instagram/X): tata letaknya sama persis.
  const isEmbed = node.type.name === 'socialEmbed';
  const embedType = isEmbed ? String(node.attrs.type || '') : '';
  const embedUrl = isEmbed ? String(node.attrs.url || '') : '';
  // Embed tidak punya bentuk transparan, jadi Tight diperlakukan sebagai Square.
  const wrapMode: ImageWrap = isEmbed && wrap === 'tight' ? 'square' : wrap;
  const free = isFreeWrap(wrap);
  const imgRef = useRef<HTMLSpanElement>(null); // bingkai media (gambar atau embed)
  const [liveWidth, setLiveWidth] = useState<number | null>(null); // % saat sedang ditarik
  const liveRef = useRef<number | null>(null);
  // Posisi sementara saat gambar bebas di-drag/di-resize (sebelum disimpan sebagai satu langkah Undo).
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const livePosRef = useRef<{ x: number; y: number } | null>(null);
  const [snapGuide, setSnapGuide] = useState<'left' | 'center' | 'right' | null>(null);
  const [dragging, setDragging] = useState(false);

  /** Paragraf tambatan (offsetParent) + faktor zoom tampilan editor. */
  const anchorBox = () => {
    const fig = imgRef.current?.closest('.wc-figure') as HTMLElement | null;
    const anchor = (fig?.offsetParent as HTMLElement | null) ?? (editor.view.dom as HTMLElement);
    const rect = anchor.getBoundingClientRect();
    const zoom = anchor.offsetWidth ? rect.width / anchor.offsetWidth : 1;
    return { fig, anchor, rect, zoom };
  };

  // ---- Drag bebas (In Front of / Behind Text): gambar mengikuti mouse, snap ke tepi/tengah ----
  const startFreeDrag = (e: React.PointerEvent) => {
    if (!free || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-wc-handle]')) return;
    const { fig, rect: aRect, zoom } = anchorBox();
    if (!fig) return;
    const figRect = fig.getBoundingClientRect();
    const wPct = (figRect.width / aRect.width) * 100;
    const startX = e.clientX, startY = e.clientY;
    const x0 = offsetX || 0, y0 = offsetY || 0;
    let moved = false;
    const SNAP = 1.5; // % lebar kolom

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 4) return; // klik biasa = pilih, bukan geser
      if (!moved) { moved = true; setDragging(true); editor.commands.setNodeSelection(props.getPos() as number); }
      ev.preventDefault();
      let x = x0 + (dx / aRect.width) * 100;
      let guide: 'left' | 'center' | 'right' | null = null;
      if (Math.abs(x) < SNAP) { x = 0; guide = 'left'; }
      else if (Math.abs(x + wPct / 2 - 50) < SNAP) { x = 50 - wPct / 2; guide = 'center'; }
      else if (Math.abs(x + wPct - 100) < SNAP) { x = 100 - wPct; guide = 'right'; }
      x = Math.max(0, Math.min(100 - wPct, x));
      const pos = { x, y: y0 + dy / zoom };
      livePosRef.current = pos;
      setLivePos(pos);
      setSnapGuide(guide);
    };
    const finish = (commit: boolean) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('keydown', onKey);
      const pos = livePosRef.current;
      livePosRef.current = null;
      setLivePos(null);
      setSnapGuide(null);
      setDragging(false);
      if (commit && moved && pos) commitFreeMove(pos, figRect.top + (pos.y - y0) * zoom, aRect.left);
    };
    const onUp = () => finish(true);
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') finish(false); };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('keydown', onKey);
  };

  /**
   * Simpan posisi akhir sebagai SATU transaksi: bila gambar dilepas di atas paragraf lain,
   * tambatannya pindah ke paragraf itu (seperti anchor di Word) dan offset Y dihitung ulang.
   */
  const commitFreeMove = (pos: { x: number; y: number }, figTopClient: number, colLeftClient: number) => {
    const view = editor.view;
    const from = props.getPos();
    if (typeof from !== 'number') return;
    const hit = view.posAtCoords({ left: colLeftClient + 4, top: figTopClient + 2 });
    let targetStart: number | null = null;
    let targetDom: HTMLElement | null = null;
    if (hit) {
      const $hit = view.state.doc.resolve(hit.pos);
      for (let d = $hit.depth; d > 0; d--) {
        if ($hit.node(d).isTextblock) {
          targetStart = $hit.start(d);
          targetDom = view.nodeDOM($hit.before(d)) as HTMLElement | null;
          break;
        }
      }
    }
    const $from = view.state.doc.resolve(from);
    const sameBlock = targetStart === null || targetStart === $from.start();
    const attrs = { ...node.attrs, offsetX: Math.round(pos.x * 100) / 100, offsetY: Math.round(pos.y) };
    let tr = view.state.tr;
    if (sameBlock || !targetDom) {
      tr = tr.setNodeMarkup(from, undefined, attrs);
      tr.setSelection(NodeSelection.create(tr.doc, from));
    } else {
      const tRect = targetDom.getBoundingClientRect();
      const zoom = targetDom.offsetWidth ? tRect.width / targetDom.offsetWidth : 1;
      attrs.offsetY = Math.round((figTopClient - tRect.top) / zoom);
      tr = tr.delete(from, from + node.nodeSize);
      const insertAt = tr.mapping.map(targetStart as number);
      tr = tr.insert(insertAt, node.type.create(attrs));
      tr.setSelection(NodeSelection.create(tr.doc, insertAt));
    }
    view.dispatch(tr);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => { if (!selected) setMenuOpen(false); }, [selected]);

  // Mode bebas: matikan drag HTML bawaan langsung di elemen (fase capture). ProseMirror
  // memasang pendengarnya sebelum React, jadi pencegahan lewat prop React terlambat.
  useEffect(() => {
    const fig = imgRef.current?.closest('.wc-figure') as HTMLElement | null;
    if (!fig || !free) return;
    const block = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    fig.addEventListener('dragstart', block, true);
    fig.draggable = false;
    return () => { fig.removeEventListener('dragstart', block, true); fig.draggable = true; };
  }, [free, broken]);
  useEffect(() => { setBroken(false); }, [src]);

  const columnWidth = () => {
    const root = editor.view.dom as HTMLElement;
    const cs = getComputedStyle(root);
    return root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  };

  const startResize = (handle: Handle) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const frame = imgRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const col = columnWidth() || rect.width;
    const startX = e.clientX, startY = e.clientY;
    const startW = rect.width, startH = rect.height || 1;
    const aspect = startW / startH;
    // Gambar rata kanan/tengah tumbuh ke dua arah, jadi gerakan mouse dihitung ganda.
    const grow = (wrap === 'topBottom' && align === 'center') ? 2 : 1;

    const startWPct = (startW / col) * 100;
    const { zoom } = anchorBox();
    const x0 = offsetX || 0, y0 = offsetY || 0;

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) * (handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0);
      const dy = (ev.clientY - startY) * (handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0);
      const fromX = startW + dx * grow;
      const fromY = (startH + dy * grow) * aspect;
      const next = handle.length === 2 ? Math.max(fromX, fromY) : (dx !== 0 ? fromX : fromY);
      const maxPct = free && !handle.includes('w') ? 100 - x0 : free ? x0 + startWPct : 100;
      const pct = Math.max(MIN_PCT, Math.min(maxPct, Math.round((next / col) * 100)));
      liveRef.current = pct;
      setLiveWidth(pct);
      // Mode bebas: tarik dari kiri/atas → sisi seberang tetap di tempat (seperti Word).
      if (free) {
        const x = handle.includes('w') ? x0 + (startWPct - pct) : x0;
        const newH = ((pct / 100) * col) / aspect;
        const y = handle.includes('n') ? y0 + (startH - newH) / zoom : y0;
        livePosRef.current = { x, y };
        setLivePos({ x, y });
      }
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (liveRef.current !== null) {
        const patch: Record<string, unknown> = { width: `${liveRef.current}%` };
        if (free && livePosRef.current) {
          patch.offsetX = Math.round(livePosRef.current.x * 100) / 100;
          patch.offsetY = Math.round(livePosRef.current.y);
        }
        updateAttributes(patch); // satu langkah Undo
      }
      liveRef.current = null;
      livePosRef.current = null;
      setLiveWidth(null);
      setLivePos(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const shownWidth = liveWidth !== null ? `${liveWidth}%` : width;
  const cls = ['wc-figure', `wc-wrap-${wrapMode}`];
  if (isEmbed) cls.push('wc-embed');
  if (wrapMode !== 'inline') cls.push(`wc-align-${align}`);
  if (styleVariant && styleVariant !== 'none') cls.push(`wc-style-${styleVariant}`);
  const style: CSSProperties = { width: shownWidth };
  if (wrapMode === 'tight' && src) Object.assign(style, { shapeOutside: `url("${src}")`, shapeImageThreshold: 0.3, shapeMargin: '0.75rem' });
  if (free) {
    const p = livePos ?? { x: offsetX || 0, y: offsetY || 0 };
    Object.assign(style, { left: `${p.x}%`, top: `${p.y}px` });
  }

  return (
    <NodeViewWrapper
      as="span"
      className={`${cls.join(' ')} wc-figure-editing ${selected ? 'is-selected' : ''} ${dragging ? 'is-dragging' : ''}`}
      style={style}
      // Mode bebas memakai drag sendiri (mengikuti mouse); drag HTML bawaan dimatikan.
      onDragStart={free ? (e: React.DragEvent) => e.preventDefault() : undefined}
      onPointerDown={free ? startFreeDrag : undefined}
    >
      {snapGuide && <span className={`wc-snap-guide wc-snap-guide-${snapGuide}`} aria-hidden="true" />}
      <span ref={imgRef} className="wc-figure-frame" data-drag-handle={free ? undefined : true}>
        {isEmbed ? (
          <EmbedPreview type={embedType} url={embedUrl} />
        ) : broken ? (
          <span className="wc-img-broken" title={src}>Gambar tidak dapat dimuat</span>
        ) : (
          <img src={src} alt={alt || ''} draggable={false} onError={() => setBroken(true)} />
        )}

        {selected && (
          <>
            {HANDLES.map(h => (
              <span
                key={h}
                data-wc-handle
                contentEditable={false}
                draggable={false}
                onMouseDown={startResize(h)}
                className="wc-img-handle"
                style={HANDLE_POS[h]}
              />
            ))}
            {liveWidth !== null && <span className="wc-img-size-tip">{liveWidth}%</span>}

            {/* Layout Options, seperti tombol kecil di samping gambar di Word */}
            <span className="wc-layout-btn-wrap" data-wc-handle contentEditable={false}>
              <button
                type="button"
                title="Layout Options"
                className="wc-layout-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={() => setMenuOpen(o => !o)}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              {menuOpen && (
                <span className="wc-layout-menu" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <span className="wc-layout-menu-title">Layout Options</span>
                  {WRAP_OPTIONS.filter(opt => !(isEmbed && opt.id === 'tight')).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.hint}
                      className={`wc-layout-item ${wrapMode === opt.id ? 'is-active' : ''}`}
                      onClick={() => { updateAttributes(opt.apply(node.attrs)); setMenuOpen(false); }}
                    >
                      <WrapIcon wrap={opt.id} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </span>
              )}
            </span>
          </>
        )}
      </span>

      {caption !== null && caption !== undefined && (
        <input
          className="wc-caption wc-caption-input"
          value={caption}
          placeholder={isEmbed ? 'Tulis keterangan…' : 'Tulis keterangan gambar…'}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); editor.commands.focus(); }
            if (e.key === 'Backspace' && caption === '') { e.preventDefault(); updateAttributes({ caption: null }); editor.commands.focus(); }
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
