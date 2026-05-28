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
 * Custom Image extension that parses and handles image alignment (float: left/right/center)
 * and custom widths (33%, 50%, 75%, 100%).
 */
export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: (element) => {
          return element.style.width || element.getAttribute('width') || '100%';
        },
        renderHTML: (attributes) => {
          return {
            style: `width: ${attributes.width}; max-width: 100%; height: auto;`,
          };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: (element) => {
          const float = element.style.float;
          if (float === 'left') return 'left';
          if (float === 'right') return 'right';
          return 'center';
        },
        renderHTML: (attributes) => {
          let style = '';
          if (attributes.alignment === 'left') {
            style = 'float: left; margin: 0.5rem 1.5rem 1.5rem 0;';
          } else if (attributes.alignment === 'right') {
            style = 'float: right; margin: 0.5rem 0 1.5rem 1.5rem;';
          } else {
            style = 'display: block; margin: 1.5rem auto; float: none;';
          }
          return {
            style,
          };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
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
