import React, { useImperativeHandle, forwardRef, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import { flushSync } from 'react-dom';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TextStyle, Color, FontFamily, FontSize, LineHeight } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { isFreeWrap } from '../lib/tiptap-extensions';
import { NodeSelection } from '@tiptap/pm/state';
import { CustomImage, SocialEmbed, newEmbedAttrs, CustomCodeBlock, MathBlock, MathInline, TikzBlock } from '../lib/tiptap-extensions';
import { SearchReplace } from '../lib/searchReplace';
import { Indent } from '../lib/indent';
import { detectSocialEmbed, markdownToEditorHtml } from '../lib/markdownConverter';
import { toEditorHtml, wrapRichHtml, isEmptyEditorHtml } from '../lib/richContent';
import { Ribbon, type RibbonViewState } from './ribbon/Ribbon';
import { RibbonThemeContext } from './ribbon/primitives';
import { FindReplaceBar } from './ribbon/panels';
import { stepFontSize } from './ribbon/commands';
import { uploadImage } from '../lib/mediaUploader';
import { API_BASE } from '../lib/api';

const imageFiles = (list?: FileList | null) => Array.from(list || []).filter(f => /^image\/(png|jpe?g|gif|webp)$/i.test(f.type));
import { Minus, Plus } from 'lucide-react';

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
  /** Sisipkan HTML editor apa adanya (aset dari bahasa lain: tata letak gambar ikut). */
  insertHtml: (html: string) => void;
  /** Ganti seluruh isi (tetap bisa di-Undo dengan Ctrl+Z). */
  replaceHtml: (html: string) => void;
  /** Pasang link ke teks terpilih. Mengembalikan false bila tidak ada teks yang dipilih. */
  linkSelection: (href: string) => boolean;
  focus: () => void;
}

