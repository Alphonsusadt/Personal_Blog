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

  // Konten rich (HTML dari editor ribbon): <img src="data:..." alt="...">
  for (const tag of content.match(/<img\b[^>]*>/gi) || []) {
    const src = tag.match(/\ssrc="(data:image\/[^"]+)"/i);
    if (!src) continue;
    const alt = tag.match(/\salt="([^"]*)"/i);
    results.push({ altText: alt ? alt[1] : '', base64Data: src[1] });
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
    // Konten rich (HTML dari editor ribbon): ganti atribut src pada tag <img>.
    result = result.split(`src="${base64}"`).join(`src="${url}"`);
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

/** Batas unggah (sama dengan server & batas gambar Cloudinary paket gratis). */
export const MAX_IMAGE_UPLOAD_MB = 10;
/** Sisi terpanjang gambar yang masih diunggah apa adanya (tajam di layar 4K / retina). */
export const MAX_IMAGE_DIMENSION = 3840;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal membaca gambar')); };
    img.src = url;
  });
}

/**
 * Siapkan gambar untuk diunggah TANPA merusak kualitasnya.
 *
 *  - Gambar yang wajar (sisi terpanjang ≤ 3840 px dan ≤ 10 MB) diunggah PERSIS seperti
 *    aslinya: tidak diperkecil, tidak dikompres ulang. Skema rangkaian, diagram, dan
 *    screenshot berteks kecil tetap tajam.
 *  - GIF selalu dikirim apa adanya (menggambar ulang lewat canvas menghapus animasinya).
 *  - Hanya gambar yang benar-benar besar yang diperkecil, bertahap dengan penghalusan
 *    kualitas tinggi. PNG tetap PNG (tanpa kehilangan), JPEG/WebP kualitas 0.92.
 */
export async function prepareImageForUpload(
  file: File,
  maxDimension: number = MAX_IMAGE_DIMENSION,
): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file; // format yang tidak bisa dibaca browser: biarkan server yang menilai
  }
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (longest <= maxDimension && file.size <= MAX_IMAGE_UPLOAD_MB * 1024 * 1024) return file;

  const scale = Math.min(1, maxDimension / longest);
  const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
  const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

  // Perkecil bertahap (maks. setengah per langkah): jauh lebih tajam daripada sekali loncat.
  let source: CanvasImageSource = img;
  let w = img.naturalWidth, h = img.naturalHeight;
  let canvas = document.createElement('canvas');
  do {
    w = Math.max(targetW, Math.round(w / 2));
    h = Math.max(targetH, Math.round(h / 2));
    if (scale === 1) { w = targetW; h = targetH; }
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, w, h);
    source = canvas;
  } while (w > targetW || h > targetH);

  const type = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, type, 0.92));
  return blob ?? file;
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

        // Calculate dimensions (gambar tegak boleh setinggi lebar maksimalnya)
        const maxHeight = Math.max(800, maxWidth);
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

        // PNG/WebP tetap formatnya supaya latar transparan tidak berubah jadi hitam
        // (logo, diagram, dan gambar untuk wrap "Tight" butuh transparansi).
        const keepAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
        const outType = file.type === 'image/webp' ? 'image/webp' : keepAlpha ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outType, quality));
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
