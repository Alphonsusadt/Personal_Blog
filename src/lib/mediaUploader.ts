/**
 * Universal Image Upload Handler
 * Bisa di-attach ke textarea/editor di section manapun
 * Menangani: drag-drop, paste, dan dialog upload
 */

import { compressImage, validateFile } from '../utils/media';

interface UploadConfig {
  apiBaseUrl?: string;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onSuccess?: (imageUrl: string, altText: string) => void;
  autoInsert?: boolean; // Auto insert markdown jika true
  maxSizeMB?: number;
  maxWidth?: number;
  quality?: number;
}

/**
 * Upload single image ke server
 * @param file - Image file
 * @param config - Configuration
 * @returns Promise<string> - Image URL dari server
 */
export async function uploadImage(
  file: File,
  config: UploadConfig = {}
): Promise<string> {
  const {
    apiBaseUrl = process.env.VITE_API_URL || 'http://localhost:5000',
    onProgress,
    onError,
    maxSizeMB = 5,
    maxWidth = 800,
    quality = 0.8,
  } = config;

  // Validate file
  const validation = validateFile(file, maxSizeMB);
  if (!validation.valid) {
    onError?.(validation.error || 'Validation failed');
    throw new Error(validation.error);
  }

  try {
    // Compress image
    onProgress?.(10);
    const compressed = await compressImage(file, maxWidth, quality);
    onProgress?.(30);

    // Create FormData for upload
    const formData = new FormData();

    // Convert base64 to blob
    const response = await fetch(compressed);
    const blob = await response.blob();
    formData.append('file', blob, file.name);
    formData.append('altText', file.name.replace(/\.[^.]+$/, ''));

    // Upload ke server
    const uploadResponse = await fetch(`${apiBaseUrl}/api/media/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      },
    });

    onProgress?.(70);

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.message || 'Upload failed');
    }

    const data = await uploadResponse.json();
    onProgress?.(100);

    config.onSuccess?.(data.imageUrl, data.altText || '');
    return data.imageUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    onError?.(message);
    throw error;
  }
}

/**
 * Upload multiple images dalam batch
 * @param files - Array of image files
 * @param config - Configuration
 * @returns Promise<{file: File, url: string}[]>
 */
export async function uploadImages(
  files: File[],
  config: UploadConfig = {}
): Promise<Array<{ file: File; url: string }>> {
  const results: Array<{ file: File; url: string }> = [];
  const { onProgress } = config;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = Math.round((i / files.length) * 100);
    onProgress?.(progress);

    try {
      const url = await uploadImage(file, config);
      results.push({ file, url });
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
    }
  }

  onProgress?.(100);
  return results;
}

/**
 * Attach upload handler ke textarea
 * Menangani paste & drop events
 * @param textarea - HTMLTextAreaElement
 * @param callback - (imageMarkdown: string) => void
 * @param config - Upload configuration
 */
export function attachUploadHandler(
  textarea: HTMLTextAreaElement,
  callback: (imageMarkdown: string) => void,
  config: UploadConfig = {}
) {
  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    // Filter image files only
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    // Upload first image (bisa di-extend untuk multiple)
    const file = imageFiles[0];
    try {
      const imageUrl = await uploadImage(file, config);
      const altText = file.name.replace(/\.[^.]+$/, '');
      const markdown = `\n![${altText}](${imageUrl})\n`;
      callback(markdown);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  // Handle paste event
  textarea.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFiles(new DataTransfer().items.add(file).files);
        }
      }
    }
  });

  // Handle drop event
  textarea.addEventListener('dragover', (e) => {
    e.preventDefault();
    textarea.style.borderColor = '#60A5FA';
    textarea.style.backgroundColor = 'rgba(96, 165, 250, 0.05)';
  });

  textarea.addEventListener('dragleave', () => {
    textarea.style.borderColor = '';
    textarea.style.backgroundColor = '';
  });

  textarea.addEventListener('drop', (e) => {
    e.preventDefault();
    textarea.style.borderColor = '';
    textarea.style.backgroundColor = '';
    handleFiles(e.dataTransfer?.files || new DataTransfer().files);
  });
}

/**
 * Create image upload dialog dengan reusable handler
 * Gunakan di component Image Upload Dialog untuk universal handling
 * @param file - File yang dipilih
 * @param callback - (base64: string, altText: string) => void saat preview siap
 * @param config - Upload config
 */
export async function prepareImageUpload(
  file: File,
  callback: (base64: string, altText: string) => void,
  config: UploadConfig = {}
): Promise<void> {
  const { maxWidth = 800, quality = 0.8, onProgress } = config;

  // Validate
  const validation = validateFile(file);
  if (!validation.valid) {
    config.onError?.(validation.error || 'Invalid file');
    throw new Error(validation.error);
  }

  onProgress?.(20);

  try {
    // Compress untuk preview
    const compressed = await compressImage(file, maxWidth, quality);
    const altText = file.name.replace(/\.[^.]+$/, '').replace(/[^\w\s-]/g, '');

    onProgress?.(50);
    callback(compressed, altText);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to prepare image';
    config.onError?.(message);
    throw error;
  }
}

/**
 * Batch handle base64 images: extract → upload → replace URLs
 * Gunakan sebelum save content dengan base64 images
 * @param content - Content dengan base64 images
 * @param config - Upload config
 * @returns Promise<string> - Content dengan replaced URLs
 */
export async function sanitizeContent(
  content: string,
  config: UploadConfig = {}
): Promise<string> {
  const { extractBase64Images, replaceBase64WithUrl } = await import('../utils/media');

  // Ekstrak semua base64 images
  const base64Images = extractBase64Images(content);
  if (base64Images.length === 0) {
    return content; // Tidak ada base64 images
  }

  const replacements: Record<string, string> = {};

  // Upload setiap image
  for (const image of base64Images) {
    try {
      // Convert base64 ke File object
      const blob = dataURLtoBlob(image.base64Data);
      const file = new File([blob], `${image.altText || 'image'}.jpg`, { type: 'image/jpeg' });

      // Upload
      const imageUrl = await uploadImage(file, config);
      replacements[image.base64Data] = imageUrl;

      config.onProgress?.(
        Math.round((Object.keys(replacements).length / base64Images.length) * 100)
      );
    } catch (error) {
      console.error(`Failed to upload image ${image.altText}:`, error);
      // Continue dengan image berikutnya
    }
  }

  // Replace base64 dengan URLs
  return replaceBase64WithUrl(content, replacements);
}

/**
 * Helper: Convert data URL to Blob
 */
function dataURLtoBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mimeType });
}

/**
 * Sanitize markdown content by replacing all base64 images with server URLs
 * Wrapper function for easier integration - handles all setup
 * @param markdownContent - Markdown string with potential base64 images
 * @param authToken - Optional auth token for upload
 * @param onProgress - Optional progress callback
 * @returns Promise<string> - Sanitized markdown with URLs instead of base64
 */
export async function sanitizeMarkdown(
  markdownContent: string,
  authToken?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  return sanitizeContent(markdownContent, {
    apiBaseUrl,
    onProgress,
    onError: (error) => console.warn('Sanitization error:', error),
  } as UploadConfig);
}