const VIEW_KEY = 'wc-ribbon-view';
/** Jeda maksimal sebelum isi editor dikirim ke halaman saat mengetik (lihat scheduleCommit). */
const COMMIT_DELAY_MS = 120;
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

  // ---- Drag gambar: zona kiri/tengah/kanan + garis bantu ----
  type Zone = { align: 'left' | 'center' | 'right'; label: string };
  const [dragGuide, setDragGuide] = useState<Zone | null>(null);
  /** Zona jatuh untuk gambar yang sedang di-drag di dalam editor (null bila bukan gambar). */
  const dropZone = (pmView: { dragging: any; dom: HTMLElement } | null | undefined, ev: DragEvent | MouseEvent): Zone | null => {
    const dragged = pmView?.dragging?.slice?.content?.firstChild;
    const isMedia = (n: any) => n?.type?.name === 'image' || n?.type?.name === 'socialEmbed';
    if (!pmView || !(isMedia(dragged) || isMedia(dragged?.firstChild))) return null;
    const imageNode = isMedia(dragged) ? dragged : dragged.firstChild;
    const wrap = imageNode.attrs.wrap;
    if (wrap === 'inline') return null;
    const rect = pmView.dom.getBoundingClientRect();
    const ratio = (ev.clientX - rect.left) / Math.max(1, rect.width);
    if (wrap === 'square' || wrap === 'tight') {
      return ratio < 0.5 ? { align: 'left', label: 'Kiri — teks di kanan' } : { align: 'right', label: 'Kanan — teks di kiri' };
    }
    if (ratio < 1 / 3) return { align: 'left', label: 'Kiri' };
    if (ratio > 2 / 3) return { align: 'right', label: 'Kanan' };
    return { align: 'center', label: 'Tengah' };
  };
  const applyDropZone = (zone: Zone) => {
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;
    const type = ed.isActive('image') ? 'image' : ed.isActive('socialEmbed') ? 'socialEmbed' : null;
    if (type && ed.getAttributes(type).align !== zone.align) ed.chain().updateAttributes(type, { align: zone.align }).run();
  };
  const onOpenLinkDialogRef = useRef(onOpenLinkDialog);
  onOpenLinkDialogRef.current = onOpenLinkDialog;

  // ---- Pengiriman isi ke halaman (dikumpulkan saat mengetik cepat) ----
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commitPendingRef = useRef(false);
  /** Kirim isi editor ke halaman sekarang. sync=true → render halaman seketika (flushSync),
   *  supaya penyimpan (autosave/Translate/Ctrl+S/tutup tab) membaca isi terbaru. */
  const flushCommit = (sync = false) => {
    clearTimeout(commitTimerRef.current);
    if (!commitPendingRef.current) return;
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;
    commitPendingRef.current = false;
    const html = ed.getHTML();
    const value = isEmptyEditorHtml(html) ? '' : wrapRichHtml(html);
    rememberEmitted(value);
    if (sync) {
      try { flushSync(() => onCommitRef.current(value)); } catch { onCommitRef.current(value); }
    } else {
      onCommitRef.current(value);
    }
  };
  const scheduleCommit = () => {
    commitPendingRef.current = true;
    clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => flushCommit(false), COMMIT_DELAY_MS);
  };
  // Tab ditutup / disembunyikan: kirim seketika (sebelum autosave menyimpan draf lokal).
  useEffect(() => {
    const now = () => flushCommit(true);
    const onVisibility = () => { if (document.visibilityState === 'hidden') now(); };
    window.addEventListener('beforeunload', now, { capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', now, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      // Editor dilepas (mis. Live Preview menukar instance editor, atau pindah halaman):
      // kirim ketikan yang belum terkirim. Efek ini dideklarasikan sebelum useEditor, jadi
      // dibersihkan lebih dulu — editor masih hidup saat getHTML() dipanggil.
      flushCommit(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unggah gambar yang ditempel/di-drag. Disisipkan sebagai URL server (bukan base64,
  // yang membengkakkan dokumen & autosave). Status tampil di status bar.
  const [uploadStatus, setUploadStatus] = useState('');
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const uploadAndInsert = async (files: File[], pos: number) => {
    for (const [i, file] of files.entries()) {
      setUploadStatus(`Mengunggah gambar ${i + 1}/${files.length}…`);
      try {
        const url = await uploadImage(file, { apiBaseUrl: API_BASE });
        const ed = editorRef.current;
        if (!ed || ed.isDestroyed) return;
        const at = Math.min(pos, ed.state.doc.content.size);
        ed.chain().focus().insertContentAt(at, {
          type: 'image',
          attrs: { src: url, alt: file.name.replace(/\.[^.]+$/, ''), wrap: 'topBottom', align: 'center', width: '100%' },
        }).run();
        pos = Math.min(at + 1, ed.state.doc.content.size);
      } catch (err) {
        setUploadStatus(`Gagal mengunggah ${file.name}: ${err instanceof Error ? err.message : 'error'}`);
        return;
      }
    }
    setUploadStatus('');
  };

  // Versi yang baru saja dikirim editor ini sendiri. Bila halaman mengembalikan salah satunya
  // (mis. state disetel ulang dari snapshot autosave yang sudah lewat), itu "gema" lama:
  // menerapkannya akan menghapus ketikan yang dibuat sesudahnya, jadi diabaikan.
  const emittedRef = useRef<string[]>([]);
  const rememberEmitted = (value: string) => {
    const list = emittedRef.current;
    list.push(value);
    if (list.length > 60) list.splice(0, list.length - 60);
  };

  // Editor dibuat ulang saat BAHASA berganti, supaya riwayat Undo tidak terbawa lintas
  // bahasa (Ctrl+Z setelah ganti tab bisa memunculkan teks bahasa lain lalu tersimpan).
  // Sengaja bukan saat id dokumen berubah: id tulisan baru muncul setelah simpan pertama,
  // di tengah mengetik, dan membuat ulang editor saat itu akan menghilangkan fokus/kursor.
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, heading: { levels: [1, 2, 3, 4] }, dropcursor: { color: '#3b5bdb', width: 2 } }),
      CustomImage.configure({ allowBase64: true, inline: true }),
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
      Indent,
      SocialEmbed,
      CustomCodeBlock,
      MathBlock,
      MathInline,
      TikzBlock,
    ],
    content: toEditorHtml(initialValueRef.current),
    // Mengetik cepat: jangan render ulang seluruh halaman tiap ketikan. Perubahan dikumpulkan
    // dan dikirim ke halaman paling sering tiap COMMIT_DELAY_MS, dan SEGERA saat editor
    // kehilangan fokus (Simpan/Translate/Back/ganti bahasa), Ctrl+S, atau tab ditutup.
    onUpdate: () => scheduleCommit(),
    editorProps: {
      attributes: { class: 'focus:outline-none', spellcheck: 'true' },
      handleDOMEvents: {
        blur: () => { flushCommit(true); return false; },
      },
      handleKeyDown(view, event) {
        // Ctrl+S: kirim isi terbaru ke halaman SEBELUM status bar menyimpan.
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') flushCommit(true);
        // Gambar bebas (In Front of / Behind Text) terpilih: panah menggeser 1px, Shift = 10px.
        const sel = view.state.selection as NodeSelection;
        const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (arrows[event.key] && (sel.node?.type.name === 'image' || sel.node?.type.name === 'socialEmbed') && isFreeWrap(sel.node.attrs.wrap) && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          const [dx, dy] = arrows[event.key];
          const root = view.dom as HTMLElement;
          const cs = getComputedStyle(root);
          const col = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) || 1;
          const a = sel.node.attrs;
          const w = parseFloat(a.width) || 0;
          const x = Math.max(0, Math.min(100 - w, (a.offsetX || 0) + ((dx * step) / col) * 100));
          const tr = view.state.tr.setNodeMarkup(sel.from, undefined, { ...a, offsetX: Math.round(x * 100) / 100, offsetY: Math.round((a.offsetY || 0) + dy * step) });
          tr.setSelection(NodeSelection.create(tr.doc, sel.from));
          view.dispatch(tr);
          return true;
        }
        const mod = event.ctrlKey || event.metaKey;
        if (!mod) return false;
        const key = event.key.toLowerCase();
        if (key === 'f') { event.preventDefault(); setFind({ open: true, replace: false }); return true; }
        if (key === 'h') { event.preventDefault(); setFind({ open: true, replace: true }); return true; }
        if (key === 'k' && onOpenLinkDialogRef.current) { event.preventDefault(); onOpenLinkDialogRef.current(); return true; }
        return false;
      },
      // HTML dari Word/Google Docs: buang gambar yang menunjuk ke berkas lokal (file:///…),
      // yang hanya ada di komputer penulis dan tampil rusak di situs, plus sampah khas Word.
      transformPastedHTML(html) {
        return html
          .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
          .replace(/<img\b[^>]*\bsrc=["'](?:file:|blob:|webkit-fake-url:)[^"']*["'][^>]*>/gi, '')
          .replace(/<\/?o:p>/gi, '')
          .replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '');
      },
      handlePaste(view, event) {
        const html = event.clipboardData?.getData('text/html') || '';
        const text = event.clipboardData?.getData('text/plain') || '';
        // Screenshot/gambar yang disalin (tanpa HTML) → unggah lalu sisipkan.
        const images = imageFiles(event.clipboardData?.files);
        if (images.length && !html) {
          event.preventDefault();
          void uploadAndInsert(images, view.state.selection.from);
          return true;
        }
        // Link sosial yang ditempel langsung jadi embed.
        const social = !html ? detectSocialEmbed(text) : null;
        if (social) {
          const node = view.state.schema.nodes.socialEmbed.create(newEmbedAttrs(text, social.type));
          view.dispatch(view.state.tr.replaceSelectionWith(node));
          return true;
        }
        return false;
      },
      // Gambar yang di-drag dari komputer → unggah lalu sisipkan di posisi jatuhnya.
      handleDrop(view, event, _slice, moved) {
        if (moved) {
          // Gambar dipindah di dalam editor: ProseMirror memindahkan node-nya, lalu sisi
          // (kiri/tengah/kanan) disesuaikan dengan tempat gambar dilepas, seperti Word.
          const zone = dropZone(view, event as DragEvent);
          setDragGuide(null);
          if (zone) setTimeout(() => applyDropZone(zone), 0);
          return false;
        }
        const images = imageFiles((event as DragEvent).dataTransfer?.files);
        if (!images.length) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY });
        void uploadAndInsert(images, coords?.pos ?? view.state.selection.from);
        return true;
      },
    },
  }, [language]);
  editorRef.current = editor;

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
    // Jalur cepat (tiap ketikan): nilai dari halaman = yang barusan dikirim editor ini.
    // Lewati getHTML() kedua, yang menyusun ulang seluruh dokumen — terasa di cerita panjang.
    const emitted = emittedRef.current;
    if (emitted.length && emitted[emitted.length - 1] === initialValue) return;
    const current = editor.getHTML();
    const currentStored = isEmptyEditorHtml(current) ? '' : wrapRichHtml(current);
    if (currentStored === initialValue) return;
    // Gema versi lama milik editor ini sendiri → abaikan (lihat emittedRef).
    if (emittedRef.current.includes(initialValue)) return;
    const next = toEditorHtml(initialValue);
    if (next === current) return;
    // addToHistory:false → isi dari luar (data dimuat, Auto Fix, pulihkan draf) bukan
    // langkah Undo; Ctrl+Z tidak boleh "mengembalikan" editor ke keadaan kosong/lama.
    editor.chain().setMeta('addToHistory', false).setContent(next, { emitUpdate: false }).run();
    // Isi dari luar menggantikan dokumen: versi lama yang pernah dikirim editor ini bukan lagi
    // "gema". Tanpa ini, mengembalikan isi sebelum terjemahan (yang sama dengan versi lama)
    // akan diabaikan editor.
    emittedRef.current = [];
  }, [initialValue, editor]);

  useImperativeHandle(ref, () => ({
    insertImage(alt, url) {
      editor?.chain().focus().insertContent({ type: 'image', attrs: { src: url, alt, wrap: 'topBottom', align: 'center', width: '100%' } }).run();
    },
    insertLink(text, url) {
      if (!editor) return;
      const social = detectSocialEmbed(url);
      if (social) {
        editor.chain().focus().insertContent({ type: 'socialEmbed', attrs: newEmbedAttrs(url, social.type) }).run();
      } else if (editor.state.selection.empty) {
        editor.chain().focus().insertContent({ type: 'text', text: text || url, marks: [{ type: 'link', attrs: { href: url } }] }).run();
      } else {
        editor.chain().focus().setLink({ href: url }).run();
      }
    },
    insertMarkdown(markdown) {
      editor?.chain().focus().insertContent(markdownToEditorHtml(markdown)).run();
    },
    insertHtml(html) {
      if (!editor || editor.isDestroyed) return;
      editor.chain().focus().insertContent(html).run();
      flushCommit(true);
    },
    replaceHtml(html) {
      if (!editor || editor.isDestroyed) return;
      editor.chain().focus().setContent(html, { emitUpdate: true }).run();
      flushCommit(true);
    },
    linkSelection(href) {
      if (!editor || editor.isDestroyed || editor.state.selection.empty) return false;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
      flushCommit(true);
      return true;
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

  // Jumlah kata/karakter di status bar: dihitung setelah jeda mengetik (bukan tiap ketikan),
  // supaya editor tidak ikut dirender ulang tiap huruf di dokumen panjang.
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const compute = () => {
      if (editor.isDestroyed) return;
      const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, ' ', ' ');
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.replace(/\s+/g, ' ').trim().length;
      setCounts(prev => (prev.words === words && prev.chars === chars ? prev : { words, chars }));
    };
    const onUpdate = () => { clearTimeout(timer); timer = setTimeout(compute, 250); };
    compute();
    editor.on('update', onUpdate);
    return () => { clearTimeout(timer); editor.off('update', onUpdate); };
  }, [editor]);
  const openFind = useCallback((replace: boolean) => setFind({ open: true, replace }), []);

  if (!editor || editor.isDestroyed) return null;

  const stickyStyle = { top: stickyTop };
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
          onFind={openFind}
          onOpenImageDialog={onOpenImageDialog}
          onOpenLinkDialog={onOpenLinkDialog}
          onOpenAssetReuser={onOpenAssetReuser}
          reviewGroups={reviewGroups}
          viewGroups={viewGroups}
          wordCount={counts.words}
          characterCount={counts.chars}
          language={language}
          onStatus={setUploadStatus}
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

        {/* Kanvas abu-abu + halaman putih (tampilan = halaman publik mode terang) */}
        <div className="flex-1 flex flex-col min-h-[60vh] overflow-x-auto px-4 py-6" onMouseDown={(e) => {
          // Klik di area abu-abu memindahkan kursor ke akhir dokumen, seperti Word.
          if (e.target === e.currentTarget) { e.preventDefault(); editor.commands.focus('end'); }
        }}>
          <div
            className={`wc-page relative flex-1 w-full mx-auto shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${view.showMarks ? 'wc-show-marks' : ''}`}
            onDragOver={(e) => { const z = dropZone(editor.view, e.nativeEvent); setDragGuide(z); }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setDragGuide(null); }}
            onDragEnd={() => setDragGuide(null)}
            style={{ maxWidth: PAGE_WIDTHS[view.pageWidth], padding: '56px 64px', zoom: view.zoom / 100 }}
            onClick={(e) => { if (e.target === e.currentTarget) editor.commands.focus('end'); }}
          >
            <EditorContent editor={editor} />
            {dragGuide && <div className={`wc-drag-guide wc-drag-guide-${dragGuide.align}`} aria-hidden="true"><span>{dragGuide.label}</span></div>}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 h-[26px] px-3 rounded-b-xl border-t border-[var(--wc-border)] text-[12px] bg-[var(--wc-tabstrip)] border-t border-[var(--wc-border)] text-[var(--wc-text-dim)] select-none">
          <span>{counts.words.toLocaleString()} words</span>
          <span>{counts.chars.toLocaleString()} characters</span>
          <span>{language === 'id' ? 'Indonesian' : 'English'}</span>
          {uploadStatus && <span className={uploadStatus.startsWith('Gagal') ? 'text-[#f87171]' : 'text-[var(--wc-accent-text)]'}>{uploadStatus}</span>}
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
