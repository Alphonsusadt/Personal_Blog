/**
 * Find & Replace untuk editor ribbon (Home › Editing). Menyorot semua hasil dengan
 * dekorasi ProseMirror, tanpa mengubah dokumen sampai pengguna menekan Replace.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface SearchMatch { from: number; to: number }

export interface SearchState {
  term: string;
  caseSensitive: boolean;
  matches: SearchMatch[];
  current: number;
}

export const searchPluginKey = new PluginKey<SearchState>('wcSearch');

function findMatches(doc: PMNode, term: string, caseSensitive: boolean): SearchMatch[] {
  if (!term) return [];
  const needle = caseSensitive ? term : term.toLowerCase();
  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const hay = caseSensitive ? node.text : node.text.toLowerCase();
    let i = hay.indexOf(needle);
    while (i !== -1) {
      matches.push({ from: pos + i, to: pos + i + needle.length });
      i = hay.indexOf(needle, i + needle.length);
    }
  });
  return matches;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wcSearch: {
      setSearchTerm: (term: string, caseSensitive?: boolean) => ReturnType;
      gotoSearchMatch: (direction: 1 | -1) => ReturnType;
      replaceCurrentMatch: (replacement: string) => ReturnType;
      replaceAllMatches: (replacement: string) => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export const SearchReplace = Extension.create({
  name: 'wcSearch',

  addCommands() {
    const meta = (tr: any, state: Partial<SearchState>) => tr.setMeta(searchPluginKey, state);
    return {
      setSearchTerm: (term, caseSensitive = false) => ({ tr, dispatch }) => {
        if (dispatch) meta(tr, { term, caseSensitive, current: 0 });
        return true;
      },
      gotoSearchMatch: (direction) => ({ state, tr, dispatch, view }) => {
        const s = searchPluginKey.getState(state);
        if (!s || !s.matches.length) return false;
        const current = (s.current + direction + s.matches.length) % s.matches.length;
        if (dispatch) {
          meta(tr, { current });
          const m = s.matches[current];
          const dom = view.domAtPos(m.from).node as HTMLElement;
          (dom.nodeType === 1 ? dom : dom.parentElement)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        return true;
      },
      replaceCurrentMatch: (replacement) => ({ state, tr, dispatch }) => {
        const s = searchPluginKey.getState(state);
        const m = s?.matches[s.current];
        if (!m) return false;
        if (dispatch) {
          if (replacement) tr.insertText(replacement, m.from, m.to);
          else tr.delete(m.from, m.to);
        }
        return true;
      },
      replaceAllMatches: (replacement) => ({ state, tr, dispatch }) => {
        const s = searchPluginKey.getState(state);
        if (!s || !s.matches.length) return false;
        if (dispatch) {
          // Dari belakang ke depan supaya posisi hasil sebelumnya tetap valid.
          for (const m of [...s.matches].reverse()) {
            if (replacement) tr.insertText(replacement, m.from, m.to);
            else tr.delete(m.from, m.to);
          }
        }
        return true;
      },
      clearSearch: () => ({ tr, dispatch }) => {
        if (dispatch) meta(tr, { term: '', current: 0 });
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchPluginKey,
        state: {
          init: () => ({ term: '', caseSensitive: false, matches: [], current: 0 }),
          apply(tr, prev) {
            const m = tr.getMeta(searchPluginKey) as Partial<SearchState> | undefined;
            if (!m && !tr.docChanged) return prev;
            const next = { ...prev, ...(m || {}) };
            next.matches = findMatches(tr.doc, next.term, next.caseSensitive);
            if (next.current >= next.matches.length) next.current = 0;
            return next;
          },
        },
        props: {
          decorations(state) {
            const s = searchPluginKey.getState(state);
            if (!s || !s.matches.length) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              s.matches.map((m, i) =>
                Decoration.inline(m.from, m.to, { class: i === s.current ? 'wc-search-match wc-search-current' : 'wc-search-match' }),
              ),
            );
          },
        },
      }),
    ];
  },
});
