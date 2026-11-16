import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageNodeView } from '../components/ImageNodeView';
import CodeBlock from '@tiptap/extension-code-block';
import { CodeBlockNodeView } from '../components/CodeBlockNodeView';
import { MathBlockNodeView } from '../components/MathBlockNodeView';
import { MathInlineNodeView } from '../components/MathInlineNodeView';
import { TikzBlockNodeView } from '../components/TikzBlockNodeView';

/**
 * Gambar bergaya Word: ditambatkan di dalam paragraf (node inline), dengan mode
 * "Wrap Text" seperti Word. HTML yang disimpan:
 *
 *   <span class="wc-figure wc-wrap-square wc-align-left wc-style-rounded" style="width: 40%">
 *     <img src alt>
 *     <span class="wc-caption">Keterangan</span>   (opsional)
 *   </span>
 *
 * Tata letaknya murni lewat class + CSS (.wc-figure di index.css), jadi tampilan editor =
 * tampilan publik, dan di HP gambar mengambang otomatis jadi lebar penuh.
 * Gambar lama (<img style="float: …">) dibaca ke model ini saat dibuka di editor.
 */
export type ImageWrap = 'inline' | 'square' | 'tight' | 'topBottom' | 'front' | 'behind';
/** Mode bebas (seperti In Front of / Behind Text di Word): posisi persis lewat offsetX/offsetY. */
export const FREE_WRAPS: ImageWrap[] = ['front', 'behind'];
export const isFreeWrap = (w: unknown) => w === 'front' || w === 'behind';
export type ImageAlign = 'left' | 'center' | 'right';
export type ImageStyleVariant = 'none' | 'rounded' | 'shadow' | 'border' | 'roundedShadow';

export const IMAGE_WRAPS: ImageWrap[] = ['inline', 'square', 'tight', 'topBottom', 'front', 'behind'];

function legacyLayout(img: HTMLElement): { wrap: ImageWrap; align: ImageAlign } {
  const float = img.style.float;
  if (float === 'left' || float === 'right') return { wrap: 'square', align: float };
  return { wrap: 'topBottom', align: 'center' };
}

function figureAttrs(figure: HTMLElement) {
  const img = figure.querySelector('img');
  if (!img) return false;
  const cls = figure.classList;
  const wrap = IMAGE_WRAPS.find(w => cls.contains(`wc-wrap-${w}`)) ?? 'topBottom';
  const align = (['left', 'center', 'right'] as ImageAlign[]).find(a => cls.contains(`wc-align-${a}`)) ?? 'center';
  const styleVariant = (['rounded', 'shadow', 'border', 'roundedShadow'] as ImageStyleVariant[]).find(s => cls.contains(`wc-style-${s}`)) ?? 'none';
  const caption = figure.querySelector('.wc-caption');
  return {
    src: img.getAttribute('src'),
    alt: img.getAttribute('alt'),
    title: img.getAttribute('title'),
    width: figure.style.width || '100%',
    // Posisi bebas: % lebar kolom dari kiri, px dari atas paragraf tambatan.
    offsetX: parseFloat(figure.style.left) || 0,
    offsetY: parseFloat(figure.style.top) || 0,
    wrap,
    align,
    styleVariant,
    caption: caption ? caption.textContent ?? '' : null,
  };
}

