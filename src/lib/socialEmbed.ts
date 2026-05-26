/**
 * Extract Instagram Post ID from URL.
 */
function extractInstagramId(url: string): string | null {
  try {
    const match = url.match(/\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  } catch {
    // ignore
  }
  return null;
}

/**
 * Extract X/Twitter Status ID and User from URL.
 */
function extractXDetails(url: string): { user: string; id: string } | null {
  try {
    const match = url.match(/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/);
    if (match) {
      return { user: match[1], id: match[2] };
    }
  } catch {
    // ignore
  }
  return null;
}

// Regex to find Instagram URLs in <a> tags
const IG_LINK_REGEX =
  /<a[^>]*href="(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

// Regex to find bare Instagram URLs, ignoring ones inside attributes
const IG_URL_REGEX =
  /(?<!href=")(?<!src=")(?<!href=')(?<!src=')https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)\/?[^\s"<>']*/gi;

// Regex to find X/Twitter URLs in <a> tags
const X_LINK_REGEX =
  /<a[^>]*href="(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

// Regex to find bare X/Twitter URLs, ignoring ones inside attributes
const X_URL_REGEX =
  /(?<!href=")(?<!src=")(?<!href=')(?<!src=')https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)\/?[^\s"<>']*/gi;

/**
 * Replace Instagram links with clean embedded iframes (no captions/comments).
 */
export function embedInstagram(html: string): string {
  // 1) Replace <a> tags that contain Instagram post links, keeping the original anchor text as a fallback
  html = html.replace(IG_LINK_REGEX, (match, url: string, id: string, anchorText: string) => {
    const igId = extractInstagramId(url);
    if (igId) return igIframe(igId, anchorText);
    return match;
  });

  // 2) Replace bare Instagram URLs
  html = html.replace(IG_URL_REGEX, (url: string) => {
    const id = extractInstagramId(url);
    if (id) return igIframe(id);
    return url;
  });

  return html;
}

/**
 * Replace X/Twitter links with blockquote placeholders for widget hydration.
 */
export function embedX(html: string): string {
  // 1) Replace <a> tags that contain Twitter/X status links, keeping the original anchor text as a fallback
  html = html.replace(X_LINK_REGEX, (match, url: string, user: string, id: string, anchorText: string) => {
    const details = extractXDetails(url);
    if (details) return xBlockquote(url, details.user, details.id, anchorText);
    return match;
  });

  // 2) Replace bare Twitter/X URLs
  html = html.replace(X_URL_REGEX, (url: string) => {
    const details = extractXDetails(url);
    if (details) return xBlockquote(url, details.user, details.id);
    return url;
  });

  return html;
}

function igIframe(postId: string, fallbackText?: string): string {
  const displayText = fallbackText || 'View Post on Instagram';
  return (
    '<div class="instagram-embed-container" style="display:flex;flex-direction:column;align-items:center;margin:1.5rem 0;width:100%;">' +
      `<iframe ` +
        `src="https://www.instagram.com/p/${postId}/embed/" ` +
        `class="instagram-media" ` +
        `allowtransparency="true" ` +
        `frameborder="0" ` +
        `scrolling="no" ` +
        `style="background:#FFF;border-radius:12px;border:1px solid var(--color-hairline);margin:0;max-width:540px;width:100%;height:580px;display:block;"` +
      `></iframe>` +
      `<a href="https://www.instagram.com/p/${postId}/" target="_blank" rel="noopener noreferrer" style="margin-top:0.5rem;font-size:0.875rem;color:var(--color-ink);opacity:0.6;text-decoration:underline;">` +
        `${displayText}` +
      `</a>` +
    '</div>'
  );
}

function xBlockquote(url: string, user: string, id: string, fallbackText?: string): string {
  const displayText = fallbackText || `View tweet by @${user}`;
  return (
    '<div class="x-tweet-container" style="display:flex;justify-content:center;margin:1.5rem 0;width:100%;min-height:220px;">' +
      `<blockquote class="twitter-tweet" data-theme="dark" data-align="center" style="max-width:550px;width:100%;">` +
        `<a href="https://twitter.com/${user}/status/${id}">${displayText}</a>` +
      `</blockquote>` +
    '</div>'
  );
}
