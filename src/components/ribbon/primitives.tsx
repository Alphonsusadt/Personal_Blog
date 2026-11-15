/**
 * Komponen dasar ribbon bergaya Word. Ukuran & pola diambil dari WordCraft
 * (crates/ui-egui/src/widgets/buttons.rs, ribbon/common.rs): tinggi isi grup 66px,
 * label grup 18px, tombol kecil 26px, tombol besar = ikon + label dua baris.
 *
 * Semua tombol memakai onMouseDown preventDefault supaya klik di ribbon tidak
 * mencuri fokus/seleksi dari editor.
 */
import {
  createContext, useContext, useEffect, useLayoutEffect, useRef, useState,
  type ReactNode, type CSSProperties, type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export type RibbonTheme = 'light' | 'dark';
export const RibbonThemeContext = createContext<RibbonTheme>('light');

const keepFocus = (e: ReactMouseEvent) => e.preventDefault();

const btnBase =
  'inline-flex items-center justify-center rounded-[4px] text-[var(--wc-icon)] transition-colors select-none ' +
  'hover:bg-[var(--wc-hover)] active:bg-[var(--wc-pressed)] disabled:opacity-40 disabled:pointer-events-none';
const btnChecked = '!bg-[var(--wc-checked)] !text-[var(--wc-accent-text)]';

/* ---------------------------------------------------------------- Grup */

export function RibbonGroup({ label, children, onLauncher, launcherTitle, grow }: {
  label: string;
  children: ReactNode;
  onLauncher?: () => void;
  launcherTitle?: string;
  /** Grup yang mengisi sisa lebar (galeri Styles). */
  grow?: boolean;
}) {
  return (
    <div className={`relative flex flex-col px-2 border-r border-[var(--wc-border)] last:border-r-0 ${grow ? 'flex-1 min-w-[132px]' : 'shrink-0'}`}>
      <div className="flex items-stretch gap-1 h-[66px] pt-1">{children}</div>
      <div className="h-[18px] flex items-center justify-center text-[11px] text-[var(--wc-group-label)] whitespace-nowrap">
        {label}
      </div>
      {onLauncher && (
        <button
          type="button"
          title={launcherTitle || label}
          onMouseDown={keepFocus}
          onClick={onLauncher}
          className="absolute right-0.5 bottom-0.5 w-3.5 h-3.5 flex items-center justify-center text-[var(--wc-group-label)] hover:bg-[var(--wc-hover)] rounded-sm"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1"><path d="M1 1h6v6M7 7L2 2" /></svg>
        </button>
      )}
    </div>
  );
}

/** Kolom tombol kecil (maks. 3 baris), seperti Cut/Copy/Format Painter. */
export function Stack({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col justify-start gap-[1px] ${className}`}>{children}</div>;
}

/** Satu baris kontrol di dalam grup (mis. baris font & baris B/I/U). */
export function Row({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center gap-[2px] h-[28px] ${className}`}>{children}</div>;
}

export function Divider() {
  return <span className="w-px h-5 bg-[var(--wc-border)] mx-1 shrink-0" />;
}

/* ---------------------------------------------------------------- Tombol */

export interface ButtonProps {
  icon?: ReactNode;
  label?: string;
  title: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Tombol besar: ikon 32px di atas, label (boleh 2 baris) di bawah. */
export function BigButton({ icon, label, title, onClick, active, disabled, dropdown, className = '' }: ButtonProps & { dropdown?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={keepFocus}
      onClick={onClick}
      className={`${btnBase} flex-col justify-start gap-0.5 px-1.5 pt-1 min-w-[44px] h-full ${active ? btnChecked : ''} ${className}`}
    >
      <span className="w-8 h-8 flex items-center justify-center [&>svg]:w-7 [&>svg]:h-7">{icon}</span>
      <span className="text-[11.5px] leading-[13px] text-[var(--wc-text)] text-center whitespace-pre-line flex items-center gap-0.5">
        {label}
        {dropdown && <ChevronDown className="w-2.5 h-2.5" />}
      </span>
    </button>
  );
}

/** Tombol kecil 26px: ikon saja, atau ikon + label (Cut / Copy / Find…). */
export function SmallButton({ icon, label, title, onClick, active, disabled, className = '', style }: ButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={keepFocus}
      onClick={onClick}
      style={style}
      className={`${btnBase} h-[26px] ${label ? 'px-1.5 gap-1.5 justify-start' : 'w-[26px]'} ${active ? btnChecked : ''} ${className}`}
    >
      {icon && <span className="flex items-center [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
      {label && <span className="text-[12.5px] text-[var(--wc-text)] whitespace-nowrap">{label}</span>}
    </button>
  );
}

/* ---------------------------------------------------------------- Popover */

/**
 * Menu/panel yang muncul di bawah sebuah tombol. Dirender via portal dengan posisi
 * fixed, supaya tidak terpotong oleh panel ribbon yang bisa di-scroll horizontal.
 */
export function Popover({ anchor, open, onClose, children, align = 'start' }: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'start' | 'end';
}) {
  const theme = useContext(RibbonThemeContext);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const panel = panelRef.current;
      const w = panel?.offsetWidth || 0;
      let left = align === 'end' ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      setPos({ top: r.bottom + 2, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchor, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, anchor, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="wc-shell" data-wc-theme={theme}>
      <div
        ref={panelRef}
        style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 1000 }}
        className="min-w-[160px] max-h-[70vh] overflow-y-auto rounded-md border border-[var(--wc-border-strong)] bg-[var(--wc-menu)] text-[var(--wc-text)] shadow-xl py-1"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function MenuItem({ children, onClick, active, title, icon, shortcut, disabled }: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={keepFocus}
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-[var(--wc-hover)] disabled:opacity-40 ${active ? 'bg-[var(--wc-checked)]' : ''}`}
    >
      <span className="w-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">{icon ?? (active ? '✓' : '')}</span>
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[11px] text-[var(--wc-text-dim)]">{shortcut}</span>}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-[var(--wc-text-dim)] uppercase tracking-wide">{children}</div>;
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-[var(--wc-border)]" />;
}

/** Hook kecil: state buka/tutup + elemen jangkar untuk Popover. */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return { open, setOpen, anchor, setAnchor, close: () => setOpen(false) };
}

/** Tombol + panah dropdown (Underline, Highlight, Font Color, Bullets…). */
export function SplitButton({ icon, title, onClick, active, disabled, menu, swatch }: ButtonProps & {
  menu: (close: () => void) => ReactNode;
  swatch?: string | null;
}) {
  const pop = usePopover();
  return (
    <div ref={pop.setAnchor} className={`inline-flex items-stretch h-[26px] rounded-[4px] ${active ? btnChecked : ''}`}>
      <button
        type="button"
        title={title}
        aria-pressed={active}
        disabled={disabled}
        onMouseDown={keepFocus}
        onClick={onClick}
        className={`${btnBase} relative w-[24px] rounded-r-none`}
      >
        <span className="flex items-center [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        {swatch !== undefined && (
          <span
            className="absolute left-[5px] right-[5px] bottom-[3px] h-[3px] rounded-[1px]"
            style={{ background: swatch || 'transparent', outline: swatch ? 'none' : '1px solid var(--wc-border-strong)' }}
          />
        )}
      </button>
      <button
        type="button"
        title={`${title} options`}
        disabled={disabled}
        onMouseDown={keepFocus}
        onClick={() => pop.setOpen(o => !o)}
        className={`${btnBase} w-[12px] rounded-l-none`}
      >
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      <Popover anchor={pop.anchor} open={pop.open} onClose={pop.close}>{menu(pop.close)}</Popover>
    </div>
  );
}

/** Tombol yang membuka menu (Paste ▾, Change Case ▾, Line Spacing ▾ …). */
export function MenuButton({ icon, label, title, big, disabled, active, menu, align }: ButtonProps & {
  big?: boolean;
  menu: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
}) {
  const pop = usePopover();
  return (
    <div ref={pop.setAnchor} className={big ? 'h-full' : 'inline-flex'}>
      {big ? (
        <BigButton icon={icon} label={label} title={title} disabled={disabled} active={active || pop.open} dropdown onClick={() => pop.setOpen(o => !o)} />
      ) : (
        <button
          type="button"
          title={title}
          disabled={disabled}
          onMouseDown={keepFocus}
          onClick={() => pop.setOpen(o => !o)}
          className={`${btnBase} h-[26px] px-1 gap-0.5 ${active || pop.open ? btnChecked : ''}`}
        >
          {icon && <span className="flex items-center [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
          {label && <span className="text-[12.5px] text-[var(--wc-text)] whitespace-nowrap">{label}</span>}
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      )}
      <Popover anchor={pop.anchor} open={pop.open} onClose={pop.close} align={align}>{menu(pop.close)}</Popover>
    </div>
  );
}

/* ---------------------------------------------------------------- Combo box */

/**
 * Kotak isian + daftar (Font, Font Size). Bisa diketik (Enter untuk menerapkan) atau
 * dipilih dari daftar. `renderItem` dipakai untuk pratinjau nama font dengan font itu.
 */
export function ComboBox({ value, items, width, title, onCommit, renderItem, placeholder }: {
  value: string;
  items: string[];
  width: number;
  title: string;
  onCommit: (value: string) => void;
  renderItem?: (item: string) => ReactNode;
  placeholder?: string;
}) {
  const pop = usePopover();
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = (v: string) => {
    setEditing(false);
    pop.close();
    if (v.trim()) onCommit(v.trim());
  };

  return (
    <div ref={pop.setAnchor} className="inline-flex h-[24px] shrink-0" style={{ width }} title={title}>
      <input
        value={draft}
        placeholder={placeholder}
        onFocus={(e) => { setEditing(true); e.currentTarget.select(); }}
        onBlur={() => setEditing(false)}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(draft); }
          if (e.key === 'Escape') { setDraft(value); (e.target as HTMLInputElement).blur(); }
        }}
        className="min-w-0 flex-1 h-full px-1.5 text-[12.5px] bg-[var(--wc-input)] text-[var(--wc-text)] border border-[var(--wc-input-border)] border-r-0 rounded-l-[3px] outline-none focus:border-[var(--wc-accent)]"
      />
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => pop.setOpen(o => !o)}
        className="w-[16px] h-full flex items-center justify-center bg-[var(--wc-input)] border border-[var(--wc-input-border)] rounded-r-[3px] text-[var(--wc-icon)] hover:bg-[var(--wc-hover)]"
      >
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      <Popover anchor={pop.anchor} open={pop.open} onClose={pop.close}>
        {items.map(item => (
          <MenuItem key={item} active={item === value} onClick={() => commit(item)}>
            {renderItem ? renderItem(item) : item}
          </MenuItem>
        ))}
      </Popover>
    </div>
  );
}

/* ---------------------------------------------------------------- Palet warna */

const THEME_ROWS = [
  ['#000000', '#FFFFFF', '#44546A', '#E7E6E6', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
  ['#7F7F7F', '#F2F2F2', '#D6DCE4', '#D0CECE', '#D9E2F3', '#FBE5D5', '#EDEDED', '#FFF2CC', '#DEEBF6', '#E2EFD9'],
  ['#595959', '#D8D8D8', '#ADB9CA', '#AEABAB', '#B4C6E7', '#F7CBAC', '#DBDBDB', '#FEE599', '#BDD7EE', '#C5E0B3'],
  ['#3F3F3F', '#BFBFBF', '#8496B0', '#757070', '#8EAADB', '#F4B183', '#C9C9C9', '#FFD965', '#9CC3E5', '#A8D08D'],
  ['#262626', '#A5A5A5', '#323F4F', '#3A3838', '#2F5496', '#C55A11', '#7B7B7B', '#BF9000', '#2E75B5', '#538135'],
];
const STANDARD = ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'];
export const HIGHLIGHT_COLORS = ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#0000FF', '#FF0000', '#000080', '#008080', '#008000', '#800080', '#800000', '#808000', '#808080', '#C0C0C0', '#000000'];

function Swatch({ color, onPick, active }: { color: string; onPick: (c: string) => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={color}
      onMouseDown={keepFocus}
      onClick={() => onPick(color)}
      className={`w-[18px] h-[18px] border ${active ? 'border-[var(--wc-accent)] ring-1 ring-[var(--wc-accent)]' : 'border-[var(--wc-border-strong)]'} hover:scale-110 transition-transform`}
      style={{ background: color }}
    />
  );
}

export function ColorPalette({ onPick, onReset, resetLabel, current, highlight }: {
  onPick: (color: string) => void;
  onReset: () => void;
  resetLabel: string;
  current?: string | null;
  highlight?: boolean;
}) {
  const cur = current?.toUpperCase();
  return (
    <div className="px-3 py-2 w-[232px]">
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={onReset}
        className="w-full flex items-center gap-2 px-1.5 py-1 mb-2 text-[13px] rounded hover:bg-[var(--wc-hover)]"
      >
        <span className="w-[18px] h-[18px] border border-[var(--wc-border-strong)] bg-[linear-gradient(135deg,transparent_45%,#d13b3b_45%,#d13b3b_55%,transparent_55%)]" />
        {resetLabel}
      </button>
      {highlight ? (
        <div className="grid grid-cols-5 gap-1">
          {HIGHLIGHT_COLORS.map(c => <Swatch key={c} color={c} onPick={onPick} active={cur === c} />)}
        </div>
      ) : (
        <>
          <MenuLabel>Theme Colors</MenuLabel>
          <div className="flex flex-col gap-[2px]">
            {THEME_ROWS.map((row, i) => (
              <div key={i} className={`flex gap-[2px] ${i === 0 ? 'mb-1' : ''}`}>
                {row.map(c => <Swatch key={c} color={c} onPick={onPick} active={cur === c} />)}
              </div>
            ))}
          </div>
          <MenuLabel>Standard Colors</MenuLabel>
          <div className="flex gap-[2px]">
            {STANDARD.map(c => <Swatch key={c} color={c} onPick={onPick} active={cur === c} />)}
          </div>
          <label className="mt-2 flex items-center gap-2 px-1.5 py-1 text-[13px] rounded hover:bg-[var(--wc-hover)] cursor-pointer">
            <input
              type="color"
              className="w-[18px] h-[18px] p-0 border-0 bg-transparent cursor-pointer"
              defaultValue={current || '#000000'}
              onChange={(e) => onPick(e.target.value)}
            />
            More Colors…
          </label>
        </>
      )}
    </div>
  );
}
