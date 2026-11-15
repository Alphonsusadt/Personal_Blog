/**
 * Tab / indentasi paragraf seperti Microsoft Word.
 *
 * Tanpa ini, Tab di paragraf biasa tidak ditangkap editor, sehingga browser memindahkan
 * fokus keluar editor (bug: tidak bisa membuat paragraf cerita yang menjorok).
 *
 *  - Tab di AWAL paragraf → indentasi baris pertama (text-indent), Tab berikutnya →
 *    seluruh paragraf bergeser (margin-left), seperti AutoCorrect indentasi di Word.
 *  - Tab di TENGAH teks → karakter tab (ditampilkan lewat white-space: pre-wrap).
 *  - Shift+Tab di awal → mundur satu langkah; Backspace di awal paragraf yang menjorok
 *    → hapus indentasi dulu, baru menggabung paragraf.
 *  - Di dalam daftar / tabel tidak diambil alih: Tab tetap naik level / pindah sel.
 */
import { Extension } from '@tiptap/core';

export const INDENT_STEP_EM = 2;
const MAX_LEVEL = 8;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wcIndent: {
      /** Geser seluruh paragraf/judul terpilih (Increase/Decrease Indent di ribbon). */
      changeIndent: (direction: 1 | -1) => ReturnType;
    };
  }
}

const TYPES = ['paragraph', 'heading'];

export const Indent = Extension.create({
  name: 'wcIndent',
  // Prioritas rendah: Tab milik daftar (naik level) & tabel (pindah sel) dijalankan dulu.
  priority: 50,

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          // Indentasi baris pertama (boolean: 2em).
          firstLineIndent: {
            default: false,
            parseHTML: (el) => !!el.style.textIndent && parseFloat(el.style.textIndent) > 0,
            renderHTML: (attrs) => (attrs.firstLineIndent ? { style: `text-indent: ${INDENT_STEP_EM}em` } : {}),
          },
          // Indentasi kiri seluruh paragraf, dalam langkah 2em.
          indent: {
            default: 0,
            parseHTML: (el) => {
              const ml = parseFloat(el.style.marginLeft || '0');
              return el.style.marginLeft?.endsWith('em') && ml > 0 ? Math.min(MAX_LEVEL, Math.round(ml / INDENT_STEP_EM)) : 0;
            },
            renderHTML: (attrs) => (attrs.indent > 0 ? { style: `margin-left: ${attrs.indent * INDENT_STEP_EM}em` } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      changeIndent: (direction) => ({ state, tr, dispatch }) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!TYPES.includes(node.type.name)) return;
          const level = Math.max(0, Math.min(MAX_LEVEL, (node.attrs.indent || 0) + direction));
          if (level !== node.attrs.indent) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: level });
            changed = true;
          }
          return false;
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      },
    };
  },

  addKeyboardShortcuts() {
    const editor = this.editor;
    // Daftar & tabel punya Tab sendiri dan sudah dijalankan lebih dulu (prioritas lebih
    // tinggi). Bila sampai ke sini (mis. Tab di butir pertama yang tak bisa naik level),
    // tahan tombolnya supaya fokus tidak loncat keluar editor.
    const deferToOthers = () => editor.isActive('listItem') || editor.isActive('table');

    const atBlockStart = () => {
      const { selection } = editor.state;
      return selection.empty && selection.$from.parentOffset === 0 && TYPES.includes(selection.$from.parent.type.name);
    };

    const setAttrs = (attrs: Record<string, unknown>) => {
      const { $from } = editor.state.selection;
      const pos = $from.before($from.depth);
      const node = $from.parent;
      editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
      return true;
    };

    return {
      Tab: () => {
        if (deferToOthers()) return true;
        if (editor.isActive('codeBlock')) return editor.commands.insertContent('\t');
        const { selection } = editor.state;
        // Beberapa paragraf terpilih → geser semuanya (seperti Word).
        if (!selection.empty && selection.$from.parent !== selection.$to.parent) return editor.commands.changeIndent(1);
        if (atBlockStart()) {
          const node = selection.$from.parent;
          if (!node.attrs.firstLineIndent) return setAttrs({ firstLineIndent: true });
          return editor.commands.changeIndent(1);
        }
        return editor.commands.insertContent('\t');
      },
      'Shift-Tab': () => {
        if (deferToOthers()) return true;
        const node = editor.state.selection.$from.parent;
        if (!TYPES.includes(node.type.name)) return true; // jangan biarkan fokus keluar editor
        if (node.attrs.indent > 0) return editor.commands.changeIndent(-1);
        if (node.attrs.firstLineIndent) return setAttrs({ firstLineIndent: false });
        return true;
      },
      Backspace: () => {
        if (!atBlockStart()) return false;
        const node = editor.state.selection.$from.parent;
        if (node.attrs.firstLineIndent) return setAttrs({ firstLineIndent: false });
        if (node.attrs.indent > 0) return editor.commands.changeIndent(-1);
        return false;
      },
    };
  },
});
