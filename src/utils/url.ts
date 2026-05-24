/**
 * Ensures that a URL is formatted as an absolute external URL.
 * If the URL starts with www. or doesn't have a protocol (and is not an email/hash/relative path),
 * it prepends 'https://'.
 */
export function formatExternalUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  
  // If it's already an absolute URL (starts with http:// or https:// or mailto: or tel:)
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  
  // If it's an email address without mailto:
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }
  
  // Otherwise, if it starts with www. or any other host/domain format
  return `https://${trimmed}`;
}
