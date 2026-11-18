import { X, Upload, AlertCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { uploadImage } from '../lib/mediaUploader';
import { API_BASE } from '../lib/api';
import { MAX_IMAGE_DIMENSION, MAX_IMAGE_UPLOAD_MB } from '../utils/media';

interface ImageUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (imageMarkdown: string) => void;
  onScheduleChange?: (isScheduled: boolean) => void;
}

export function ImageUploadDialog({
  isOpen,
  onClose,
  onInsert,
  onScheduleChange,
}: ImageUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [altText, setAltText] = useState('');
  const [scheduleImage, setScheduleImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileSize, setFileSize] = useState<{ original: number; compressed: number }>({ original: 0, compressed: 0 });
  // File asli disimpan apa adanya; diunggah lewat uploadImage (kualitas asli dipertahankan).
  const [file, setFile] = useState<File | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const handleFileSelect = async (picked?: File) => {
    if (!picked) return;

    setError('');
    setIsLoading(true);

    if (!picked.type.startsWith('image/')) {
      setError('Pilihan file harus berupa gambar');
      setIsLoading(false);
      return;
    }

    try {
      const url = URL.createObjectURL(picked);
      const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('Gagal membaca gambar'));
        img.src = url;
      });
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
      setFile(picked);
      setDims(size);
      setFileName(picked.name);
      setPreview(url);
      setAltText(picked.name.replace(/\.[^.]+$/, '').replace(/[^\w\s-]/g, '').trim());
      setFileSize({ original: picked.size, compressed: picked.size });
    } catch (err) {
      setError('Gagal membaca file gambar');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = async () => {
    if (!file || !altText) {
      setError('Alt text harus diisi');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Sama dengan paste/drag di editor: gambar diunggah dengan kualitas aslinya.
      const named = new File([file], `${altText}.${(file.name.split('.').pop() || 'png').toLowerCase()}`, { type: file.type });
      const imageUrl = await uploadImage(named, { apiBaseUrl: API_BASE });
      const imageMarkdown = `\n![${altText}](${imageUrl})\n`;
      onInsert(imageMarkdown);
      onScheduleChange?.(scheduleImage);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload gagal';
      setError(message);
      console.error('Image upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview('');
    setFile(null);
    setDims(null);
    setFileName('');
    setAltText('');
    setScheduleImage(false);
    setFileSize({ original: 0, compressed: 0 });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Upload Foto</h2>
          <button
            onClick={resetForm}
            className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            void handleFileSelect(e.target.files?.[0]);
            e.currentTarget.value = '';
          }}
        />

        {/* Upload Area */}
        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#334155] rounded-lg p-8 text-center cursor-pointer hover:border-[#60A5FA] hover:bg-[#0F172A]/40 transition-colors mb-4"
          >
            <Upload className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#F8FAFC] mb-1">Klik atau drag gambar di sini</p>
            <p className="text-xs text-[#94A3B8]">PNG, JPG, GIF, WebP (maks. {MAX_IMAGE_UPLOAD_MB} MB) — kualitas asli dipertahankan</p>
          </div>
        ) : (
          <>
            {/* Preview */}
            <div className="mb-4 rounded-lg overflow-hidden border border-[#334155]">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-48 object-contain bg-white"
              />
            </div>

            {/* File Info */}
            <div className="mb-4 p-3 bg-[#0F172A] border border-[#334155] rounded-lg">
              <p className="text-xs text-[#94A3B8] mb-1">File</p>
              <p className="text-sm text-[#F8FAFC] font-medium truncate">{fileName}</p>
              {fileSize.original > 0 && (
                <p className="text-xs text-[#60A5FA] mt-2">
                  {(fileSize.original / 1024).toFixed(1)} KB{dims ? ` · ${dims.w}×${dims.h} px` : ''}
                  <span className="text-green-400 ml-2">
                    {dims && Math.max(dims.w, dims.h) > MAX_IMAGE_DIMENSION
                      ? `diperkecil ke ${MAX_IMAGE_DIMENSION} px (tetap tajam)`
                      : 'kualitas asli dipertahankan'}
                  </span>
                </p>
              )}
            </div>
          </>
        )}

        {/* Alt Text Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#F8FAFC] mb-2">
            Alt Text (Deskripsi Gambar) *
          </label>
          <input
            type="text"
            value={altText}
            onChange={e => setAltText(e.target.value)}
            placeholder="Jelaskan isi gambar..."
            className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#60A5FA]"
          />
          <p className="text-xs text-[#94A3B8] mt-1">Untuk aksesibilitas dan SEO</p>
        </div>

        {/* Schedule Option */}
        <div className="mb-6 p-3 bg-[#0F172A] border border-[#334155] rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleImage}
              onChange={e => setScheduleImage(e.target.checked)}
              className="w-4 h-4 rounded border-[#334155] bg-[#1E293B] cursor-pointer accent-[#60A5FA]"
            />
            <span className="text-sm text-[#F8FAFC]">Jadwalkan tampilan gambar dengan artikel</span>
          </label>
          <p className="text-xs text-[#94A3B8] mt-1">Gambar hanya tampil saat artikel dipublikasi</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {preview && (
            <button
              onClick={() => {
                if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
                setPreview('');
                setFile(null);
                setDims(null);
                setFileName('');
                setFileSize({ original: 0, compressed: 0 });
                setError('');
              }}
              className="flex-1 px-4 py-2 bg-[#334155] text-[#F8FAFC] rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
            >
              Ganti Gambar
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!preview || isLoading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              preview
                ? 'bg-[#60A5FA] text-white hover:bg-[#3B82F6]'
                : 'bg-[#334155] text-[#94A3B8] cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Loading...' : 'Pilih Gambar'}
          </button>
          <button
            onClick={handleInsert}
            disabled={!preview || !altText || isLoading}
            className="flex-1 px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Uploading...' : 'Insert'}
          </button>
        </div>
      </div>
    </div>
  );
}
