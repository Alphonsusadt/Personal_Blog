import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Code, Plus } from 'lucide-react';

interface AssetReuserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  otherLanguageContent: string;
  onInsert: (markdown: string) => void;
  sourceLanguage: 'id' | 'en';
}

interface Asset {
  type: 'image' | 'code';
  markdown: string;
  preview: string; // URL for image, truncated text for code
  altText?: string;
}

export function AssetReuserDialog({ isOpen, onClose, otherLanguageContent, onInsert, sourceLanguage }: AssetReuserDialogProps) {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    if (!isOpen || !otherLanguageContent) return;

    const extractedAssets: Asset[] = [];

    // Extract images
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = imageRegex.exec(otherLanguageContent)) !== null) {
      extractedAssets.push({
        type: 'image',
        markdown: match[0],
        altText: match[1] || 'Image',
        preview: match[2],
      });
    }

    // Extract code blocks
    const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)\n```/g;
    while ((match = codeBlockRegex.exec(otherLanguageContent)) !== null) {
      extractedAssets.push({
        type: 'code',
        markdown: match[0],
        altText: match[1] ? `${match[1]} Code` : 'Code Block',
        preview: match[2].trim().slice(0, 100) + (match[2].length > 100 ? '...' : ''),
      });
    }

    setAssets(extractedAssets);
  }, [isOpen, otherLanguageContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-[#334155] rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-[#334155]">
          <div>
            <h2 className="text-lg font-bold text-[#F8FAFC]">Reuse Assets</h2>
            <p className="text-xs text-[#94A3B8]">Copy images or code blocks from the {sourceLanguage === 'en' ? 'English' : 'Indonesian'} version.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors rounded-lg hover:bg-[#1E293B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {assets.length === 0 ? (
            <div className="text-center py-12 text-[#94A3B8]">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No images or code blocks found in the other language.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assets.map((asset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onInsert(asset.markdown);
                    onClose();
                  }}
                  className="flex flex-col text-left group bg-[#1E293B] border border-[#334155] hover:border-[#60A5FA] rounded-xl p-3 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2 text-xs font-medium text-[#F8FAFC]">
                    {asset.type === 'image' ? <ImageIcon className="w-4 h-4 text-[#60A5FA]" /> : <Code className="w-4 h-4 text-purple-400" />}
                    <span className="truncate">{asset.altText}</span>
                    <Plus className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-[#60A5FA] transition-opacity" />
                  </div>
                  <div className="w-full bg-[#0F172A] rounded-lg border border-[#334155] overflow-hidden flex-1 relative flex items-center justify-center min-h-[100px]">
                    {asset.type === 'image' ? (
                      <img src={asset.preview} alt={asset.altText} className="object-cover w-full h-full absolute inset-0" />
                    ) : (
                      <pre className="text-[10px] p-2 text-[#94A3B8] font-mono w-full h-full overflow-hidden whitespace-pre-wrap leading-tight">
                        {asset.preview}
                      </pre>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
