import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SocialEmbedView } from '../components/SocialEmbedView';
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

/**
 * Custom Tiptap Node for rich social media embeds (YouTube, Instagram, X/Twitter).
 */
export const SocialEmbed = Node.create({
  name: 'socialEmbed',
  group: 'block',
  atom: true, // This is a leaf node, user cannot edit text inside it directly

  addAttributes() {
    return {
      url: {
        default: '',
      },
      type: {
        default: '', // 'youtube' | 'instagram' | 'twitter'
      },
      width: {
        default: '100%', // '33%' | '50%' | '75%' | '100%'
      },
      alignment: {
        default: 'center', // 'left' | 'center' | 'right'
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.social-embed',
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          return {
            url: element.getAttribute('data-url') || '',
            type: element.getAttribute('data-type') || '',
            width: element.getAttribute('data-width') || '100%',
            alignment: element.getAttribute('data-alignment') || 'center',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { type, url, width, alignment } = HTMLAttributes;
    let float = 'none';
    let margin = '1.5rem auto';
    let display = 'block';
    
    if (alignment === 'left') {
      float = 'left';
      margin = '0.5rem 1.5rem 1.5rem 0';
    } else if (alignment === 'right') {
      float = 'right';
      margin = '0.5rem 0 1.5rem 1.5rem';
    }
    
    const style = `width: ${width}; float: ${float}; margin: ${margin}; display: ${display}; max-width: 100%;`;
    
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'social-embed',
        'data-type': type,
        'data-url': url,
        'data-width': width,
        'data-alignment': alignment,
        style,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SocialEmbedView);
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
