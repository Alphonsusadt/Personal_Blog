/**
 * Link proyek (GitHub, Paper, Live Demo) per bahasa.
 *
 * Disimpan seperti judul: { id: '…', en: '…' }. Data lama berupa string biasa tetap
 * berlaku sebagai link "bersama" (muncul di kedua bahasa) sampai diubah di CMS.
 *
 * Aturan tampil di web:
 *  - hanya ada di satu bahasa  → tampil di kedua bahasa;
 *  - ada di dua bahasa, URL beda → tampil dua-duanya dengan label (ID) / (EN);
 *  - URL sama                   → tampil sekali;
 *  - kosong                     → tidak tampil.
 */
import type { LocalizedText, SiteLanguage } from './localized';

export type ProjectLinkValue = string | LocalizedText | null | undefined;
export const PROJECT_LINK_FIELDS = ['githubUrl', 'paperUrl', 'demoUrl'] as const;
export type ProjectLinkField = (typeof PROJECT_LINK_FIELDS)[number];

function parse(value: ProjectLinkValue): { shared: string } | { id: string; en: string } {
  let v: unknown = value;
  if (typeof v === 'string' && v.trim().startsWith('{')) {
    try { v = JSON.parse(v); } catch { /* string biasa */ }
  }
  if (typeof v === 'string') return { shared: v.trim() };
  if (v && typeof v === 'object') {
    const o = v as LocalizedText;
    return { id: (typeof o.id === 'string' ? o.id : '').trim(), en: (typeof o.en === 'string' ? o.en : '').trim() };
  }
  return { shared: '' };
}

/** Isi kotak link di CMS untuk tab bahasa tertentu (link lama = sama di kedua tab). */
export function linkForLanguage(value: ProjectLinkValue, lang: SiteLanguage): string {
  const p = parse(value);
  return 'shared' in p ? p.shared : p[lang];
}

/** Link untuk bahasa lain (dipakai sebagai keterangan kecil di CMS). */
export function otherLanguageLink(value: ProjectLinkValue, lang: SiteLanguage): string {
  const p = parse(value);
  if ('shared' in p) return '';
  return p[lang === 'id' ? 'en' : 'id'];
}

/** Simpan link untuk satu bahasa tanpa mengubah bahasa lainnya. */
export function setLinkForLanguage(value: ProjectLinkValue, lang: SiteLanguage, next: string): LocalizedText | '' {
  const p = parse(value);
  const base = 'shared' in p ? { id: p.shared, en: p.shared } : { id: p.id, en: p.en };
  const out = { ...base, [lang]: next.trim() };
  return out.id || out.en ? out : '';
}

/** Ada link (di bahasa mana pun)? */
export function hasProjectLink(value: ProjectLinkValue): boolean {
  const p = parse(value);
  return 'shared' in p ? !!p.shared : !!(p.id || p.en);
}

export interface DisplayLink { url: string; tag?: 'ID' | 'EN' }

/** Link yang ditampilkan di web, bahasa halaman lebih dulu. */
export function displayLinks(value: ProjectLinkValue, lang: SiteLanguage): DisplayLink[] {
  const p = parse(value);
  if ('shared' in p) return p.shared ? [{ url: p.shared }] : [];
  if (p.id && p.en && p.id !== p.en) {
    const both: DisplayLink[] = [{ url: p.id, tag: 'ID' }, { url: p.en, tag: 'EN' }];
    return lang === 'en' ? both.reverse() : both;
  }
  const one = p.id || p.en;
  return one ? [{ url: one }] : [];
}
