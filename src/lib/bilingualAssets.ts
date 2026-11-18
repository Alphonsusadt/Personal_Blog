/**
 * Aset lintas bahasa (ID ⇄ EN) untuk konten rich (HTML editor ribbon).
 *
 *  - extractAssets      : daftar gambar, embed, tabel, kode, rumus, dan link dari satu versi bahasa,
 *                         lengkap dengan HTML aslinya (wrap, lebar, posisi, caption ikut terbawa).
 *  - placeAssetsLikeSource : salin semua aset ke versi lain di urutan paragraf yang sama.
 *  - mergeTranslatedLayout : setelah translate, pakai lagi tata letak gambar yang sudah diatur
 *                         di bahasa tujuan (dicocokkan lewat URL gambar/embed).
 */
import { isRichHtml, unwrapRichHtml, wrapRichHtml } from './richContent';
import { markdownToEditorHtml } from './markdownConverter';

export type AssetKind = 'image' | 'embed' | 'table' | 'code' | 'math' | 'link';

export interface BilingualAsset {
  kind: AssetKind;
  /** Kunci pencocokan antar bahasa (URL gambar/embed/link, isi kode/rumus/tabel). */
  key: string;
  /** HTML yang disisipkan ke editor. */
  html: string;
  label: string;
  /** URL gambar (thumbnail) atau cuplikan teks. */
  preview: string;
  /** Kalimat di sekitar link (supaya mudah mencari padanannya). */
  context?: string;
  href?: string;
  /** Indeks blok teratas (paragraf/judul/tabel) tempat aset berada. */
  blockIndex: number;
  inline: boolean;
}

const FIGURE_SELECTOR = 'span.wc-figure, div.social-embed, img';
const EMBED_LABEL: Record<string, string> = { youtube: 'Video YouTube', instagram: 'Post Instagram', twitter: 'Post X' };

/** HTML editor dari konten tersimpan (rich atau Markdown lama). */
export function contentToEditorHtml(content: string): string {
  if (!content || !content.trim()) return '';
  return isRichHtml(content) ? unwrapRichHtml(content) : markdownToEditorHtml(content);
}

function parse(html: string): HTMLElement {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
}

function topIndex(body: HTMLElement, el: Element): number {
  let node: Element | null = el;
  while (node && node.parentElement !== body) node = node.parentElement;
  return node ? Array.prototype.indexOf.call(body.children, node) : -1;
}

/** Elemen gambar/embed "utama" (bukan <img> di dalam .wc-figure). */
function figures(body: HTMLElement): HTMLElement[] {
  return Array.from(body.querySelectorAll<HTMLElement>(FIGURE_SELECTOR)).filter(el =>
    !(el.tagName === 'IMG' && el.closest('.wc-figure')),
  );
}

function figureKey(el: HTMLElement): string | null {
  const embed = el.matches('.social-embed') ? el : el.querySelector('.social-embed');
  if (embed) {
    const url = embed.getAttribute('data-url');
    return url ? `embed:${url.trim()}` : null;
  }
  const img = el.tagName === 'IMG' ? el : el.querySelector('img');
  const src = img?.getAttribute('src');
  return src ? `img:${src}` : null;
}

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

function shortName(src: string): string {
  if (src.startsWith('data:')) return 'Gambar';
  try { return decodeURIComponent(new URL(src, location.href).pathname.split('/').pop() || 'Gambar'); } catch { return 'Gambar'; }
}

