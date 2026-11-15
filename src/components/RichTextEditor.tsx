import React, { useImperativeHandle, forwardRef, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TextStyle, Color, FontFamily, FontSize, LineHeight } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { CustomImage, SocialEmbed, CustomCodeBlock, MathBlock, MathInline, TikzBlock } from '../lib/tiptap-extensions';
import { SearchReplace } from '../lib/searchReplace';
import { detectSocialEmbed, markdownToEditorHtml } from '../lib/markdownConverter';
import { toEditorHtml, wrapRichHtml, isEmptyEditorHtml } from '../lib/richContent';
import { Ribbon, type RibbonViewState } from './ribbon/Ribbon';
import { RibbonThemeContext } from './ribbon/primitives';
import { FindReplaceBar } from './ribbon/panels';
import { stepFontSize } from './ribbon/commands';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Minus, Plus } from 'lucide-react';

interface RichTextEditorProps {
  /** Konten tersimpan: HTML rich (berpenanda) atau Markdown lama. */
  initialValue: string;
  /** Dipanggil tiap perubahan dengan konten HTML rich (sudah berpenanda). */
  onCommit: (content: string) => void;
  id: string;
  placeholder?: string;
  onOpenImageDialog?: () => void;
  onOpenLinkDialog?: () => void;
  onOpenAssetReuser?: () => void;
  /** Grup ribbon tambahan dari halaman, untuk tab Review dan View. */
  reviewGroups?: ReactNode;
  viewGroups?: ReactNode;
  language?: 'id' | 'en';
  className?: string;
}

export interface RichTextEditorRef {
  insertImage: (alt: string, url: string) => void;
  insertLink: (text: string, url: string) => void;
  insertMarkdown: (markdown: string) => void;
  focus: () => void;
}

const VIEW_KEY = 'wc-ribbon-view';
const DEFAULT_VIEW: RibbonViewState = { zoom: 100, showMarks: false, pageWidth: 'normal', theme: 'light' };
const PAGE_WIDTHS = { narrow: 640, normal: 816, wide: 1040 } as const;

