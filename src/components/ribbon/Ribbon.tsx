/**
 * Ribbon bergaya Microsoft Word untuk editor konten. Tata letak tab & grup mengikuti
 * WordCraft (crates/ui-egui/src/ribbon/*.rs), diterjemahkan ke React + Tailwind.
 *
 * Tab: Home · Insert · Layout · Review · View, plus tab kontekstual "Table" yang muncul
 * saat kursor berada di dalam tabel (seperti Table Layout di Word).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  ClipboardPaste, Scissors, Copy, Paintbrush, Bold, Italic, Underline, Strikethrough,
  Subscript, Superscript, Highlighter, Baseline, CaseSensitive, RemoveFormatting, AArrowUp, AArrowDown,
  List, ListOrdered, IndentDecrease, IndentIncrease, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  UnfoldVertical, Pilcrow, Quote, Search, Replace, TextSelect, Table, Image, Link, Youtube, Sigma,
  SquareCode, Minus, Omega, CalendarDays, Palette, Recycle, BetweenHorizontalStart, BetweenHorizontalEnd,
  BetweenVerticalStart, BetweenVerticalEnd, TableCellsMerge, TableCellsSplit, Trash2, PanelTop,
  ZoomIn, ZoomOut, ChevronUp, ChevronDown, Undo2, Redo2, Code, RectangleHorizontal, WholeWord,
} from 'lucide-react';
import {
  RibbonGroup, Stack, Row, Divider, BigButton, SmallButton, SplitButton, MenuButton, MenuItem,
  MenuSeparator, ComboBox, ColorPalette,
} from './primitives';
import {
  FONT_FAMILIES, FONT_SIZES, fontLabelFromValue, fontValueFromLabel, currentFontSizePt, setFontSizePt,
  stepFontSize, changeCase, clearFormatting, captureFormat, applyFormat, indent, pasteFromClipboard,
  clipboardCommand, SYMBOLS, insertDate, type PaintedFormat,
} from './commands';
import { TableGridPicker, EmbedForm } from './panels';

export type RibbonTabId = 'home' | 'insert' | 'review' | 'view' | 'table';
export type PageWidth = 'narrow' | 'normal' | 'wide';

export interface RibbonViewState {
  zoom: number;
  showMarks: boolean;
  pageWidth: PageWidth;
  theme: 'light' | 'dark';
}

export interface RibbonProps {
  editor: Editor;
  view: RibbonViewState;
  onViewChange: (patch: Partial<RibbonViewState>) => void;
  onFind: (withReplace: boolean) => void;
  onOpenImageDialog?: () => void;
  onOpenLinkDialog?: () => void;
  onOpenAssetReuser?: () => void;
  /** Grup tambahan dari halaman (mis. Auto Fix, Translate) di tab Review. */
  reviewGroups?: ReactNode;
  /** Grup tambahan dari halaman (mis. Live Preview, Full Preview) di tab View. */
  viewGroups?: ReactNode;
  wordCount: number;
  characterCount: number;
  language: 'id' | 'en';
}

const LINE_SPACINGS = ['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'];

const STYLE_TILES: Array<{ id: string; label: string; preview: string; style: React.CSSProperties }> = [
  { id: 'p', label: 'Normal', preview: 'AaBbCcDd', style: { fontSize: 13 } },
  { id: 'h1', label: 'Heading 1', preview: 'AaBbCc', style: { fontSize: 19 } },
  { id: 'h2', label: 'Heading 2', preview: 'AaBbCcD', style: { fontSize: 16 } },
  { id: 'h3', label: 'Heading 3', preview: 'AaBbCcDd', style: { fontSize: 13, fontWeight: 700 } },
  { id: 'h4', label: 'Heading 4', preview: 'AaBbCcDd', style: { fontSize: 12, fontWeight: 700, fontStyle: 'italic' } },
  { id: 'quote', label: 'Quote', preview: 'AaBbCcDd', style: { fontSize: 13, fontStyle: 'italic', color: 'var(--wc-text-dim)' } },
];

const TILE_W = 78; // 76px tile + 2px jarak

