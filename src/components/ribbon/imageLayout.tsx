/**
 * Tata letak gambar bergaya Word: mode "Wrap Text", gaya gambar, dan pengolahan piksel
 * (putar / balik / potong) yang hasilnya diunggah sebagai gambar baru.
 *
 * Putar & balik sengaja mengolah PIKSEL, bukan CSS transform: rotasi CSS tidak memutar
 * kotak tata letaknya, sehingga gambar 90° akan menutupi teks di sekitarnya.
 */
import type { ImageWrap, ImageStyleVariant } from '../../lib/tiptap-extensions';
import { uploadImage } from '../../lib/mediaUploader';
import { API_BASE } from '../../lib/api';

type Attrs = Record<string, any>;

const pct = (w: string | undefined) => parseFloat(w || '100') || 100;

export const WRAP_OPTIONS: Array<{ id: ImageWrap; label: string; hint: string; apply: (a: Attrs) => Attrs }> = [
  {
    id: 'inline',
    label: 'In Line with Text',
    hint: 'Gambar menjadi bagian dari baris teks, seperti satu huruf besar.',
    apply: (a) => ({ wrap: 'inline', width: pct(a.width) > 60 ? '30%' : a.width }),
  },
  {
    id: 'square',
    label: 'Square',
    hint: 'Teks mengalir di samping gambar.',
    apply: (a) => ({ wrap: 'square', align: a.align === 'right' ? 'right' : 'left', width: pct(a.width) > 70 ? '45%' : a.width }),
  },
  {
    id: 'tight',
    label: 'Tight',
    hint: 'Teks mengikuti bentuk gambar (paling bagus untuk PNG berlatar transparan).',
    apply: (a) => ({ wrap: 'tight', align: a.align === 'right' ? 'right' : 'left', width: pct(a.width) > 70 ? '45%' : a.width }),
  },
  {
    id: 'topBottom',
    label: 'Top and Bottom',
    hint: 'Gambar berdiri sendiri; teks di atas dan di bawahnya.',
    apply: (a) => ({ wrap: 'topBottom', align: a.align || 'center' }),
  },
  {
    id: 'front',
    label: 'In Front of Text',
    hint: 'Geser bebas ke mana saja, di atas teks. Di HP otomatis tersusun di antara paragraf.',
    apply: (a) => freePlacement(a, 'front'),
  },
  {
    id: 'behind',
    label: 'Behind Text',
    hint: 'Geser bebas ke mana saja, di belakang teks (seperti watermark). Di HP tersusun di antara paragraf.',
    apply: (a) => freePlacement(a, 'behind'),
  },
];

/** Masuk ke mode bebas mulai dari posisi tampilan sekarang (tidak "melompat"). */
function freePlacement(a: Attrs, wrap: 'front' | 'behind'): Attrs {
  if (a.wrap === 'front' || a.wrap === 'behind') return { wrap };
  const w = Math.min(pct(a.width), 60);
  const x = a.align === 'right' ? 100 - w : a.align === 'center' && a.wrap === 'topBottom' ? (100 - w) / 2 : 0;
  return { wrap, width: `${w}%`, offsetX: Math.round(x * 100) / 100, offsetY: 0 };
}

/** Ikon kecil mode wrap (garis = teks, kotak biru = gambar), mirip ikon Word. */
export function WrapIcon({ wrap, size = 22 }: { wrap: ImageWrap; size?: number }) {
  const line = (y: number, x1: number, x2: number) => <line key={`${y}-${x1}`} x1={x1} y1={y} x2={x2} y2={y} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />;
  let body;
  if (wrap === 'inline') {
    body = <>{line(4, 2, 20)}{line(9, 2, 6)}<rect x="7" y="7" width="6" height="5" rx="1" className="wc-icon-pic" />{line(9, 14, 20)}{line(15, 2, 20)}{line(19, 2, 14)}</>;
  } else if (wrap === 'square') {
    body = <><rect x="2" y="4" width="8" height="9" rx="1" className="wc-icon-pic" />{line(4, 12, 20)}{line(8, 12, 20)}{line(12, 12, 20)}{line(16, 2, 20)}{line(20, 2, 16)}</>;
  } else if (wrap === 'tight') {
    body = <><circle cx="7" cy="9" r="5" className="wc-icon-pic" />{line(4, 13, 20)}{line(9, 14, 20)}{line(14, 13, 20)}{line(18, 2, 20)}</>;
  } else if (wrap === 'front') {
    body = <>{line(4, 2, 20)}{line(9, 2, 20)}{line(14, 2, 20)}{line(19, 2, 20)}<rect x="8" y="6" width="10" height="10" rx="1" className="wc-icon-pic" /></>;
  } else if (wrap === 'behind') {
    body = <><rect x="8" y="6" width="10" height="10" rx="1" className="wc-icon-pic" opacity="0.45" />{line(4, 2, 20)}{line(9, 2, 20)}{line(14, 2, 20)}{line(19, 2, 20)}</>;
  } else {
    body = <>{line(3, 2, 20)}<rect x="6" y="6" width="10" height="9" rx="1" className="wc-icon-pic" />{line(18, 2, 20)}{line(21, 2, 14)}</>;
  }
  return <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">{body}</svg>;
}

