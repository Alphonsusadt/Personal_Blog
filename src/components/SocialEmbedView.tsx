/**
 * Pratinjau embed (YouTube / Instagram / X) di dalam editor. Ditampilkan oleh ImageNodeView,
 * jadi embed mendapat semua fitur tata letak gambar (wrap, geser bebas, resize, caption).
 *
 * Lapisan transparan di atas iframe menangkap klik/drag supaya embed bisa dipilih dan
 * dipindah seperti gambar — memutar video cukup dilakukan di halaman publik.
 */
import { useEffect, useRef, useState } from 'react';
import { Youtube, Instagram, Twitter, Loader2, AlertCircle } from 'lucide-react';
import { instagramId, loadTwitterWidgets, tweetId, youTubeId } from '../lib/embedMedia';

const LABEL: Record<string, string> = { youtube: 'YouTube', instagram: 'Instagram', twitter: 'X' };

function Invalid({ type, url }: { type: string; url: string }) {
  return (
    <span className="wc-embed-invalid">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span>Tautan {LABEL[type] ?? type} tidak dikenali: {url}</span>
    </span>
  );
}

function TweetPreview({ url }: { url: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<'loading' | 'done' | 'failed'>('loading');
  const id = tweetId(url);

  useEffect(() => {
    let alive = true;
    const el = ref.current;
    if (!el || !id) return;
    setState('loading');
    el.innerHTML = '';
    loadTwitterWidgets().then(async (twttr) => {
      if (!alive) return;
      if (!twttr?.widgets?.createTweet) { setState('failed'); return; }
      try {
        const res = await twttr.widgets.createTweet(id, el, { theme: 'light', dnt: true, conversation: 'none', align: 'center' });
        if (alive) setState(res ? 'done' : 'failed');
      } catch {
        if (alive) setState('failed');
      }
    });
    return () => { alive = false; if (el) el.innerHTML = ''; };
  }, [id]);

  if (!id) return <Invalid type="twitter" url={url} />;
  return (
    <span className="wc-embed-media wc-embed-x">
      <span ref={ref} className="wc-embed-x-target" />
      {state === 'loading' && (
        <span className="wc-embed-status"><Loader2 className="w-5 h-5 animate-spin" /> Memuat post X…</span>
      )}
      {state === 'failed' && (
        <span className="wc-embed-status"><Twitter className="w-5 h-5" /> Post X tidak dapat dimuat (dihapus/privat?)</span>
      )}
    </span>
  );
}

export function EmbedPreview({ type, url }: { type: string; url: string }) {
  let media: React.ReactNode;
  if (type === 'youtube') {
    const id = youTubeId(url);
    media = id ? (
      <span className="wc-embed-media wc-embed-youtube">
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="Video YouTube" tabIndex={-1} />
      </span>
    ) : <Invalid type={type} url={url} />;
  } else if (type === 'instagram') {
    const id = instagramId(url);
    media = id ? (
      <span className="wc-embed-media wc-embed-instagram">
        <iframe src={`https://www.instagram.com/p/${id}/embed/`} title="Post Instagram" scrolling="no" tabIndex={-1} />
      </span>
    ) : <Invalid type={type} url={url} />;
  } else if (type === 'twitter') {
    media = <TweetPreview url={url} />;
  } else {
    media = <Invalid type={type} url={url} />;
  }

  return (
    <span className="wc-embed-preview">
      {media}
      {/* Menangkap klik & drag di atas iframe (iframe menelan event mouse). */}
      <span className="wc-embed-shield" aria-hidden="true">
        <span className="wc-embed-badge">
          {type === 'youtube' && <Youtube className="w-3.5 h-3.5" />}
          {type === 'instagram' && <Instagram className="w-3.5 h-3.5" />}
          {type === 'twitter' && <Twitter className="w-3.5 h-3.5" />}
          {LABEL[type] ?? 'Embed'}
        </span>
      </span>
    </span>
  );
}