/** Status ribbon untuk editor yang sudah dihancurkan: semua tombol netral/nonaktif. */
const DEAD_STATE = {
  bold: false, italic: false, underline: false, strike: false, sub: false, sup: false, code: false,
  highlight: null as string | null, color: null as string | null, font: 'Merriweather', size: 12,
  bullet: false, ordered: false, inList: false, quote: false, codeBlock: false,
  align: 'left' as 'left' | 'center' | 'right' | 'justify', lineHeight: null as string | null, block: 'p',
  inTable: false, canUndo: false, canRedo: false, hasSelection: false, canMerge: false, canSplit: false,
};

function StyleTile({ tile, active, onApply }: { tile: (typeof STYLE_TILES)[number]; active: boolean; onApply: (id: string) => void }) {
  return (
    <button
      type="button"
      title={tile.label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onApply(tile.id)}
      className={`w-[76px] shrink-0 flex flex-col items-center justify-between py-1 rounded-[4px] border transition-colors
        ${active ? 'border-[var(--wc-accent)] bg-[var(--wc-checked)]' : 'border-transparent hover:border-[var(--wc-border-strong)] hover:bg-[var(--wc-hover)]'}`}
    >
      <span className="h-[30px] flex items-center overflow-hidden whitespace-nowrap text-[var(--wc-text)]" style={{ fontFamily: 'Merriweather, Georgia, serif', ...tile.style }}>
        {tile.preview}
      </span>
      <span className="text-[11px] text-[var(--wc-text-dim)]">{tile.label}</span>
    </button>
  );
}

/**
 * Galeri Styles: hanya tile yang muat utuh yang tampil (tidak pernah terpotong),
 * sisanya ada di tombol ▾ — persis cara Word meringkas galeri saat sempit.
 */
