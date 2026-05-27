/**
 * Extract YouTube video ID from various URL formats.
 * Handles all common YouTube URL formats.
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    // youtube.com/watch?v=...
    if (
      (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') &&
      parsed.pathname === '/watch'
    ) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    }
    // youtu.be/...
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    // youtube.com/embed/..., youtube.com/shorts/..., youtube.com/v/...
    if (
      parsed.hostname === 'www.youtube.com' ||
      parsed.hostname === 'youtube.com' ||
      parsed.hostname === 'www.youtube-nocookie.com' ||
      parsed.hostname === 'youtube-nocookie.com'
    ) {
      const match = parsed.pathname.match(/^\/(?:embed|v|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (match) return match[1];
    }
  } catch {
    // URL parsing failed, try regex fallback
    const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    const m2 = url.match(/(?:youtu\.be|embed|shorts|\/v\/)\/([a-zA-Z0-9_-]{11})/);
    if (m2) return m2[1];
  }
  return null;
}

/**
 * Simple regex to find YouTube URLs in text (not inside HTML tags).
 * Matches: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
 */
const YT_URL_REGEX =
  /(?<!href=")(?<!src=")(?<!href=')(?<!src=')https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^"'\s<>]*?v=[a-zA-Z0-9_-]{11}|embed\/[a-zA-Z0-9_-]{11}|shorts\/[a-zA-Z0-9_-]{11})|youtu\.be\/[a-zA-Z0-9_-]{11})[^\s"<>']*/gi;

/**
 * Regex to find YouTube URLs inside <a> tag href attributes.
 */
const YT_LINK_REGEX =
  /<a[^>]*href="(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^"']*?v=[a-zA-Z0-9_-]{11}|embed\/[a-zA-Z0-9_-]{11}|shorts\/[a-zA-Z0-9_-]{11})|youtu\.be\/[a-zA-Z0-9_-]{11})[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

/**
 * Replace YouTube links in rendered HTML with responsive iframe embeds.
 */
export function embedYouTube(html: string): string {
  // 1) Replace <a> tags where the href is a YouTube URL
  html = html.replace(YT_LINK_REGEX, (_match, url: string) => {
    const id = extractYouTubeId(url);
    if (id) return ytIframe(id);
    return _match;
  });

  // 2) Replace bare YouTube URLs (already wrapped in <p> or not)
  html = html.replace(YT_URL_REGEX, (url: string) => {
    const id = extractYouTubeId(url);
    if (id) return ytIframe(id);
    return url;
  });

  return html;
}

export function ytIframe(videoId: string): string {

  return (
    '<div class="yt-embed-container">' +
      '<div class="yt-embed-wrapper">' +
        '<iframe ' +
          `src="https://www.youtube.com/embed/${videoId}" ` +
          'title="YouTube video player" ' +
          'frameborder="0" ' +
          'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
          'allowfullscreen' +
        '></iframe>' +
      '</div>' +
    '</div>'
  );
}