export const CustomImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: '100%' },
      wrap: { default: 'topBottom' },
      align: { default: 'center' },
      styleVariant: { default: 'none' },
      // null = tanpa keterangan; '' = keterangan aktif tapi masih kosong.
      caption: { default: null },
      offsetX: { default: 0 },
      offsetY: { default: 0 },
    };
  },

  parseHTML() {
    return [
      { tag: 'span.wc-figure', priority: 60, getAttrs: (el) => figureAttrs(el as HTMLElement) },
      {
        tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
        getAttrs: (el) => {
          const img = el as HTMLElement;
          const { wrap, align } = legacyLayout(img);
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: img.style.width || (img.getAttribute('width')?.endsWith('%') ? img.getAttribute('width') : null) || '100%',
            wrap,
            align,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, title, width, wrap, align, styleVariant, caption, offsetX, offsetY } = node.attrs;
    const cls = ['wc-figure', `wc-wrap-${wrap}`];
    if (wrap !== 'inline') cls.push(`wc-align-${align}`);
    if (styleVariant && styleVariant !== 'none') cls.push(`wc-style-${styleVariant}`);
    let style = `width: ${width}`;
    if (isFreeWrap(wrap)) style += `; left: ${Math.round((offsetX || 0) * 100) / 100}%; top: ${Math.round(offsetY || 0)}px`;
    // Tight: teks mengikuti bentuk gambar (butuh PNG transparan; selain itu = Square).
    if (wrap === 'tight' && src) style += `; shape-outside: url("${String(src).replace(/"/g, '%22')}"); shape-image-threshold: 0.3; shape-margin: 0.75rem`;
    const imgAttrs: Record<string, string> = { src };
    if (alt) imgAttrs.alt = alt;
    if (title) imgAttrs.title = title;
    const children: any[] = [['img', imgAttrs]];
    if (caption !== null && caption !== undefined) children.push(['span', { class: 'wc-caption' }, caption]);
    return ['span', { class: cls.join(' '), style }, ...children];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView, {
      // Input keterangan di dalam gambar harus menerima ketikan sendiri, bukan editor.
      stopEvent: ({ event }) => {
        const t = event.target as HTMLElement | null;
        if (!t) return false;
        // Gambar bebas (In Front of / Behind Text) digeser oleh NodeView sendiri, mengikuti
        // mouse; drag bawaan ProseMirror (pindah ke posisi teks) tidak boleh ikut berjalan.
        if (event.type.startsWith('drag') && t.closest?.('.wc-wrap-front, .wc-wrap-behind')) return true;
        return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || !!t.closest?.('[data-wc-handle]');
      },
    });
  },
});

/** Lebar awal embed: video selebar kolom, kartu post (IG/X) lebih ramping seperti aslinya. */
export const defaultEmbedWidth = (type: string) => (type === 'youtube' ? '100%' : '60%');

/** Atribut awal embed baru (dipakai paste URL, Insert → Embed, dan tautan). */
export function newEmbedAttrs(url: string, type: string) {
  return { url: url.trim(), type, width: defaultEmbedWidth(type), wrap: 'topBottom', align: 'center' };
}

/**
 * Embed YouTube / Instagram / X yang bisa ditata persis seperti gambar: Wrap Text, geser
 * bebas, resize, gaya bingkai, dan keterangan. HTML yang disimpan (semua inline, karena
 * berada di dalam paragraf):
 *
 *   <span class="wc-figure wc-embed wc-wrap-square wc-align-right" style="width: 45%">
 *     <span class="social-embed" data-type="youtube" data-url="…"></span>
 *     <span class="wc-caption">Keterangan</span>   (opsional)
 *   </span>
 *
 * Halaman publik mengganti span.social-embed dengan iframe (lihat richRenderer).
 * Embed lama (<div class="social-embed" data-alignment>) dibaca ke model ini saat dibuka.
 */