function StyleGallery({ active, onApply }: { active: string; onApply: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(STYLE_TILES.length);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const room = entry.contentRect.width - 22; // sisakan tempat untuk tombol ▾
      setFit(Math.max(1, Math.min(STYLE_TILES.length, Math.floor(room / TILE_W))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Gaya yang sedang aktif selalu terlihat, walau urutannya di belakang.
  const activeIdx = STYLE_TILES.findIndex(t => t.id === active);
  const shown = STYLE_TILES.slice(0, fit);
  if (activeIdx >= fit) shown[fit - 1] = STYLE_TILES[activeIdx];

  return (
    <div ref={ref} className="flex items-stretch gap-[2px] h-[60px] w-full min-w-0">
      {shown.map(t => <StyleTile key={t.id} tile={t} active={active === t.id} onApply={onApply} />)}
      <div className="ml-auto flex items-stretch">
        <MenuButton
          title="Semua gaya"
          align="end"
          menu={(close) => (
            <div className="grid grid-cols-3 gap-1 p-2">
              {STYLE_TILES.map(t => (
                <StyleTile key={t.id} tile={t} active={active === t.id} onApply={(id) => { close(); onApply(id); }} />
              ))}
            </div>
          )}
        />
      </div>
    </div>
  );
}

export function Ribbon(props: RibbonProps) {
  const { editor, view, onViewChange } = props;
  const [tab, setTab] = useState<RibbonTabId>('home');
  const [collapsed, setCollapsed] = useState(false);
  const [painter, setPainter] = useState<PaintedFormat | null>(null);

  // Lebar panel → tingkat kepadatan, seperti Word yang meringkas grup saat jendela sempit.
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(1200);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setPanelWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Ambang = jumlah lebar minimum grup Home versi lengkap (~950px) + ruang galeri Styles.
  const compact = panelWidth < 1040;

  // Tiptap v3 tidak me-render ulang tiap transaksi; ambil status tombol lewat selector.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      // Editor bisa sudah dihancurkan (dibuat ulang saat ganti bahasa) sebelum Ribbon
      // ikut dipasang ulang; jangan sentuh view/state milik editor yang sudah mati.
      if (!e || e.isDestroyed) return DEAD_STATE;
      const ts = e.getAttributes('textStyle');
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        sub: e.isActive('subscript'),
        sup: e.isActive('superscript'),
        code: e.isActive('code'),
        highlight: (e.getAttributes('highlight').color as string | undefined) ?? (e.isActive('highlight') ? '#FFFF00' : null),
        color: (ts.color as string | undefined) ?? null,
        font: fontLabelFromValue(ts.fontFamily as string | undefined),
        size: currentFontSizePt(e),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        inList: e.isActive('listItem'),
        quote: e.isActive('blockquote'),
        codeBlock: e.isActive('codeBlock'),
        align: (['left', 'center', 'right', 'justify'] as const).find(a => e.isActive({ textAlign: a })) ?? 'left',
        lineHeight: ((e.getAttributes('paragraph').lineHeight || e.getAttributes('heading').lineHeight) as string | undefined) ?? null,
        block: e.isActive('heading', { level: 1 }) ? 'h1'
          : e.isActive('heading', { level: 2 }) ? 'h2'
          : e.isActive('heading', { level: 3 }) ? 'h3'
          : e.isActive('heading', { level: 4 }) ? 'h4'
          : e.isActive('blockquote') ? 'quote'
          : e.isActive('codeBlock') ? 'code' : 'p',
        inTable: e.isActive('table'),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        hasSelection: !e.state.selection.empty,
        canMerge: e.can().mergeCells(),
        canSplit: e.can().splitCell(),
      };
    },
  });

  const chain = () => editor.chain().focus();
  const activeTab: RibbonTabId = tab === 'table' && !s.inTable ? 'home' : tab;

  const applyStyle = (id: string) => {
    const c = chain();
    switch (id) {
      case 'p': c.setParagraph().run(); break;
      case 'h1': c.setHeading({ level: 1 }).run(); break;
      case 'h2': c.setHeading({ level: 2 }).run(); break;
      case 'h3': c.setHeading({ level: 3 }).run(); break;
      case 'h4': c.setHeading({ level: 4 }).run(); break;
      case 'quote': if (!s.quote) c.setParagraph().toggleBlockquote().run(); break;
      case 'code': if (!s.codeBlock) c.toggleCodeBlock().run(); break;
    }
  };

  const onPainter = () => {
    if (painter) { setPainter(null); return; }
    const fmt = captureFormat(editor);
    setPainter(fmt);
    // Sekali pakai: format diterapkan pada seleksi berikutnya yang dibuat dengan mouse.
    const dom = editor.view.dom;
    const onUp = () => {
      setTimeout(() => {
        if (!editor.state.selection.empty) applyFormat(editor, fmt);
        setPainter(null);
      }, 0);
      dom.removeEventListener('mouseup', onUp);
    };
    dom.addEventListener('mouseup', onUp);
  };

  /* ------------------------------------------------------------ Tab: Home */
  const home = (
    <>
      <RibbonGroup label="Clipboard">
        <MenuButton
          big
          icon={<ClipboardPaste />}
          label="Paste"
          title="Paste (Ctrl+V)"
          menu={(close) => (
            <>
              <MenuItem onClick={() => { close(); pasteFromClipboard(editor, 'keep'); }} shortcut="Ctrl+V">Keep Source Formatting</MenuItem>
              <MenuItem onClick={() => { close(); pasteFromClipboard(editor, 'text'); }} shortcut="Ctrl+Shift+V">Keep Text Only</MenuItem>
            </>
          )}
        />
        <Stack>
          <SmallButton icon={<Scissors />} label={compact ? undefined : 'Cut'} title="Cut (Ctrl+X)" disabled={!s.hasSelection} onClick={() => clipboardCommand(editor, 'cut')} />
          <SmallButton icon={<Copy />} label={compact ? undefined : 'Copy'} title="Copy (Ctrl+C)" disabled={!s.hasSelection} onClick={() => clipboardCommand(editor, 'copy')} />
          <SmallButton icon={<Paintbrush />} label={compact ? undefined : 'Format Painter'} title="Format Painter: salin format teks di kursor, lalu pilih teks tujuan" active={!!painter} onClick={onPainter} />
        </Stack>
      </RibbonGroup>

      <RibbonGroup label="Font">
        <Stack className="justify-center">
          <Row>
            <ComboBox
              value={s.font}
              items={FONT_FAMILIES.map(f => f.label)}
              width={compact ? 118 : 150}
              title="Font"
              onCommit={(label) => {
                const value = fontValueFromLabel(label);
                if (value) chain().setFontFamily(value).run();
                else chain().unsetFontFamily().run();
              }}
              renderItem={(label) => <span style={{ fontFamily: fontValueFromLabel(label) || 'Merriweather, Georgia, serif', fontSize: 14 }}>{label}</span>}
            />
            <ComboBox
              value={String(s.size)}
              items={FONT_SIZES.map(String)}
              width={52}
              title="Font Size"
              onCommit={(v) => setFontSizePt(editor, parseFloat(v))}
            />
            <SmallButton icon={<AArrowUp />} title="Increase Font Size (Ctrl+])" onClick={() => stepFontSize(editor, 1)} />
            <SmallButton icon={<AArrowDown />} title="Decrease Font Size (Ctrl+[)" onClick={() => stepFontSize(editor, -1)} />
            <MenuButton
              icon={<CaseSensitive />}
              title="Change Case"
              disabled={!s.hasSelection}
              menu={(close) => (
                <>
                  <MenuItem onClick={() => { close(); changeCase(editor, 'sentence'); }}>Sentence case.</MenuItem>
                  <MenuItem onClick={() => { close(); changeCase(editor, 'lower'); }}>lowercase</MenuItem>
                  <MenuItem onClick={() => { close(); changeCase(editor, 'upper'); }}>UPPERCASE</MenuItem>
                  <MenuItem onClick={() => { close(); changeCase(editor, 'title'); }}>Capitalize Each Word</MenuItem>
                  <MenuItem onClick={() => { close(); changeCase(editor, 'toggle'); }}>tOGGLE cASE</MenuItem>
                </>
              )}
            />
            <SmallButton icon={<RemoveFormatting />} title="Clear All Formatting" onClick={() => clearFormatting(editor)} />
          </Row>
          <Row>
            <SmallButton icon={<Bold />} title="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()} />
            <SmallButton icon={<Italic />} title="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()} />
            <SmallButton icon={<Underline />} title="Underline (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()} />
            <SmallButton icon={<Strikethrough />} title="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()} />
            <SmallButton icon={<Subscript />} title="Subscript (Ctrl+,)" active={s.sub} onClick={() => chain().unsetSuperscript().toggleSubscript().run()} />
            <SmallButton icon={<Superscript />} title="Superscript (Ctrl+.)" active={s.sup} onClick={() => chain().unsetSubscript().toggleSuperscript().run()} />
            <SmallButton icon={<Code />} title="Inline Code (Ctrl+E)" active={s.code} onClick={() => chain().toggleCode().run()} />
            <Divider />
            <SplitButton
              icon={<Highlighter />}
              title="Text Highlight Color"
              swatch={s.highlight || '#FFFF00'}
              active={!!s.highlight}
              onClick={() => (s.highlight ? chain().unsetHighlight().run() : chain().setHighlight({ color: '#FFFF00' }).run())}
              menu={(close) => (
                <ColorPalette
                  highlight
                  current={s.highlight}
                  resetLabel="No Color"
                  onReset={() => { close(); chain().unsetHighlight().run(); }}
                  onPick={(c) => { close(); chain().setHighlight({ color: c }).run(); }}
                />
              )}
            />
            <SplitButton
              icon={<Baseline />}
              title="Font Color"
              swatch={s.color || '#C00000'}
              onClick={() => chain().setColor(s.color || '#C00000').run()}
              menu={(close) => (
                <ColorPalette
                  current={s.color}
                  resetLabel="Automatic"
                  onReset={() => { close(); chain().unsetColor().run(); }}
                  onPick={(c) => { close(); chain().setColor(c).run(); }}
                />
              )}
            />
          </Row>
        </Stack>
      </RibbonGroup>

      <RibbonGroup label="Paragraph">
        <Stack className="justify-center">
          <Row>
            <SmallButton icon={<List />} title="Bullets" active={s.bullet} onClick={() => chain().toggleBulletList().run()} />
            <SmallButton icon={<ListOrdered />} title="Numbering" active={s.ordered} onClick={() => chain().toggleOrderedList().run()} />
            <Divider />
            <SmallButton icon={<IndentDecrease />} title="Decrease Indent (Shift+Tab di daftar)" disabled={!s.inList} onClick={() => indent(editor, -1)} />
            <SmallButton icon={<IndentIncrease />} title="Increase Indent (Tab di daftar)" disabled={!s.inList} onClick={() => indent(editor, 1)} />
            <Divider />
            <SmallButton icon={<Pilcrow />} title="Show/Hide ¶" active={view.showMarks} onClick={() => onViewChange({ showMarks: !view.showMarks })} />
          </Row>
          <Row>
            <SmallButton icon={<AlignLeft />} title="Align Left (Ctrl+Shift+L)" active={s.align === 'left'} onClick={() => chain().setTextAlign('left').run()} />
            <SmallButton icon={<AlignCenter />} title="Center (Ctrl+Shift+E)" active={s.align === 'center'} onClick={() => chain().setTextAlign('center').run()} />
            <SmallButton icon={<AlignRight />} title="Align Right (Ctrl+Shift+R)" active={s.align === 'right'} onClick={() => chain().setTextAlign('right').run()} />
            <SmallButton icon={<AlignJustify />} title="Justify (Ctrl+Shift+J)" active={s.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()} />
            <Divider />
            <MenuButton
              icon={<UnfoldVertical />}
              title="Line and Paragraph Spacing"
              menu={(close) => (
                <>
                  {LINE_SPACINGS.map(v => (
                    <MenuItem key={v} active={s.lineHeight === v} onClick={() => { close(); chain().setLineHeight(v).run(); }}>{v}</MenuItem>
                  ))}
                  <MenuSeparator />
                  <MenuItem onClick={() => { close(); chain().unsetLineHeight().run(); }}>Default</MenuItem>
                </>
              )}
            />
          </Row>
        </Stack>
      </RibbonGroup>

      <RibbonGroup label="Styles" grow>
        <StyleGallery active={s.block} onApply={applyStyle} />
      </RibbonGroup>

      <RibbonGroup label="Editing">
        {compact ? (
          <MenuButton
            big
            icon={<Search />}
            label="Editing"
            title="Find, Replace, Select"
            align="end"
            menu={(close) => (
              <>
                <MenuItem icon={<Search />} shortcut="Ctrl+F" onClick={() => { close(); props.onFind(false); }}>Find</MenuItem>
                <MenuItem icon={<Replace />} shortcut="Ctrl+H" onClick={() => { close(); props.onFind(true); }}>Replace</MenuItem>
                <MenuItem icon={<TextSelect />} shortcut="Ctrl+A" onClick={() => { close(); chain().selectAll().run(); }}>Select All</MenuItem>
              </>
            )}
          />
        ) : (
          <Stack>
            <SmallButton icon={<Search />} label="Find" title="Find (Ctrl+F)" onClick={() => props.onFind(false)} />
            <SmallButton icon={<Replace />} label="Replace" title="Replace (Ctrl+H)" onClick={() => props.onFind(true)} />
            <SmallButton icon={<TextSelect />} label="Select All" title="Select All (Ctrl+A)" onClick={() => chain().selectAll().run()} />
          </Stack>
        )}
      </RibbonGroup>
    </>
  );

  /* ------------------------------------------------------------ Tab: Insert */
  const insert = (
    <>
      <RibbonGroup label="Tables">
        <MenuButton
          big
          icon={<Table />}
          label="Table"
          title="Insert Table"
          menu={(close) => (
            <TableGridPicker onPick={(rows, cols) => { close(); chain().insertTable({ rows, cols, withHeaderRow: true }).run(); }} />
          )}
        />
      </RibbonGroup>
      <RibbonGroup label="Illustrations">
        {props.onOpenImageDialog && <BigButton icon={<Image />} label="Pictures" title="Insert Picture" onClick={props.onOpenImageDialog} />}
        <BigButton icon={<Palette />} label={'TikZ\nDiagram'} title="Insert TikZ Diagram" onClick={() => chain().insertContent({ type: 'tikzBlock', attrs: { code: '' } }).run()} />
      </RibbonGroup>
      <RibbonGroup label="Media">
        <MenuButton
          big
          icon={<Youtube />}
          label={'Online\nVideo / Post'}
          title="Embed YouTube, Instagram, atau X"
          menu={(close) => <EmbedForm editor={editor} onDone={close} />}
        />
      </RibbonGroup>
      <RibbonGroup label="Links">
        {props.onOpenLinkDialog && <BigButton icon={<Link />} label="Link" title="Insert Link (Ctrl+K)" onClick={props.onOpenLinkDialog} />}
      </RibbonGroup>
      <RibbonGroup label="Text">
        <Stack>
          <SmallButton icon={<SquareCode />} label="Code Block" title="Insert Code Block" onClick={() => chain().toggleCodeBlock().run()} />
          <SmallButton icon={<Minus />} label="Horizontal Line" title="Insert Horizontal Line" onClick={() => chain().setHorizontalRule().run()} />
          <SmallButton icon={<CalendarDays />} label="Date" title="Insert Today's Date" onClick={() => insertDate(editor, props.language)} />
        </Stack>
      </RibbonGroup>
      <RibbonGroup label="Symbols">
        <MenuButton
          big
          icon={<Sigma />}
          label="Equation"
          title="Insert LaTeX Equation"
          menu={(close) => (
            <>
              <MenuItem onClick={() => { close(); chain().insertContent({ type: 'mathBlock', attrs: { equation: '' } }).run(); }}>Display Equation ($$…$$)</MenuItem>
              <MenuItem onClick={() => { close(); chain().insertContent({ type: 'mathInline', attrs: { equation: 'x' } }).run(); }}>Inline Equation ($…$)</MenuItem>
            </>
          )}
        />
        <MenuButton
          big
          icon={<Omega />}
          label="Symbol"
          title="Insert Symbol"
          menu={(close) => (
            <div className="grid grid-cols-8 gap-[2px] p-2">
              {SYMBOLS.map(sym => (
                <button
                  key={sym}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { close(); chain().insertContent(sym).run(); }}
                  className="w-7 h-7 text-[15px] rounded hover:bg-[var(--wc-hover)] border border-[var(--wc-border)]"
                >
                  {sym}
                </button>
              ))}
            </div>
          )}
        />
      </RibbonGroup>
      {props.onOpenAssetReuser && (
        <RibbonGroup label="Translation">
          <BigButton icon={<Recycle />} label={'Reuse\nAssets'} title="Pakai ulang gambar & kode dari versi bahasa lain" onClick={props.onOpenAssetReuser} />
        </RibbonGroup>
      )}
    </>
  );

  /* ------------------------------------------------------------ Tab: Table (kontekstual) */
  const table = (
    <>
      <RibbonGroup label="Rows & Columns">
        <Stack>
          <SmallButton icon={<BetweenHorizontalStart />} label="Insert Above" title="Insert Row Above" onClick={() => chain().addRowBefore().run()} />
          <SmallButton icon={<BetweenHorizontalEnd />} label="Insert Below" title="Insert Row Below" onClick={() => chain().addRowAfter().run()} />
        </Stack>
        <Stack>
          <SmallButton icon={<BetweenVerticalStart />} label="Insert Left" title="Insert Column Left" onClick={() => chain().addColumnBefore().run()} />
          <SmallButton icon={<BetweenVerticalEnd />} label="Insert Right" title="Insert Column Right" onClick={() => chain().addColumnAfter().run()} />
        </Stack>
      </RibbonGroup>
      <RibbonGroup label="Merge">
        <Stack>
          <SmallButton icon={<TableCellsMerge />} label="Merge Cells" title="Merge Cells" disabled={!s.canMerge} onClick={() => chain().mergeCells().run()} />
          <SmallButton icon={<TableCellsSplit />} label="Split Cells" title="Split Cells" disabled={!s.canSplit} onClick={() => chain().splitCell().run()} />
        </Stack>
      </RibbonGroup>
      <RibbonGroup label="Header">
        <Stack>
          <SmallButton icon={<PanelTop />} label="Header Row" title="Toggle Header Row" onClick={() => chain().toggleHeaderRow().run()} />
          <SmallButton icon={<PanelTop className="-rotate-90" />} label="Header Column" title="Toggle Header Column" onClick={() => chain().toggleHeaderColumn().run()} />
        </Stack>
      </RibbonGroup>
      <RibbonGroup label="Delete">
        <MenuButton
          big
          icon={<Trash2 />}
          label="Delete"
          title="Delete rows, columns, or the table"
          menu={(close) => (
            <>
              <MenuItem onClick={() => { close(); chain().deleteRow().run(); }}>Delete Row</MenuItem>
              <MenuItem onClick={() => { close(); chain().deleteColumn().run(); }}>Delete Column</MenuItem>
              <MenuSeparator />
              <MenuItem onClick={() => { close(); chain().deleteTable().run(); }}>Delete Table</MenuItem>
            </>
          )}
        />
      </RibbonGroup>
    </>
  );

  /* ------------------------------------------------------------ Tab: Review */
  // Hanya grup dari halaman (Auto Fix). Jumlah kata sudah ada di status bar.
  const review = <>{props.reviewGroups}</>;

  /* ------------------------------------------------------------ Tab: View */
  // ¶ ada di Home › Paragraph dan zoom di status bar, jadi tidak diulang di sini.
  const viewTab = (
    <>
      {props.viewGroups}
      <RibbonGroup label="Page">
        <MenuButton
          big
          icon={<RectangleHorizontal />}
          label="Page Width"
          title="Lebar halaman editor (hanya tampilan saat menulis)"
          menu={(close) => (
            <>
              {(['narrow', 'normal', 'wide'] as const).map(w => (
                <MenuItem key={w} active={view.pageWidth === w} onClick={() => { close(); onViewChange({ pageWidth: w }); }}>
                  {w === 'narrow' ? 'Narrow' : w === 'normal' ? 'Normal (seperti situs)' : 'Wide'}
                </MenuItem>
              ))}
            </>
          )}
        />
      </RibbonGroup>
    </>
  );

  const tabs: Array<{ id: RibbonTabId; label: string; contextual?: boolean }> = [
    { id: 'home', label: 'Home' },
    { id: 'insert', label: 'Insert' },
    { id: 'review', label: 'Review' },
    { id: 'view', label: 'View' },
    ...(s.inTable ? [{ id: 'table' as const, label: 'Table', contextual: true }] : []),
  ];

  const content = { home, insert, review, view: viewTab, table }[activeTab];

  return (
    <div className="select-none bg-[var(--wc-ribbon)] border-b border-[var(--wc-border)]">
      {/* Strip tab + quick access (Undo/Redo) */}
      <div className="flex items-end gap-0.5 px-2 pt-1 bg-[var(--wc-tabstrip)] border-b border-[var(--wc-border)]">
        <div className="flex items-center gap-0.5 pr-2 mr-1 mb-1 border-r border-[var(--wc-border)]">
          <SmallButton icon={<Undo2 />} title="Undo (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()} />
          <SmallButton icon={<Redo2 />} title="Redo (Ctrl+Y)" disabled={!s.canRedo} onClick={() => chain().redo().run()} />
        </div>
        <div className="flex items-end gap-0.5 overflow-x-auto wc-no-scrollbar">
          {tabs.map(t => {
            const active = activeTab === t.id && !collapsed;
            return (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (collapsed) { setCollapsed(false); setTab(t.id); return; }
                  setTab(t.id);
                }}
                onDoubleClick={() => setCollapsed(c => !c)}
                className={`relative px-3 pt-1 pb-1.5 text-[13px] whitespace-nowrap rounded-t-[4px] transition-colors
                  ${t.contextual ? 'text-[var(--wc-accent-text)] font-semibold' : 'text-[var(--wc-text)]'}
                  ${active ? 'bg-[var(--wc-ribbon)]' : 'hover:bg-[var(--wc-hover)]'}`}
              >
                {t.label}
                {active && <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-full bg-[var(--wc-accent)]" />}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          title={collapsed ? 'Pin the ribbon' : 'Collapse the ribbon (double-click a tab)'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto mb-1 p-1 rounded text-[var(--wc-icon)] hover:bg-[var(--wc-hover)]"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Panel grup */}
      {!collapsed && (
        <div ref={panelRef} className="flex flex-wrap items-stretch gap-y-1 py-1 px-1">
          {content}
        </div>
      )}
    </div>
  );
}