export const STYLE_OPTIONS: Array<{ id: ImageStyleVariant; label: string }> = [
  { id: 'none', label: 'Tanpa gaya' },
  { id: 'rounded', label: 'Sudut membulat' },
  { id: 'shadow', label: 'Bayangan' },
  { id: 'border', label: 'Bingkai' },
  { id: 'roundedShadow', label: 'Bulat + bayangan' },
];

/* ---------------------------------------------------------------- Pengolahan piksel */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // perlu agar canvas bisa diekspor (Cloudinary & /uploads mengizinkan CORS)
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gambar tidak bisa dimuat untuk diolah'));
    img.src = src;
  });
}

function mimeFor(src: string): 'image/png' | 'image/jpeg' | 'image/webp' {
  const s = src.toLowerCase().split('?')[0];
  if (s.endsWith('.png') || s.startsWith('data:image/png')) return 'image/png';
  if (s.endsWith('.webp') || s.startsWith('data:image/webp')) return 'image/webp';
  return 'image/jpeg';
}

async function canvasToUploadedUrl(canvas: HTMLCanvasElement, src: string, name: string): Promise<string> {
  const type = mimeFor(src);
  let blob: Blob | null;
  try {
    blob = await new Promise<Blob | null>(r => canvas.toBlob(r, type, 0.92));
  } catch {
    throw new Error('Browser menolak mengolah gambar ini (server gambar tidak mengizinkan CORS)');
  }
  if (!blob) throw new Error('Gagal membuat gambar baru');
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const file = new File([blob], `${name}.${ext}`, { type });
  return uploadImage(file, { apiBaseUrl: API_BASE, maxWidth: 2000, quality: 0.92 });
}

/** Putar 90° (kanan/kiri) atau balik (horizontal/vertikal), lalu unggah sebagai gambar baru. */
export async function transformImage(src: string, op: 'rotateRight' | 'rotateLeft' | 'flipH' | 'flipV'): Promise<string> {
  const img = await loadImage(src);
  const w = img.naturalWidth, h = img.naturalHeight;
  const rotate = op === 'rotateRight' || op === 'rotateLeft';
  const canvas = document.createElement('canvas');
  canvas.width = rotate ? h : w;
  canvas.height = rotate ? w : h;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  if (op === 'rotateRight') ctx.rotate(Math.PI / 2);
  if (op === 'rotateLeft') ctx.rotate(-Math.PI / 2);
  if (op === 'flipH') ctx.scale(-1, 1);
  if (op === 'flipV') ctx.scale(1, -1);
  ctx.drawImage(img, -w / 2, -h / 2);
  return canvasToUploadedUrl(canvas, src, `gambar-${op}`);
}

/** Potong (dalam fraksi 0–1 dari ukuran asli) lalu unggah sebagai gambar baru. */
export async function cropImage(src: string, rect: { x: number; y: number; w: number; h: number }): Promise<string> {
  const img = await loadImage(src);
  const sx = Math.round(rect.x * img.naturalWidth), sy = Math.round(rect.y * img.naturalHeight);
  const sw = Math.max(1, Math.round(rect.w * img.naturalWidth)), sh = Math.max(1, Math.round(rect.h * img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvasToUploadedUrl(canvas, src, 'gambar-crop');
}