function loadView(): RibbonViewState {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    return raw ? { ...DEFAULT_VIEW, ...JSON.parse(raw) } : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  initialValue,
  onCommit,
  id: _id,
  placeholder = 'Start typing...',
  onOpenImageDialog,
  onOpenLinkDialog,
  onOpenAssetReuser,
  reviewGroups,
  viewGroups,
  language = 'en',
  className = '',
}, ref) => {
  const [view, setView] = useState<RibbonViewState>(loadView);
  const [find, setFind] = useState<{ open: boolean; replace: boolean }>({ open: false, replace: false });
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const updateView = useCallback((patch: Partial<RibbonViewState>) => {
    setView(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(VIEW_KEY, JSON.stringify(next)); } catch { /* abaikan */ }
      return next;
    });
  }, []);

  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  // Editor dibuat ulang saat BAHASA berganti, supaya riwayat Undo tidak terbawa lintas
  // bahasa (Ctrl+Z setelah ganti tab bisa memunculkan teks bahasa lain lalu tersimpan).
  // Sengaja bukan saat id dokumen berubah: id tulisan baru muncul setelah simpan pertama,
  // di tengah mengetik, dan membuat ulang editor saat itu akan menghilangkan fokus/kursor.
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, heading: { levels: [1, 2, 3, 4] } }),
      CustomImage.configure({ allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight.configure({ types: ['paragraph', 'heading'] }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TableKit.configure({ table: { resizable: true } }),
      Placeholder.configure({ placeholder }),
      SearchReplace,
      SocialEmbed,
      CustomCodeBlock,
      MathBlock,
      MathInline,
      TikzBlock,
    ],
    content: toEditorHtml(initialValueRef.current),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onCommitRef.current(isEmptyEditorHtml(html) ? '' : wrapRichHtml(html));
    },
    editorProps: {
      attributes: { class: 'focus:outline-none', spellcheck: 'true' },
      handleKeyDown(_view, event) {
        const mod = event.ctrlKey || event.metaKey;
        if (!mod) return false;
        const key = event.key.toLowerCase();
        if (key === 'f') { event.preventDefault(); setFind({ open: true, replace: false }); return true; }
        if (key === 'h') { event.preventDefault(); setFind({ open: true, replace: true }); return true; }
        return false;
      },
      // Link sosial yang ditempel langsung jadi embed.
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain') || '';
        const html = event.clipboardData?.getData('text/html') || '';
        const social = !html ? detectSocialEmbed(text) : null;
        if (social) {
          const node = view.state.schema.nodes.socialEmbed.create({ url: text.trim(), type: social.type, width: '100%', alignment: 'center' });
          view.dispatch(view.state.tr.replaceSelectionWith(node));
          return true;
        }
        return false;
      },
    },
  }, [language]);

  // Ctrl+] / Ctrl+[ seperti Word (tidak bisa lewat handleKeyDown karena butuh instance editor).
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === ']') { e.preventDefault(); stepFontSize(editor, 1); }
      if (e.key === '[') { e.preventDefault(); stepFontSize(editor, -1); }
    };
    dom.addEventListener('keydown', onKey);
    return () => dom.removeEventListener('keydown', onKey);
  }, [editor]);

  // Sinkronkan bila konten diubah dari luar (Auto Fix, terjemahan, pulihkan draf, ganti bahasa).
  // emitUpdate:false → membuka konten Markdown lama TIDAK otomatis mengubah/menyimpannya.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.getHTML();
    const currentStored = isEmptyEditorHtml(current) ? '' : wrapRichHtml(current);
    if (currentStored === initialValue) return;
    const next = toEditorHtml(initialValue);
    if (next === current) return;
    // addToHistory:false → isi dari luar (data dimuat, Auto Fix, pulihkan draf) bukan
    // langkah Undo; Ctrl+Z tidak boleh "mengembalikan" editor ke keadaan kosong/lama.
    editor.chain().setMeta('addToHistory', false).setContent(next, { emitUpdate: false }).run();
  }, [initialValue, editor]);

  useImperativeHandle(ref, () => ({
    insertImage(alt, url) {
      editor?.chain().focus().insertContent({ type: 'image', attrs: { src: url, alt, alignment: 'center', width: '100%' } }).run();
    },
    insertLink(text, url) {
      if (!editor) return;
      const social = detectSocialEmbed(url);
      if (social) {
        editor.chain().focus().insertContent({ type: 'socialEmbed', attrs: { url, type: social.type, width: '100%', alignment: 'center' } }).run();
      } else if (editor.state.selection.empty) {
        editor.chain().focus().insertContent({ type: 'text', text: text || url, marks: [{ type: 'link', attrs: { href: url } }] }).run();
      } else {
        editor.chain().focus().setLink({ href: url }).run();
      }
    },
    insertMarkdown(markdown) {
      editor?.chain().focus().insertContent(markdownToEditorHtml(markdown)).run();
    },
    focus() {
      editor?.commands.focus();
    },
  }));

  // Ribbon menempel di bawah header halaman yang sticky (seperti Word: ribbon selalu terlihat).
  const shellRef = useRef<HTMLDivElement>(null);
  const [stickyTop, setStickyTop] = useState(0);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    // Wadah yang benar-benar di-scroll (di CMS: <main> milik AdminLayout, bukan window).
    let scroller: HTMLElement | null = shell.parentElement;
    while (scroller && scroller !== document.body) {
      const oy = getComputedStyle(scroller).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && scroller.scrollHeight > scroller.clientHeight) break;
      scroller = scroller.parentElement;
    }
    // Header sticky halaman editor ("Edit Writing") di dalam wadah itu: ribbon menempel di bawahnya.
    const header = (scroller && scroller !== document.body ? scroller : document).querySelector<HTMLElement>('header.sticky');
    // Header bisa menempel dengan top negatif (menutup padding wadah scroll), jadi ribbon
    // ditempel tepat di tepi bawah header: tinggi header + nilai top-nya.
    const update = () => setStickyTop(header ? header.offsetHeight + (parseFloat(getComputedStyle(header).top) || 0) : 0);
    update();
    const ro = header ? new ResizeObserver(update) : null;
    if (header) ro!.observe(header);
    return () => ro?.disconnect();
  }, [editor]);

  const counts = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e || e.isDestroyed) return { words: 0, chars: 0 };
      const text = e.state.doc.textBetween(0, e.state.doc.content.size, ' ', ' ');
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      return { words, chars: text.replace(/\s+/g, ' ').trim().length };
    },
  });

  if (!editor || editor.isDestroyed) return null;

  const stickyStyle = { top: stickyTop };
  const imageAttrs = editor.isActive('image') ? editor.getAttributes('image') : editor.isActive('socialEmbed') ? editor.getAttributes('socialEmbed') : {};
  const updateMediaAttrs = (attrs: Record<string, unknown>) => {
    if (editor.isActive('image')) editor.chain().focus().updateAttributes('image', attrs).run();
    else if (editor.isActive('socialEmbed')) editor.chain().focus().updateAttributes('socialEmbed', attrs).run();
  };
  const bubbleBtn = (on: boolean) =>
    `px-2 py-1 text-[11px] font-semibold rounded transition-colors ${on ? 'bg-[var(--wc-accent)] text-white' : 'text-[var(--wc-text)] hover:bg-[var(--wc-hover)]'}`;

  return (
    <RibbonThemeContext.Provider value={view.theme}>
      <div
        ref={shellRef}
        className={`wc-shell flex flex-col border border-[var(--wc-border)] rounded-xl bg-[var(--wc-canvas)] ${className}`}
        data-wc-theme={view.theme}
      >
        {/* Tanpa overflow-hidden di shell: itu mematikan position: sticky. */}
        <div className="sticky z-30 rounded-t-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.12)]" style={stickyStyle}>
        <Ribbon
          key={language}
          editor={editor}
          view={view}
          onViewChange={updateView}
          onFind={(replace) => setFind({ open: true, replace })}
          onOpenImageDialog={onOpenImageDialog}
          onOpenLinkDialog={onOpenLinkDialog}
          onOpenAssetReuser={onOpenAssetReuser}
          reviewGroups={reviewGroups}
          viewGroups={viewGroups}
          wordCount={counts.words}
          characterCount={counts.chars}
          language={language}
        />

        {find.open && (
          <FindReplaceBar
            key={language}
            editor={editor}
            withReplace={find.replace}
            onClose={() => { setFind({ open: false, replace: false }); editor.commands.focus(); }}
          />
        )}
        </div>

        {/* Ukuran/perataan gambar & embed (muncul saat dipilih) */}
        <BubbleMenu editor={editor} shouldShow={({ editor: e }) => e.isActive('image') || e.isActive('socialEmbed')}>
          <div className="wc-shell" data-wc-theme={view.theme}>
            <div className="bg-[var(--wc-menu)] border border-[var(--wc-border-strong)] rounded-lg shadow-xl p-1 flex items-center gap-1 select-none">
              {['33%', '50%', '75%', '100%'].map(w => (
                <button key={w} type="button" onClick={() => updateMediaAttrs({ width: w })} className={bubbleBtn(imageAttrs.width === w || (w === '100%' && !imageAttrs.width))}>{w}</button>
              ))}
              <span className="w-px h-5 bg-[var(--wc-border)] mx-1" />
              {([['left', AlignLeft, 'Kiri (teks membungkus)'], ['center', AlignCenter, 'Tengah'], ['right', AlignRight, 'Kanan (teks membungkus)']] as const).map(([a, Icon, t]) => (
                <button key={a} type="button" title={t} onClick={() => updateMediaAttrs({ alignment: a })} className={bubbleBtn(imageAttrs.alignment === a || (a === 'center' && !imageAttrs.alignment))}>
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
              <span className="w-px h-5 bg-[var(--wc-border)] mx-1" />
              <button type="button" title="Hapus" onClick={() => editor.chain().focus().deleteSelection().run()} className="p-1.5 text-[#d13b3b] hover:bg-[#d13b3b] hover:text-white rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </BubbleMenu>

        {/* Kanvas abu-abu + halaman putih (tampilan = halaman publik mode terang) */}
        <div className="flex-1 flex flex-col min-h-[60vh] overflow-x-auto px-4 py-6" onMouseDown={(e) => {
          // Klik di area abu-abu memindahkan kursor ke akhir dokumen, seperti Word.
          if (e.target === e.currentTarget) { e.preventDefault(); editor.commands.focus('end'); }
        }}>
          <div
            className={`wc-page flex-1 w-full mx-auto shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${view.showMarks ? 'wc-show-marks' : ''}`}
            style={{ maxWidth: PAGE_WIDTHS[view.pageWidth], padding: '56px 64px', zoom: view.zoom / 100 }}
            onClick={(e) => { if (e.target === e.currentTarget) editor.commands.focus('end'); }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 h-[26px] px-3 rounded-b-xl border-t border-[var(--wc-border)] text-[12px] bg-[var(--wc-tabstrip)] border-t border-[var(--wc-border)] text-[var(--wc-text-dim)] select-none">
          <span>{counts.words.toLocaleString()} words</span>
          <span>{counts.chars.toLocaleString()} characters</span>
          <span>{language === 'id' ? 'Indonesian' : 'English'}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" title="Zoom out" onClick={() => updateView({ zoom: Math.max(50, view.zoom - 10) })} className="p-0.5 rounded hover:bg-[var(--wc-hover)]"><Minus className="w-3 h-3" /></button>
            <input
              type="range"
              min={50}
              max={200}
              step={10}
              value={view.zoom}
              onChange={(e) => updateView({ zoom: Number(e.target.value) })}
              className="w-24 accent-[var(--wc-accent)]"
              title="Zoom"
            />
            <button type="button" title="Zoom in" onClick={() => updateView({ zoom: Math.min(200, view.zoom + 10) })} className="p-0.5 rounded hover:bg-[var(--wc-hover)]"><Plus className="w-3 h-3" /></button>
            <button type="button" title="Reset zoom" onClick={() => updateView({ zoom: 100 })} className="w-10 text-right hover:text-[var(--wc-text)]">{view.zoom}%</button>
          </div>
        </div>
      </div>
    </RibbonThemeContext.Provider>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
