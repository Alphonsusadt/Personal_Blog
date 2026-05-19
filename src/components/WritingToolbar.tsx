import { Bold, Italic, Underline, Heading1, Quote, Link, Image, List, Code } from 'lucide-react';

interface WritingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (before: string, after?: string) => void;
  onOpenImageDialog?: () => void;
  onOpenLinkDialog?: () => void;
  onOpenAssetReuser?: () => void;
}

export function WritingToolbar({ textareaRef, onInsert, onOpenImageDialog, onOpenLinkDialog, onOpenAssetReuser }: WritingToolbarProps) {
  const buttons = [
    { icon: Bold, label: 'Bold', action: () => onInsert('**', '**') },
    { icon: Italic, label: 'Italic', action: () => onInsert('*', '*') },
    { icon: Underline, label: 'Underline', action: () => onInsert('__', '__') },
    { icon: Heading1, label: 'Heading', action: () => onInsert('## ') },
    { icon: Code, label: 'Code Block', action: () => onInsert('\n```javascript\n', '\n```\n') },
    { icon: Quote, label: 'Quote', action: () => onInsert('> ') },
    { icon: Link, label: 'Link', action: onOpenLinkDialog ? () => onOpenLinkDialog() : () => onInsert('[text](', ')') },
    {
      icon: Image,
      label: 'Image',
      action: () => onOpenImageDialog?.()
    },
    { icon: List, label: 'List', action: () => onInsert('- ') },
  ];

  return (
    <div className="flex items-center gap-1 p-3 bg-[#0F172A] border border-[#334155] rounded-lg mb-3 flex-wrap">
      {buttons.map(({ icon: Icon, label, action }) => (
        <button
          key={label}
          onClick={action}
          onMouseDown={(e) => {
            e.preventDefault();
            textareaRef.current?.focus();
          }}
          title={label}
          className="p-2 text-[#94A3B8] hover:text-[#60A5FA] hover:bg-[#1E293B] rounded transition-colors"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      {onOpenAssetReuser && (
        <div className="pl-2 ml-1 border-l border-[#334155]">
          <button
            onClick={onOpenAssetReuser}
            onMouseDown={(e) => e.preventDefault()}
            title="Reuse Images & Code from other language"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded transition-colors"
          >
            Reuse Assets
          </button>
        </div>
      )}
    </div>
  );
}
