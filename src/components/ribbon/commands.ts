/**
 * Perintah ribbon yang tidak disediakan langsung oleh Tiptap: Change Case, Grow/Shrink
 * Font, Format Painter, Clear Formatting, indent paragraf, dan sisip simbol/tanggal.
 */
import type { Editor } from '@tiptap/react';
import type { Mark } from '@tiptap/pm/model';

export const FONT_FAMILIES: Array<{ label: string; value: string | null }> = [
  { label: 'Merriweather', value: null }, // bawaan konten (lihat .rich-content)
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Lora', value: 'Lora, Georgia, serif' },
  { label: 'Playfair Display', value: '"Playfair Display", Georgia, serif' },
  { label: 'Source Serif 4', value: '"Source Serif 4", Georgia, serif' },
  { label: 'Roboto', value: 'Roboto, Arial, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
];

export function fontLabelFromValue(value: string | null | undefined): string {
  if (!value) return FONT_FAMILIES[0].label;
  const first = value.split(',')[0].replace(/["']/g, '').trim();
  return FONT_FAMILIES.find(f => f.label.toLowerCase() === first.toLowerCase())?.label || first;
}

export function fontValueFromLabel(label: string): string | null {
  const known = FONT_FAMILIES.find(f => f.label.toLowerCase() === label.toLowerCase());
  if (known) return known.value;
  return /\s/.test(label) ? `"${label}"` : label;
}

export const FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

/** Ukuran bawaan (pt) per jenis blok — harus sama dengan CSS .rich-content. */
const DEFAULT_SIZES: Record<string, number> = { paragraph: 12, h1: 26, h2: 20, h3: 16, h4: 13 };

export function currentFontSizePt(editor: Editor): number {
  const raw = editor.getAttributes('textStyle').fontSize as string | undefined;
  if (raw) {
    const n = parseFloat(raw);
    if (raw.endsWith('px')) return Math.round(n * 0.75 * 2) / 2;
    if (!Number.isNaN(n)) return n;
  }
  for (const level of [1, 2, 3, 4]) {
    if (editor.isActive('heading', { level })) return DEFAULT_SIZES[`h${level}`];
  }
  return DEFAULT_SIZES.paragraph;
}

export function setFontSizePt(editor: Editor, pt: number) {
  if (!Number.isFinite(pt) || pt <= 0) return;
  const clamped = Math.min(400, Math.max(1, pt));
  editor.chain().focus().setFontSize(`${clamped}pt`).run();
}

export function stepFontSize(editor: Editor, direction: 1 | -1) {
  const cur = currentFontSizePt(editor);
  const next = direction > 0
    ? FONT_SIZES.find(s => s > cur) ?? cur + 10
    : [...FONT_SIZES].reverse().find(s => s < cur) ?? Math.max(1, cur - 1);
  setFontSizePt(editor, next);
}

export type CaseMode = 'sentence' | 'lower' | 'upper' | 'title' | 'toggle';

function transformCase(text: string, mode: CaseMode, atSentenceStart: { value: boolean }): string {
  switch (mode) {
    case 'lower': return text.toLowerCase();
    case 'upper': return text.toUpperCase();
    case 'toggle': return [...text].map(c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('');
    case 'title': return text.toLowerCase().replace(/(^|[\s\-(“"'])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
    case 'sentence': {
      let out = '';
      for (const c of text.toLowerCase()) {
        if (atSentenceStart.value && /\p{L}/u.test(c)) {
          out += c.toUpperCase();
          atSentenceStart.value = false;
        } else {
          out += c;
          if (/[.!?]/.test(c)) atSentenceStart.value = true;
        }
      }
      return out;
    }
  }
}

/** Home › Font › Change Case. Ganti huruf teks terpilih tanpa menghilangkan format. */
export function changeCase(editor: Editor, mode: CaseMode) {
  const { state } = editor;
  const { from, to, empty } = state.selection;
  if (empty) return;
  const tr = state.tr;
  const sentence = { value: true };
  const edits: Array<{ from: number; to: number; text: string; marks: readonly Mark[] }> = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isTextblock && pos + 1 > from) sentence.value = true;
    if (!node.isText || !node.text) return;
    const start = Math.max(from, pos);
    const end = Math.min(to, pos + node.text.length);
    const slice = node.text.slice(start - pos, end - pos);
    const next = transformCase(slice, mode, sentence);
    if (next !== slice) edits.push({ from: start, to: end, text: next, marks: node.marks });
  });
  for (const e of edits.reverse()) {
    tr.replaceWith(e.from, e.to, state.schema.text(e.text, e.marks));
  }
  tr.setSelection(state.selection.map(tr.doc, tr.mapping));
  editor.view.dispatch(tr);
  editor.commands.focus();
}

/** Home › Font › Clear All Formatting: buang semua mark dan kembalikan blok ke paragraf. */
export function clearFormatting(editor: Editor) {
  editor.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().unsetLineHeight().run();
}

/* -------------------------------------------------- Format Painter */

export interface PaintedFormat {
  marks: Array<{ type: string; attrs: Record<string, unknown> }>;
  textAlign?: string | null;
}

export function captureFormat(editor: Editor): PaintedFormat {
  const { state } = editor;
  const marks = (state.storedMarks || state.selection.$from.marks()).map(m => ({ type: m.type.name, attrs: { ...m.attrs } }));
  const block = state.selection.$from.parent;
  return { marks, textAlign: (block.attrs.textAlign as string | undefined) ?? null };
}

export function applyFormat(editor: Editor, fmt: PaintedFormat) {
  let chain = editor.chain().focus().unsetAllMarks();
  for (const m of fmt.marks) chain = chain.setMark(m.type, m.attrs);
  if (fmt.textAlign) chain = chain.setTextAlign(fmt.textAlign);
  chain.run();
}

/* -------------------------------------------------- Indent */

/** Increase/Decrease Indent: di daftar = naik/turun level; di paragraf/judul = geser kiri. */
export function indent(editor: Editor, direction: 1 | -1) {
  if (editor.isActive('listItem')) {
    if (direction > 0) editor.chain().focus().sinkListItem('listItem').run();
    else editor.chain().focus().liftListItem('listItem').run();
    return;
  }
  editor.chain().focus().changeIndent(direction).run();
}

/* -------------------------------------------------- Clipboard */

export async function pasteFromClipboard(editor: Editor, mode: 'keep' | 'text') {
  try {
    if (mode === 'keep' && 'read' in navigator.clipboard) {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('text/html')) {
          const html = await (await item.getType('text/html')).text();
          editor.chain().focus().insertContent(html).run();
          return;
        }
      }
    }
    const text = await navigator.clipboard.readText();
    if (text) editor.chain().focus().insertContent(text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)).replace(/\n/g, '<br>')).run();
  } catch {
    // Browser menolak akses clipboard (izin). Ctrl+V tetap berfungsi.
    alert('Browser tidak mengizinkan akses clipboard dari tombol. Gunakan Ctrl+V.');
  }
}

export function clipboardCommand(editor: Editor, cmd: 'cut' | 'copy') {
  editor.commands.focus();
  document.execCommand(cmd);
}

/* -------------------------------------------------- Sisipan */

export const SYMBOLS = ['©', '®', '™', '€', '£', '¥', '°', '±', '×', '÷', '≈', '≠', '≤', '≥', '∞', '√', 'π', 'Ω', 'µ', '→', '←', '↑', '↓', '⇒', '…', '—', '–', '“', '”', '‘', '’', '«', '»', '•', '§', '¶', '†', '✓', '★'];

export function insertDate(editor: Editor, locale: 'id' | 'en') {
  const text = new Date().toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  editor.chain().focus().insertContent(text).run();
}
