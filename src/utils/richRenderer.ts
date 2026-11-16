/**
 * Render konten rich (HTML dari editor ribbon) untuk halaman publik dan preview admin.
 *
 * Alurnya: sanitasi (DOMPurify) → node khusus editor diganti hasil render-nya
 * (KaTeX untuk rumus, Prism untuk kode, iframe/blockquote untuk embed sosial) →
 * TikZ dan Mermaid dipisah sebagai "part" sendiri karena halaman publik merendernya
 * lewat komponen React (TikzDiagram / MermaidDiagram).
 */
import { sanitizeRichHtml, unwrapRichHtml } from '../lib/richContent';
import { renderCodeBlockHtml } from './renderers';
import { renderSocialEmbedTags } from '../lib/socialEmbed';
import { embedMarkup } from '../lib/embedMedia';

export interface RichContentPart {
  type: 'html' | 'mermaid' | 'tikz';
  content: string;
  index: number;
}

let katexModule: typeof import('katex') | null = null;
async function getKatex() {
  if (!katexModule) katexModule = await import('katex');
  return katexModule.default;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function codeLanguage(pre: Element): string {
  const code = pre.querySelector('code');
  const langClass = code ? Array.from(code.classList).find(c => c.startsWith('language-')) : undefined;
  return langClass ? langClass.slice('language-'.length).toLowerCase() : '';
}

async function renderSpecialNodes(root: HTMLElement): Promise<void> {
  const doc = root.ownerDocument;

  const mathNodes = root.querySelectorAll<HTMLElement>('.math-block, .math-inline');
  if (mathNodes.length) {
    const katex = await getKatex();
    mathNodes.forEach(el => {
      const display = el.classList.contains('math-block');
      const tex = el.getAttribute('data-equation') || '';
      const wrapper = doc.createElement(display ? 'div' : 'span');
      if (display) wrapper.className = 'my-6 overflow-x-auto';
      try {
        wrapper.innerHTML = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' });
      } catch {
        wrapper.textContent = tex;
      }
      el.replaceWith(wrapper);
    });
  }

  for (const pre of Array.from(root.querySelectorAll('pre'))) {
    const lang = codeLanguage(pre);
    if (lang === 'mermaid') continue;
    const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
    const holder = doc.createElement('div');
    holder.innerHTML = await renderCodeBlockHtml(lang, code);
    pre.replaceWith(...Array.from(holder.childNodes));
  }

  // Embed bergaya gambar (di dalam paragraf): diganti markup inline (span + iframe).
  root.querySelectorAll<HTMLElement>('.wc-embed span.social-embed').forEach(el => {
    const holder = doc.createElement('span');
    holder.innerHTML = embedMarkup(el.getAttribute('data-type') || '', el.getAttribute('data-url') || '');
    el.replaceWith(...Array.from(holder.childNodes));
  });

  // Embed format lama (blok <div> mengambang).
  root.querySelectorAll<HTMLElement>('div.social-embed').forEach(el => {
    // Bangun ulang tag dengan urutan atribut yang dikenali renderSocialEmbedTags.
    const tag = `<div class="social-embed" data-type="${escapeAttr(el.getAttribute('data-type') || '')}" data-url="${escapeAttr(el.getAttribute('data-url') || '')}" data-width="${escapeAttr(el.getAttribute('data-width') || '100%')}" data-alignment="${escapeAttr(el.getAttribute('data-alignment') || 'center')}" style="${escapeAttr(el.getAttribute('style') || '')}"></div>`;
    const holder = doc.createElement('div');
    holder.innerHTML = renderSocialEmbedTags(tag);
    el.replaceWith(...Array.from(holder.childNodes));
  });

  root.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });

  root.querySelectorAll('img').forEach(img => {
    img.setAttribute('loading', 'lazy');
  });

  // Tabel (lebar kolom bisa tetap dalam px) digulir di dalam wadahnya sendiri, supaya
  // halaman di HP tidak ikut melebar dan bisa digeser ke samping.
  root.querySelectorAll('table').forEach(table => {
    if (table.parentElement?.classList.contains('rich-table-scroll')) return;
    const wrap = doc.createElement('div');
    wrap.className = 'rich-table-scroll';
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });
}

/** Pecah konten rich menjadi part HTML / TikZ / Mermaid, siap dirender. */
export async function renderRichContentParts(content: string): Promise<RichContentPart[]> {
  const clean = sanitizeRichHtml(unwrapRichHtml(content));
  const doc = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html');
  const parts: RichContentPart[] = [];
  let buffer = doc.createElement('div');
  let partIndex = 0;
  let tikzIndex = 0;
  let mermaidIndex = 0;

  const flush = async () => {
    if (!buffer.childNodes.length) return;
    await renderSpecialNodes(buffer);
    parts.push({ type: 'html', content: buffer.innerHTML, index: partIndex++ });
    buffer = doc.createElement('div');
  };

  for (const node of Array.from(doc.body.childNodes)) {
    if (node instanceof HTMLElement && node.classList.contains('tikz-block')) {
      await flush();
      parts.push({ type: 'tikz', content: node.getAttribute('data-code') || '', index: tikzIndex++ });
      partIndex++;
    } else if (node instanceof HTMLElement && node.tagName === 'PRE' && codeLanguage(node) === 'mermaid') {
      await flush();
      parts.push({ type: 'mermaid', content: (node.textContent || '').trim(), index: mermaidIndex++ });
      partIndex++;
    } else {
      buffer.appendChild(node);
    }
  }
  await flush();
  return parts;
}

/** Versi satu-string (untuk preview admin yang memakai dangerouslySetInnerHTML biasa). */
export async function renderRichContentToHtml(content: string): Promise<string> {
  const parts = await renderRichContentParts(content);
  let html = '';
  for (const part of parts) {
    if (part.type === 'html') {
      html += part.content;
    } else if (part.type === 'tikz') {
      let code = part.content.trim();
      if (!code.includes('\\begin{tikzpicture}')) code = `\\begin{tikzpicture}\n${code}\n\\end{tikzpicture}`;
      html += `<div class="tikz-diagram-wrapper my-8 flex justify-center"><script type="text/tikz">${code}</script></div>`;
    } else {
      try {
        const mermaid = (await import('mermaid')).default;
        const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).slice(2, 11)}`, part.content);
        html += `<div class="mermaid">${svg}</div>`;
      } catch {
        html += '<div class="text-red-500">Error rendering diagram</div>';
      }
    }
  }
  return `<div class="rich-content">${html}</div>`;
}
