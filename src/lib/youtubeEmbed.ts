/**
 * Extract YouTube video ID from various URL formats.
 * Returns null if the URL is not a YouTube link.
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const YT_URL_PATTERN = 'https?:\\/\\/(?:www\\.)?(?:youtube\\.com\\/watch\\?.*?v=[a-zA-Z0-9_-]{11}[\\s\\S]*?|youtu\\.be\\/[a-zA-Z0-9_-]{11}|youtube\\.com\\/embed\\/[a-zA-Z0-9_-]{11}|youtube\\.com\\/shorts\\/[a-zA-Z0-9_-]{11})';

/**
 * Replace YouTube links in rendered HTML with responsive iframe embeds.
 * Handles:
 *   - <a> tags where href is a YouTube URL
 *   - Bare YouTube URLs on their own line (inside <p>)
 *   - Bare YouTube URLs mixed with text (inside <p>)
 */
export function embedYouTube(html: string): string {
  // 1) Replace <a> tags where the href is a YouTube URL
  html = html.replace(
    new RegExp(`<a[^>]*href="(${YT_URL_PATTERN})"[^>]*>([^<]*)<\\/a>`, 'gi'),
    (_match, url: string) => {
      const id = extractYouTubeId(url);
      if (id) return ytIframe(id);
      return _match;
    },
  );

  // 2) Replace <p> that contains ONLY a bare YouTube URL
  html = html.replace(
    new RegExp(`<p[^>]*>\\s*(${YT_URL_PATTERN})\\s*<\\/p>`, 'gi'),
    (_match, url: string) => {
      const id = extractYouTubeId(url);
      if (id) return ytIframe(id);
      return _match;
    },
  );

  // 3) Replace bare YouTube URLs mixed with other text inside <p> tags
  html = html.replace(
    new RegExp(`(${YT_URL_PATTERN})`, 'gi'),
    (_match, url: string) => {
      const id = extractYouTubeId(url);
      if (id) return ytIframe(id);
      return _match;
    },
  );

  return html;
}

function ytIframe(videoId: string): string {
  return `<div class="my-6 relative w-full" style="padding-bottom:56.25%"><iframe class="absolute inset-0 w-full h-full rounded-lg" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
}
