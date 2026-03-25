/**
 * Universal Media Utilities
 * Framework-agnostic utilities untuk handling base64 images di semua section CMS
 * Bisa diimport di: Writings, Projects, Books, About Page, Home Page
 */

/**
 * Strip base64 images dari konten
 * Menghapus semua markdown image syntax dengan base64 data
 * @param content - Konten dengan markdown syntax
 * @returns Konten tanpa base64 images
 */
export function stripBase64(content: string): string {
  // Remove markdown image syntax: ![alt](data:image/...)
  return content.replace(/!\[[^\]]*\]\(data:[^)]*\)/g, '')
    // Remove juga dalam case kemungkinan HTML img tags dengan src base64
    .replace(/<img[^>]+src="data:[^"]*"[^>]*>/g, '')
    // Remove extra whitespace yang tersisa
    .replace(/\n\n+/g, '\n')
    .trim();
}

/**
 * Hitung jumlah kata dari konten
 * Otomatis strip base64 sebelum menghitung
 * @param content - Konten markdown atau plain text
 * @returns Jumlah kata
 */
export function countWords(content: string): number {
  const stripped = stripBase64(content);

  // Remove markdown formatting dan code blocks
  const plainContent = stripped
    .replace(/```[\s\S]*?```/g, ' ')           // Remove code blocks
    .replace(/`[^`]*`/g, ' ')                  // Remove inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')    // Remove images
    .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')     // Remove links
    .replace(/[>#*_~\-=\|]/g, ' ')             // Remove markdown symbols
    .replace(/\s+/g, ' ')                      // Normalize whitespace
    .trim();

  return plainContent ? plainContent.split(/\s+/).length : 0;
}

/**
 * Hitung jumlah karakter dari konten
 * Otomatis strip base64 sebelum menghitung
 * @param content - Konten markdown atau plain text
 * @returns Jumlah karakter
 */
export function countChars(content: string): number {
  const stripped = stripBase64(content);

  // Remove markdown formatting dan code blocks
  const plainContent = stripped
    .replace(/```[\s\S]*?```/g, '')            // Remove code blocks
    .replace(/`[^`]*`/g, '')                   // Remove inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')     // Remove images
    .replace(/\[[^\]]+\]\([^)]*\)/g, '')      // Remove links
    .replace(/[>#*_~\-=\|]/g, '')              // Remove markdown symbols
    .replace(/\s+/g, ' ')                      // Normalize whitespace
    .trim();

  return plainContent.length;
}

/**
 * Ekstrak semua base64 images dari konten
 * Gunakan untuk batch upload images sebelum save
 * @param content - Konten dengan base64 images
 * @returns Array of {altText, base64Data}
 */
export function extractBase64Images(
  content: string
): Array<{ altText: string; base64Data: string }> {
  const matches = content.matchAll(/!\[([^\]]*)\]\((data:[^)]*)\)/g);
  const results: Array<{ altText: string; base64Data: string }> = [];

  for (const match of matches) {
    results.push({
      altText: match[1],
      base64Data: match[2],
    });
  }

  return results;
}

/**
 * Replace base64 images dengan URL dalam konten
 * Gunakan setelah upload successful
 * @param content - Konten dengan base64 images
 * @param replacements - Map dari base64Data ke imageUrl
 * @returns Konten dengan URL images
 */
export function replaceBase64WithUrl(
  content: string,
  replacements: Record<string, string>
): string {
  let result = content;

  Object.entries(replacements).forEach(([base64, url]) => {
    // Escape special regex characters
    const escaped = base64.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`!\\[([^\\]]*)]\\(${escaped}\\)`, 'g'),
      `![$1](${url})`
    );
  });

  return result;
}

/**
 * Validasi ukuran file
 * @param file - File object
 * @param maxSizeMB - Maximum size in MB (default: 5)
 * @returns {valid: boolean, error?: string}
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File harus berupa gambar' };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Ukuran file maksimal ${maxSizeMB}MB` };
  }

  return { valid: true };
}

/**
 * Convert file ke base64
 * Gunakan untuk preview sebelum upload
 * @param file - File object
 * @returns Promise<string> - Base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image using Canvas
 * Gunakan sebelum upload untuk reduce payload
 * @param file - File object
 * @param maxWidth - Maximum width in pixels (default: 800)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Promise<string> - Compressed base64 data URL
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        // Calculate dimensions
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate stats untuk content
 * @param content - Konten markdown
 * @returns {words, chars, images, base64Count}
 */
export function getContentStats(content: string) {
  const base64Count = (content.match(/data:image\/[^)]+/g) || []).length;
  const imageCount = (content.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length;
  const words = countWords(content);
  const chars = countChars(content);

  return {
    words,
    chars,
    images: imageCount,
    base64Count,
    hasBase64: base64Count > 0,
  };
}

/**
 * Check if content contains base64 images
 * Useful untuk warning user sebelum save
 * @param content - Konten markdown
 * @returns boolean
 */
export function hasBase64Images(content: string): boolean {
  return /data:image\/[^)]+/.test(content);
}

/**
 * Get count of base64 images in content
 * @param content - Konten markdown
 * @returns number
 */
export function getBase64ImageCount(content: string): number {
  return (content.match(/data:image\/[^)]+/g) || []).length;
}
