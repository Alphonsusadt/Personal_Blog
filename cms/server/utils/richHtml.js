/**
 * Terjemahan konten rich (HTML dari editor ribbon) tanpa merusak strukturnya.
 *
 * Konten rich disimpan sebagai HTML berpenanda RICH_HTML_MARKER (lihat src/lib/richContent.ts).
 * Model AI tidak bisa diandalkan menjaga tag HTML (terbukti membuang <mark> dan <a>), jadi:
 *
 *  1. protectRichHtml  — blok yang TIDAK boleh diterjemahkan (kode, rumus, TikZ, gambar,
 *                         embed, kode inline) diganti elemen kosong <span class="notranslate"
 *                         data-wc-keep="N">, yang juga dihormati Google Translate mode html.
 *  2. segmentRichHtml  — HTML dipecah menjadi tag dan potongan TEKS. Hanya potongan teks
 *                         yang dikirim ke AI, sebagai array; tag tidak pernah disentuh AI.
 *  3. rebuildRichHtml  — hasil terjemahan dipasang kembali di posisi teks semula.
 *  4. restoreRichHtml  — elemen keep dikembalikan menjadi blok aslinya.
 *
 * Bila jumlah potongan/blok dari penerjemah tidak cocok, pemanggil menolak hasilnya
 * sehingga konten yang rusak tidak pernah tersimpan.
 */

export const RICH_HTML_MARKER = '<!--wc:html-->';

export function isRichHtml(text) {
  return typeof text === 'string' && text.trimStart().startsWith(RICH_HTML_MARKER);
}

export function unwrapRichHtml(text) {
  const t = text.trimStart();
  return t.startsWith(RICH_HTML_MARKER) ? t.slice(RICH_HTML_MARKER.length) : text;
}

// Urutan penting: blok luar (pre) dulu, baru kode inline di luar pre.
const PROTECTED = [
  /<pre\b[\s\S]*?<\/pre>/gi,
  /<div class="(?:math-block|tikz-block|social-embed)"[^>]*>[\s\S]*?<\/div>/gi,
  /<span class="math-inline"[^>]*>[\s\S]*?<\/span>/gi,
  /<img\b[^>]*>/gi,
  /<code\b[^>]*>[\s\S]*?<\/code>/gi,
];

const keepTag = (i) => `<span class="notranslate" translate="no" data-wc-keep="${i}"></span>`;
const KEEP_RE = /<span\b[^>]*\bdata-wc-keep="(\d+)"[^>]*>\s*<\/span>/gi;

/** @returns {{ html: string, keeps: string[] }} HTML tanpa penanda, blok terlindungi. */
export function protectRichHtml(text) {
  let html = unwrapRichHtml(text);
  const keeps = [];
  for (const re of PROTECTED) {
    html = html.replace(re, (m) => {
      keeps.push(m);
      return keepTag(keeps.length - 1);
    });
  }
  return { html, keeps };
}

/** @returns {{ html: string, missing: number[] }} */
export function restoreRichHtml(html, keeps) {
  const seen = new Set();
  const out = html.replace(KEEP_RE, (m, i) => {
    const idx = Number(i);
    if (keeps[idx] === undefined) return m;
    seen.add(idx);
    return keeps[idx];
  });
  const missing = keeps.map((_, i) => i).filter(i => !seen.has(i));
  return { html: out, missing };
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#039;': "'", '&apos;': "'", '&nbsp;': ' ' };
function decodeEntities(s) {
  return s
    .replace(/&(amp|lt|gt|quot|#39|#039|apos|nbsp);/g, (m) => ENTITIES[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function encodeText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
}

/**
 * Pecah HTML (yang sudah diproteksi) menjadi tag dan potongan teks.
 * @returns {{ parts: string[], slots: Array<{ i: number, lead: string, trail: string }>, texts: string[] }}
 */
export function segmentRichHtml(html) {
  const parts = html.split(/(<[^>]+>)/);
  const slots = [];
  const texts = [];
  parts.forEach((p, i) => {
    if (i % 2 === 1) return; // indeks ganjil = tag
    const m = p.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core = m[2];
    if (!core || !/[\p{L}\p{N}]/u.test(decodeEntities(core))) return; // spasi/tanda baca saja
    slots.push({ i, lead: m[1], trail: m[3] });
    texts.push(decodeEntities(core));
  });
  return { parts, slots, texts };
}

export function rebuildRichHtml(seg, translated) {
  const parts = [...seg.parts];
  seg.slots.forEach((slot, k) => {
    parts[slot.i] = slot.lead + encodeText(String(translated[k] ?? '').trim()) + slot.trail;
  });
  return parts.join('');
}

/** Array terjemahan valid bila panjangnya sama dan setiap item berupa string tak kosong. */
export function isValidSegmentArray(arr, expectedLength) {
  return Array.isArray(arr)
    && arr.length === expectedLength
    && arr.every(x => typeof x === 'string' && x.trim().length > 0);
}

/** Ambil array JSON pertama dari jawaban model (yang kadang dibungkus teks/```json). */
export function parseJsonArray(text) {
  if (typeof text !== 'string') return null;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export const SEGMENT_RULE = `
Some JSON values are ARRAYS of text segments taken, in order, from one formatted document (the formatting is kept separately).
For every such array: translate each element on its own and return an array with EXACTLY the same number of elements, in the same order.
Never merge, split, drop, or add elements. Never add HTML or Markdown. A segment may be a sentence fragment; translate it so the fragments still read naturally when joined in order.`;
