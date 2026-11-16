/**
 * Embed YouTube / Instagram / X yang ditata seperti foto (wrap, drag, resize, caption).
 *
 * Embed disimpan di dalam paragraf sebagai <span class="wc-figure wc-embed …">, jadi semua
 * markup render-nya juga harus inline (span + iframe). Elemen blok seperti <div> atau
 * <blockquote> di dalam <p> akan menutup paragraf saat HTML di-parse ulang oleh browser,
 * sehingga tata letaknya rusak — karena itu post X tidak dirender sebagai blockquote, tetapi
 * dimuat lewat widget resmi X ke dalam span (lihat hydrateRichEmbeds).
 */
export type EmbedType = 'youtube' | 'instagram' | 'twitter';

export function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[1];
    }
    if (u.hostname === 'youtu.be') return u.pathname.slice(1, 12) || null;
  } catch { /* bukan URL valid */ }
  const m = url.match(/(?:[?&]v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function instagramId(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export function tweetId(url: string): string | null {
  const m = url.match(/(?:twitter|x)\.com\/[^/]+\/status\/(\d+)/);
  return m ? m[1] : null;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Markup publik (semua inline) untuk satu embed. */
export function embedMarkup(type: string, url: string): string {
  if (type === 'youtube') {
    const id = youTubeId(url);
    if (id) {
      return `<span class="wc-embed-media wc-embed-youtube"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></span>`;
    }
  } else if (type === 'instagram') {
    const id = instagramId(url);
    if (id) {
      return `<span class="wc-embed-media wc-embed-instagram"><iframe src="https://www.instagram.com/p/${id}/embed/" title="Post Instagram" loading="lazy" scrolling="no"></iframe></span>`;
    }
  } else if (type === 'twitter') {
    const id = tweetId(url);
    if (id) {
      return `<span class="wc-embed-media wc-embed-x" data-tweet-id="${id}"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Lihat post di X</a></span>`;
    }
  }
  return `<span class="wc-embed-media"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a></span>`;
}

/* ---------------------------------------------------------------- Widget X */

let twitterLoading: Promise<any> | null = null;
export function loadTwitterWidgets(): Promise<any> {
  const w = window as any;
  if (w.twttr?.widgets) return Promise.resolve(w.twttr);
  if (!twitterLoading) {
    twitterLoading = new Promise((resolve) => {
      const done = () => resolve((window as any).twttr);
      let s = document.getElementById('twitter-wjs') as HTMLScriptElement | null;
      if (!s) {
        s = document.createElement('script');
        s.id = 'twitter-wjs';
        s.src = 'https://platform.twitter.com/widgets.js';
        s.async = true;
        document.head.appendChild(s);
      }
      const poll = setInterval(() => { if ((window as any).twttr?.widgets) { clearInterval(poll); done(); } }, 100);
      setTimeout(() => { clearInterval(poll); done(); }, 15000);
    });
  }
  return twitterLoading;
}

/** Muat post X ke dalam span .wc-embed-x yang belum dimuat. */
export async function hydrateRichEmbeds(root: ParentNode = document): Promise<void> {
  const targets = Array.from(root.querySelectorAll<HTMLElement>('.wc-embed-x[data-tweet-id]:not([data-hydrated])'));
  if (!targets.length) return;
  targets.forEach(el => el.setAttribute('data-hydrated', 'pending'));
  const twttr = await loadTwitterWidgets();
  for (const el of targets) {
    if (!twttr?.widgets?.createTweet) { el.setAttribute('data-hydrated', 'failed'); continue; }
    const dark = document.documentElement.classList.contains('dark');
    try {
      const fallback = el.innerHTML;
      el.innerHTML = '';
      const res = await twttr.widgets.createTweet(el.dataset.tweetId, el, { theme: dark ? 'dark' : 'light', dnt: true, conversation: 'none', align: 'center' });
      if (!res) el.innerHTML = fallback; // post dihapus / privat → tetap tampilkan tautan
      el.setAttribute('data-hydrated', 'done');
    } catch {
      el.setAttribute('data-hydrated', 'failed');
    }
  }
}

/**
 * Pengamat global: setiap kali konten rich muncul di halaman (detail tulisan, preview,
 * halaman penuh), post X di dalamnya dimuat otomatis — tanpa perlu kode di tiap halaman.
 */
let observing = false;
export function watchRichEmbeds(): void {
  if (observing || typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  observing = true;
  let scheduled = false;
  const run = () => { scheduled = false; void hydrateRichEmbeds(); };
  new MutationObserver(() => { if (!scheduled) { scheduled = true; setTimeout(run, 50); } })
    .observe(document.body, { childList: true, subtree: true });
  run();
}
