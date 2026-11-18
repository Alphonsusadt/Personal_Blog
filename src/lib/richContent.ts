/**
 * Konten "rich" (HTML gaya Word) vs. konten lama (Markdown).
 *
 * Konten yang ditulis dengan editor ribbon disimpan sebagai HTML dengan penanda
 * RICH_HTML_MARKER di depannya. Penanda ini ikut tersimpan di dalam string konten itu
 * sendiri, sehingga lolos utuh melewati semua jalur yang sudah ada (autosave, draf lokal,
 * terjemahan, backup Supabase, backup/restore) tanpa perlu kolom atau skema baru.
 *
 * Konten tanpa penanda tetap dianggap Markdown dan dirender seperti dulu. Begitu konten
 * lama dibuka dan diedit, editor menyimpannya kembali sebagai HTML (migrasi bertahap).
 */
import DOMPurify from 'dompurify';
import { markdownToEditorHtml } from './markdownConverter';

export const RICH_HTML_MARKER = '<!--wc:html-->';

export function isRichHtml(content: string | null | undefined): boolean {
  return typeof content === 'string' && content.trimStart().startsWith(RICH_HTML_MARKER);
}

export function wrapRichHtml(html: string): string {
  return `${RICH_HTML_MARKER}${html}`;
}

export function unwrapRichHtml(content: string): string {
  const trimmed = content.trimStart();
  return trimmed.startsWith(RICH_HTML_MARKER) ? trimmed.slice(RICH_HTML_MARKER.length) : content;
}

/** HTML untuk dimuat ke editor, apa pun format penyimpanannya. */
export function toEditorHtml(content: string): string {
  if (!content) return '';
  return isRichHtml(content) ? unwrapRichHtml(content) : markdownToEditorHtml(content);
}

/** Tiptap mengeluarkan `<p></p>` untuk dokumen kosong; anggap itu kosong. */
export function isEmptyEditorHtml(html: string): boolean {
  return !html || /^(<p>\s*<\/p>)*$/.test(html.trim());
}

const SKIP_TEXT_TAGS = new Set(['PRE', 'CODE', 'SCRIPT', 'STYLE']);

/**
 * Teks polos dari konten rich (untuk hitung kata, auto-fix, dll.). Kode, rumus, dan
 * embed dilewati. Blok dipisah baris baru supaya kata di blok berbeda tidak menempel.
 */
export function richHtmlToPlainText(content: string): string {
  if (typeof DOMParser === 'undefined') return content.replace(/<[^>]+>/g, ' ');
  const doc = new DOMParser().parseFromString(unwrapRichHtml(content), 'text/html');
  doc.querySelectorAll('pre, .math-block, .math-inline, .tikz-block, .social-embed').forEach(el => el.remove());
  doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, br, div').forEach(el => {
    el.append(doc.createTextNode('\n'));
  });
  return (doc.body.textContent || '').replace(/\u00a0/g, ' ');
}

/** Teks polos dari konten format apa pun (Markdown dikembalikan apa adanya). */
export function contentToPlainText(content: string): string {
  return isRichHtml(content) ? richHtmlToPlainText(content) : content;
}

/**
 * Terapkan koreksi kata (dari /api/auto-fix-text) langsung ke node teks HTML, supaya tag,
 * atribut, dan isi kode/rumus tidak pernah tersentuh.
 */
export function applyWordFixesToRichHtml(content: string, changes: Array<{ from: string; to: string }>): string {
  if (!changes.length) return content;
  const map = new Map<string, string>();
  for (const c of changes) if (c.from && c.to && c.from !== c.to) map.set(c.from, c.to);
  if (!map.size) return content;

  const escaped = [...map.keys()].map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![\\p{L}'])(${escaped.join('|')})(?![\\p{L}'])`, 'gu');

  const doc = new DOMParser().parseFromString(unwrapRichHtml(content), 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    let skip = false;
    for (let p = node.parentElement; p; p = p.parentElement) {
      if (SKIP_TEXT_TAGS.has(p.tagName) || p.classList.contains('math-inline') || p.classList.contains('math-block')) {
        skip = true;
        break;
      }
    }
    if (skip || !node.nodeValue) continue;
    node.nodeValue = node.nodeValue.replace(re, m => map.get(m) ?? m);
  }
  return wrapRichHtml(doc.body.innerHTML);
}

/**
 * Bersihkan HTML yang akan ditampilkan. Atribut style dibiarkan (font, warna, perataan),
 * tapi skrip, handler event, dan URL javascript: dibuang DOMPurify.
 */
export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-equation', 'data-code', 'data-type', 'data-url', 'data-width', 'data-alignment', 'target', 'colspan', 'rowspan', 'colwidth'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input'],
  });
}
