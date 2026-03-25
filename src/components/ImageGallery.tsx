import { Trash2, Image as ImageIcon } from 'lucide-react';

interface ImageGalleryProps {
  content: string;
  onRemoveImage: (markdown: string) => void;
}

export function ImageGallery({ content, onRemoveImage }: ImageGalleryProps) {
  // Extract all image markdown from content
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: Array<{ alt: string; src: string; markdown: string }> = [];

  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    images.push({
      alt: match[1],
      src: match[2],
      markdown: match[0],
    });
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
      <h3 className="font-medium text-sm text-[#F8FAFC] mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        Gambar ({images.length})
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {images.map((image, idx) => (
          <div
            key={idx}
            className="flex gap-2 bg-[#0F172A] border border-[#334155] rounded p-2 group hover:border-[#60A5FA] transition-colors"
          >
            {/* Thumbnail */}
            {image.src.startsWith('data:image') ? (
              <img
                src={image.src}
                alt={image.alt}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-[#1E293B] flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-4 h-4 text-[#94A3B8]" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#F8FAFC] truncate font-medium">{image.alt || 'Untitled'}</p>
              <p className="text-[10px] text-[#94A3B8] truncate">
                {image.src.startsWith('data:') ? 'Base64' : image.src}
              </p>
            </div>

            {/* Delete */}
            <button
              onClick={() => onRemoveImage(image.markdown)}
              className="p-1 text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Hapus gambar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
