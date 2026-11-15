import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { searchPluginKey } from '../../lib/searchReplace';
import { detectSocialEmbed } from '../../lib/markdownConverter';

/* ---------------------------------------------------------------- Find & Replace */

export function FindReplaceBar({ editor, withReplace, onClose }: {
  editor: Editor;
  withReplace: boolean;
  onClose: () => void;
}) {
  const [term, setTerm] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(withReplace);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setShowReplace(withReplace); inputRef.current?.focus(); }, [withReplace]);
  useEffect(() => {
    // Mulai dari teks terpilih, seperti Word.
    const { from, to, empty } = editor.state.selection;
    if (!empty) setTerm(editor.state.doc.textBetween(from, to, ' ').slice(0, 100));
    return () => { editor.commands.clearSearch(); };
  }, [editor]);
  useEffect(() => { editor.commands.setSearchTerm(term, caseSensitive); }, [editor, term, caseSensitive]);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e || e.isDestroyed) return { count: 0, current: 0 };
      const st = searchPluginKey.getState(e.state);
      return { count: st?.matches.length ?? 0, current: st?.current ?? 0 };
    },
  });

  const field = 'h-[26px] px-2 text-[13px] bg-[var(--wc-input)] text-[var(--wc-text)] border border-[var(--wc-input-border)] rounded-[3px] outline-none focus:border-[var(--wc-accent)] w-[200px]';
  const btn = 'h-[26px] px-2 text-[12.5px] rounded-[3px] border border-[var(--wc-border-strong)] hover:bg-[var(--wc-hover)] disabled:opacity-40';

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-[var(--wc-border)] bg-[var(--wc-ribbon)] text-[var(--wc-text)]">
      <input
        ref={inputRef}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); editor.commands.gotoSearchMatch(e.shiftKey ? -1 : 1); }
          if (e.key === 'Escape') onClose();
        }}
        placeholder="Find in document"
        className={field}
      />
      <span className="text-[12px] text-[var(--wc-text-dim)] min-w-[64px]">
        {term ? (s.count ? `${s.current + 1} of ${s.count}` : 'No results') : ''}
      </span>
      <button type="button" title="Previous (Shift+Enter)" className={btn} disabled={!s.count} onClick={() => editor.commands.gotoSearchMatch(-1)}><ChevronUp className="w-3.5 h-3.5" /></button>
      <button type="button" title="Next (Enter)" className={btn} disabled={!s.count} onClick={() => editor.commands.gotoSearchMatch(1)}><ChevronDown className="w-3.5 h-3.5" /></button>
      <label className="flex items-center gap-1 text-[12px] text-[var(--wc-text-dim)]">
        <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
        Match case
      </label>
      {showReplace ? (
        <>
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            placeholder="Replace with"
            className={field}
          />
          <button type="button" className={btn} disabled={!s.count} onClick={() => editor.chain().replaceCurrentMatch(replacement).run()}>Replace</button>
          <button type="button" className={btn} disabled={!s.count} onClick={() => editor.chain().replaceAllMatches(replacement).run()}>Replace All</button>
        </>
      ) : (
        <button type="button" className={btn} onClick={() => setShowReplace(true)}>Replace…</button>
      )}
      <button type="button" title="Close (Esc)" onClick={onClose} className="ml-auto p-1 rounded hover:bg-[var(--wc-hover)]"><X className="w-4 h-4" /></button>
    </div>
  );
}

/* ---------------------------------------------------------------- Insert › Table */

export function TableGridPicker({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const MAX_R = 8, MAX_C = 10;
  return (
    <div className="px-3 py-2">
      <div className="text-[12px] mb-1.5 text-[var(--wc-text-dim)]">
        {hover.r && hover.c ? `${hover.c} × ${hover.r} Table` : 'Insert Table'}
      </div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${MAX_C}, 16px)` }} onMouseLeave={() => setHover({ r: 0, c: 0 })}>
        {Array.from({ length: MAX_R * MAX_C }, (_, i) => {
          const r = Math.floor(i / MAX_C) + 1;
          const c = (i % MAX_C) + 1;
          const on = r <= hover.r && c <= hover.c;
          return (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => onPick(r, c)}
              className={`w-4 h-4 border ${on ? 'bg-[var(--wc-checked)] border-[var(--wc-accent)]' : 'bg-[var(--wc-input)] border-[var(--wc-border-strong)]'}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Insert › Online Video / Post */

export function EmbedForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const social = detectSocialEmbed(url);
    if (!social) {
      setError('Hanya link YouTube, Instagram (post/reel), atau X/Twitter (status).');
      return;
    }
    editor.chain().focus().insertContent({
      type: 'socialEmbed',
      attrs: { url: url.trim(), type: social.type, width: '100%', alignment: 'center' },
    }).run();
    onDone();
  };
  return (
    <div className="px-3 py-2 w-[340px]">
      <div className="text-[12px] mb-1.5 text-[var(--wc-text-dim)]">Tempel link YouTube, Instagram, atau X</div>
      <div className="flex gap-1.5">
        <input
          autoFocus
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="https://…"
          className="flex-1 h-[28px] px-2 text-[13px] bg-[var(--wc-input)] text-[var(--wc-text)] border border-[var(--wc-input-border)] rounded-[3px] outline-none focus:border-[var(--wc-accent)]"
        />
        <button type="button" onClick={submit} className="h-[28px] px-3 text-[12.5px] rounded-[3px] bg-[var(--wc-accent)] text-white hover:opacity-90">Insert</button>
      </div>
      {error && <div className="mt-1.5 text-[12px] text-[#d13b3b]">{error}</div>}
    </div>
  );
}