function sentenceAround(a: HTMLElement): string {
  const block = a.closest('p, li, h1, h2, h3, h4, blockquote, td, th') || a.parentElement;
  if (!block) return '';
  // Keterangan gambar di paragraf yang sama bukan bagian kalimatnya.
  const copy = block.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.wc-figure, .social-embed').forEach(el => el.remove());
  const text = (copy.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

/** Semua aset dari satu versi bahasa, urut sesuai posisinya di tulisan. */
export function extractAssets(content: string): BilingualAsset[] {
  const html = contentToEditorHtml(content);
  if (!html || typeof DOMParser === 'undefined') return [];
  const body = parse(html);
  const out: Array<BilingualAsset & { order: number }> = [];
  const all = Array.from(body.querySelectorAll('*'));
  const order = (el: Element) => all.indexOf(el);

  for (const el of figures(body)) {
    const key = figureKey(el);
    if (!key) continue;
    const isEmbed = key.startsWith('embed:');
    const media = isEmbed ? (el.matches('.social-embed') ? el : el.querySelector('.social-embed'))! : (el.tagName === 'IMG' ? el : el.querySelector('img'))!;
    const caption = el.querySelector('.wc-caption')?.textContent?.trim();
    const label = isEmbed
      ? (EMBED_LABEL[media.getAttribute('data-type') || ''] ?? 'Embed')
      : (caption || media.getAttribute('alt') || shortName(media.getAttribute('src') || ''));
    out.push({
      kind: isEmbed ? 'embed' : 'image',
      key,
      html: el.outerHTML,
      label,
      preview: isEmbed ? (media.getAttribute('data-url') || '') : (media.getAttribute('src') || ''),
      blockIndex: topIndex(body, el),
      inline: el.tagName !== 'DIV',
      order: order(el),
    });
  }

  for (const table of Array.from(body.querySelectorAll('table'))) {
    const rows = table.rows.length;
    const cols = table.rows[0]?.cells.length ?? 0;
    const text = (table.textContent || '').replace(/\s+/g, ' ').trim();
    out.push({
      // Kunci dari isi sel (bukan HTML): editor menulis ulang atribut tabel (colwidth, dll.).
      kind: 'table', key: `table:${rows}x${cols}:${hash(Array.from(table.querySelectorAll('td, th')).map(c => (c.textContent || '').trim()).join('\u0001'))}`, html: table.outerHTML,
      label: `Tabel ${rows}×${cols}`, preview: text.slice(0, 120),
      blockIndex: topIndex(body, table), inline: false, order: order(table),
    });
  }

  for (const pre of Array.from(body.querySelectorAll('pre'))) {
    const code = pre.textContent || '';
    const lang = Array.from(pre.querySelector('code')?.classList || []).find(c => c.startsWith('language-'))?.slice(9);
    out.push({
      kind: 'code', key: `code:${hash(code)}`, html: pre.outerHTML,
      label: lang ? `Kode ${lang}` : 'Blok kode', preview: code.trim().slice(0, 140),
      blockIndex: topIndex(body, pre), inline: false, order: order(pre),
    });
  }

  for (const m of Array.from(body.querySelectorAll<HTMLElement>('.math-block, .tikz-block'))) {
    const eq = m.getAttribute('data-equation') || m.getAttribute('data-code') || '';
    const tikz = m.classList.contains('tikz-block');
    out.push({
      kind: 'math', key: `math:${hash(eq)}`, html: m.outerHTML,
      label: tikz ? 'Diagram TikZ' : 'Rumus', preview: eq.slice(0, 120),
      blockIndex: topIndex(body, m), inline: false, order: order(m),
    });
  }

  const seenLinks = new Set<string>();
  for (const a of Array.from(body.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || seenLinks.has(href)) continue;
    seenLinks.add(href);
    out.push({
      kind: 'link', key: `link:${href}`, html: a.outerHTML, href,
      label: (a.textContent || href).trim(), preview: href, context: sentenceAround(a),
      blockIndex: topIndex(body, a), inline: true, order: order(a),
    });
  }

  return out.sort((a, b) => a.order - b.order).map(({ order: _o, ...rest }) => rest);
}

/** Kunci semua aset yang sudah ada di satu versi bahasa (untuk tanda ✓ "sudah dipakai"). */
export function assetKeys(content: string): Set<string> {
  return new Set(extractAssets(content).map(a => a.key));
}

const TEXTBLOCK = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

/**
 * Taruh semua aset bahasa sumber yang belum ada di bahasa tujuan pada paragraf dengan
 * urutan yang sama (paragraf ke-3 di ID → paragraf ke-3 di EN). Link tidak ikut, karena
 * link menempel pada kata tertentu yang berbeda tiap bahasa.
 */
export function placeAssetsLikeSource(sourceContent: string, targetContent: string): { html: string; added: number } {
  const targetHtml = contentToEditorHtml(targetContent);
  const body = parse(targetHtml);
  const have = assetKeys(targetContent);
  const assets = extractAssets(sourceContent).filter(a => a.kind !== 'link' && !have.has(a.key));
  const blocks = Array.from(body.children);
  const doc = body.ownerDocument;

  // Dari belakang ke depan, supaya sisipan blok tidak menggeser indeks blok sebelumnya.
  const sorted = assets.map((a, i) => ({ a, i })).sort((x, y) => (y.a.blockIndex - x.a.blockIndex) || (y.i - x.i));
  for (const { a } of sorted) {
    const holder = doc.createElement('div');
    holder.innerHTML = a.html;
    const node = holder.firstElementChild;
    if (!node) continue;
    const idx = Math.max(0, a.blockIndex);
    const target = idx < blocks.length ? blocks[idx] : null;
    if (a.inline && node.tagName !== 'DIV') {
      if (target && TEXTBLOCK.has(target.tagName)) {
        target.insertBefore(node, target.firstChild);
      } else {
        const p = doc.createElement('p');
        p.appendChild(node);
        target ? body.insertBefore(p, target) : body.appendChild(p);
      }
    } else if (target) {
      body.insertBefore(node, target);
    } else {
      body.appendChild(node);
    }
  }
  return { html: body.innerHTML, added: assets.length };
}

/**
 * Gabungkan hasil translate dengan tata letak yang sudah diatur di bahasa tujuan:
 *  - gambar/embed yang sama (URL sama) memakai wrap, lebar, posisi, gaya, dan caption lama;
 *  - gambar/embed yang hanya ada di bahasa tujuan (ditambah manual) tidak hilang, tetapi
 *    ditaruh lagi di urutan paragraf yang sama.
 * Kedua argumen dan hasilnya = konten tersimpan (dengan penanda <!--wc:html-->).
 */
export function mergeTranslatedLayout(translated: string, previousTarget: string): string {
  if (!isRichHtml(translated) || !previousTarget || !previousTarget.trim()) return translated;
  const prevBody = parse(contentToEditorHtml(previousTarget));
  const prevFigs = figures(prevBody);
  if (!prevFigs.length) return translated;

  const pool = new Map<string, HTMLElement[]>();
  for (const f of prevFigs) {
    const k = figureKey(f);
    if (!k) continue;
    if (!pool.has(k)) pool.set(k, []);
    pool.get(k)!.push(f);
  }

  const body = parse(unwrapRichHtml(translated));
  for (const f of figures(body)) {
    const k = figureKey(f);
    const mine = k ? pool.get(k)?.shift() : undefined;
    if (!mine) continue;
    // Embed/gambar lama (div/img polos) di dalam paragraf hasil translate tetap aman: diganti utuh.
    f.replaceWith(mine.cloneNode(true));
  }

  // Sisa = aset yang hanya ada di bahasa tujuan → kembalikan ke urutan paragraf semula.
  const leftovers = [...pool.values()].flat();
  if (leftovers.length) {
    const blocks = Array.from(body.children);
    const doc = body.ownerDocument;
    for (const f of leftovers.reverse()) {
      const idx = topIndex(prevBody, f);
      const target = idx >= 0 && idx < blocks.length ? blocks[idx] : null;
      const node = f.cloneNode(true) as HTMLElement;
      if (node.tagName === 'DIV') { target ? body.insertBefore(node, target) : body.appendChild(node); continue; }
      if (target && TEXTBLOCK.has(target.tagName)) target.insertBefore(node, target.firstChild);
      else {
        const p = doc.createElement('p');
        p.appendChild(node);
        target ? body.insertBefore(p, target) : body.appendChild(p);
      }
    }
  }
  return wrapRichHtml(body.innerHTML);
}

/** True bila konten berisi sesuatu (teks atau aset), bukan sekadar paragraf kosong. */
export function hasMeaningfulContent(content: string | undefined | null): boolean {
  if (!content || !content.trim()) return false;
  if (!isRichHtml(content)) return true;
  const body = parse(unwrapRichHtml(content));
  return !!(body.textContent || '').trim() || !!body.querySelector('img, .social-embed, table, pre, .math-block, .tikz-block');
}