export const SocialEmbed = Node.create({
  name: 'socialEmbed',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: '' },
      type: { default: '' }, // 'youtube' | 'instagram' | 'twitter'
      width: { default: '100%' },
      wrap: { default: 'topBottom' },
      align: { default: 'center' },
      styleVariant: { default: 'none' },
      caption: { default: null },
      offsetX: { default: 0 },
      offsetY: { default: 0 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.wc-embed',
        priority: 70, // sebelum aturan span.wc-figure milik gambar
        getAttrs: (el) => {
          const fig = el as HTMLElement;
          const media = fig.querySelector('.social-embed');
          if (!media) return false;
          const cls = fig.classList;
          const caption = fig.querySelector('.wc-caption');
          return {
            url: media.getAttribute('data-url') || '',
            type: media.getAttribute('data-type') || '',
            width: fig.style.width || '100%',
            wrap: IMAGE_WRAPS.find(w => cls.contains(`wc-wrap-${w}`)) ?? 'topBottom',
            align: (['left', 'center', 'right'] as ImageAlign[]).find(a => cls.contains(`wc-align-${a}`)) ?? 'center',
            styleVariant: (['rounded', 'shadow', 'border', 'roundedShadow'] as ImageStyleVariant[]).find(s => cls.contains(`wc-style-${s}`)) ?? 'none',
            caption: caption ? caption.textContent ?? '' : null,
            offsetX: parseFloat(fig.style.left) || 0,
            offsetY: parseFloat(fig.style.top) || 0,
          };
        },
      },
      {
        // Format lama (blok mengambang). Rata kiri/kanan = Square, selain itu = Top and Bottom.
        tag: 'div.social-embed',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const a = el.getAttribute('data-alignment');
          const side = a === 'left' || a === 'right';
          return {
            url: el.getAttribute('data-url') || '',
            type: el.getAttribute('data-type') || '',
            width: el.getAttribute('data-width') || '100%',
            wrap: side ? 'square' : 'topBottom',
            align: side ? a : 'center',
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { url, type, width, wrap, align, styleVariant, caption, offsetX, offsetY } = node.attrs;
    const w = wrap === 'tight' ? 'square' : wrap; // Tight butuh bentuk gambar; embed = kotak
    const cls = ['wc-figure', 'wc-embed', `wc-wrap-${w}`];
    if (w !== 'inline') cls.push(`wc-align-${align}`);
    if (styleVariant && styleVariant !== 'none') cls.push(`wc-style-${styleVariant}`);
    let style = `width: ${width}`;
    if (isFreeWrap(w)) style += `; left: ${Math.round((offsetX || 0) * 100) / 100}%; top: ${Math.round(offsetY || 0)}px`;
    const children: any[] = [['span', { class: 'social-embed', 'data-type': type, 'data-url': url }]];
    if (caption !== null && caption !== undefined) children.push(['span', { class: 'wc-caption' }, caption]);
    return ['span', { class: cls.join(' '), style }, ...children];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView, {
      stopEvent: ({ event }) => {
        const t = event.target as HTMLElement | null;
        if (!t) return false;
        if (event.type.startsWith('drag') && t.closest?.('.wc-wrap-front, .wc-wrap-behind')) return true;
        return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || !!t.closest?.('[data-wc-handle]');
      },
    });
  },
});

/**
 * Custom Tiptap Code Block extension that renders our visual CodeBlockNodeView inside the editor.
 */
export const CustomCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
});

/**
 * Custom Tiptap Node for LaTeX Block Equations ($$...$$).
 */
export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      equation: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.math-block',
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          return {
            equation: element.getAttribute('data-equation') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { equation } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'math-block',
        'data-equation': equation,
      }),
      `$$${equation}$$`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockNodeView);
  },
});

/**
 * Custom Tiptap Node for LaTeX Inline Equations ($...$).
 */
export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      equation: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.math-inline',
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          return {
            equation: element.getAttribute('data-equation') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { equation } = HTMLAttributes;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'math-inline',
        'data-equation': equation,
      }),
      `$${equation}$`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineNodeView);
  },
});

/**
 * Custom Tiptap Node for LaTeX TikZ Diagrams (```tikz ... ```).
 */
export const TikzBlock = Node.create({
  name: 'tikzBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      code: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.tikz-block',
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          return {
            code: element.getAttribute('data-code') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { code } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'tikz-block',
        'data-code': code,
      }),
      `\\begin{tikzpicture}\n${code}\n\\end{tikzpicture}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TikzBlockNodeView);
  },
});
