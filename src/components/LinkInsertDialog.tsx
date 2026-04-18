import { useEffect, useState } from 'react';
import { Link2, X } from 'lucide-react';

interface LinkInsertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (markdown: string) => void;
}

export function LinkInsertDialog({ isOpen, onClose, onInsert }: LinkInsertDialogProps) {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    setUrl('');
  }, [isOpen]);

  const normalizeUrl = (raw: string) => {
    const value = raw.trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) {
      return value;
    }
    return `https://${value}`;
  };

  const handleInsert = () => {
    const normalizedUrl = normalizeUrl(url);
    const normalizedText = text.trim() || 'link';
    if (!normalizedUrl) return;

    onInsert(`[${normalizedText}](${normalizedUrl})`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#334155] bg-[#1E293B] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#F8FAFC]">
            <Link2 className="h-4 w-4" />
            Insert Link
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Text link (contoh: Lihat demo)"
            className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-[#F8FAFC] focus:border-[#60A5FA] focus:outline-none"
          />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="URL (contoh: https://example.com)"
            className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-[#F8FAFC] focus:border-[#60A5FA] focus:outline-none"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#334155] px-3 py-2 text-sm text-[#F8FAFC] hover:bg-[#0F172A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="rounded-lg bg-[#1E40AF] px-3 py-2 text-sm text-white hover:bg-[#1E3A8A]"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
