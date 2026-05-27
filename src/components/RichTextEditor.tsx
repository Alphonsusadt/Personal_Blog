import React, { useImperativeHandle, forwardRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { CustomImage, SocialEmbed, CustomCodeBlock } from '../lib/tiptap-extensions';
import { detectSocialEmbed, markdownToEditorHtml, editorHtmlToMarkdown } from '../lib/markdownConverter';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, Quote, Link as LinkIcon, 
  Image as ImageIcon, List, ListOrdered, Code, Undo, Redo, 
  AlignLeft, AlignCenter, AlignRight, Trash2, HelpCircle
} from 'lucide-react';

interface RichTextEditorProps {
  initialValue: string;
  onCommit: (markdown: string) => void;
  id: string;
  placeholder?: string;
  onOpenImageDialog?: () => void;
  onOpenLinkDialog?: () => void;
  onOpenAssetReuser?: () => void;
  className?: string;
}

export interface RichTextEditorRef {
  insertImage: (alt: string, url: string) => void;
  insertLink: (text: string, url: string) => void;
  insertMarkdown: (markdown: string) => void;
  focus: () => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  initialValue,
  onCommit,
  id,
  placeholder = 'Start typing...',
  onOpenImageDialog,
  onOpenLinkDialog,
  onOpenAssetReuser,
  className = ''
}, ref) => {
  
  // Convert initial markdown from database to editor HTML
  const initialHtml = React.useMemo(() => {
    return markdownToEditorHtml(initialValue);
  }, [initialValue]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CustomImage.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#60A5FA] underline hover:text-[#93C5FD] transition-colors',
        },
      }),
      SocialEmbed,
      CustomCodeBlock,
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = editorHtmlToMarkdown(html);
      onCommit(markdown);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[50vh] p-4 text-[#F8FAFC]',
      },
      // Automatically detect pasted social links and turn them into SocialEmbed nodes
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain') || '';
        const social = detectSocialEmbed(text);
        if (social) {
          const { schema } = view.state;
          const node = schema.nodes.socialEmbed.create({
            url: text,
            type: social.type,
            width: '100%',
            alignment: 'center',
          });
          const transaction = view.state.tr.replaceSelectionWith(node);
          view.dispatch(transaction);
          return true; // handled
        }
        return false;
      },
    },
  });

  // Keep content synced if initialValue changes externally
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentHtml = editor.getHTML();
      const newHtml = markdownToEditorHtml(initialValue);
      if (editorHtmlToMarkdown(currentHtml) !== initialValue) {
        editor.commands.setContent(newHtml);
      }
    }
  }, [initialValue, editor]);

  // Expose insertion controls to the parent component (so dialogs can inject content)
  useImperativeHandle(ref, () => ({
    insertImage(alt, url) {
      editor?.chain().focus().insertContent({
        type: 'image',
        attrs: { src: url, alt, alignment: 'center', width: '100%' }
      }).run();
    },
    insertLink(text, url) {
      const social = detectSocialEmbed(url);
      if (social) {
        editor?.chain().focus().insertContent({
          type: 'socialEmbed',
          attrs: {
            url,
            type: social.type,
            width: '100%',
            alignment: 'center'
          }
        }).run();
      } else {
        editor?.chain().focus().setLink({ href: url }).run();
      }
    },
    insertMarkdown(markdown) {
      const html = markdownToEditorHtml(markdown);
      editor?.chain().focus().insertContent(html).run();
    },
    focus() {
      editor?.commands.focus();
    }
  }));

  if (!editor) return null;

  // Active status checks for toolbar buttons
  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isHeading1 = editor.isActive('heading', { level: 1 });
  const isHeading2 = editor.isActive('heading', { level: 2 });
  const isHeading3 = editor.isActive('heading', { level: 3 });
  const isBulletList = editor.isActive('bulletList');
  const isOrderedList = editor.isActive('orderedList');
  const isBlockquote = editor.isActive('blockquote');
  const isCodeBlock = editor.isActive('codeBlock');

  // Bubble menu target helpers
  const getSelectedNodeAttrs = () => {
    if (editor.isActive('image')) {
      return editor.getAttributes('image');
    }
    if (editor.isActive('socialEmbed')) {
      return editor.getAttributes('socialEmbed');
    }
    return {};
  };

  const updateSelectedNodeAttrs = (attrs: Record<string, any>) => {
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', attrs).run();
    } else if (editor.isActive('socialEmbed')) {
      editor.chain().focus().updateAttributes('socialEmbed', attrs).run();
    }
  };

  const deleteSelectedNode = () => {
    editor.chain().focus().deleteSelection().run();
  };

  const activeAttrs = getSelectedNodeAttrs();

  return (
    <div className={`flex flex-col border border-[#334155] rounded-xl bg-[#0F172A] overflow-hidden ${className}`}>
      
      {/* 1. Rich Text Format Toolbar */}
      <div className="flex items-center justify-between p-2 bg-[#0F172A] border-b border-[#334155] flex-wrap gap-1 select-none">
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded transition-colors ${isHeading1 ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition-colors ${isHeading2 ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded transition-colors ${isHeading3 ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-[#334155] mx-1" />

          {/* Text decoration */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-colors ${isBold ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors ${isItalic ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-[#334155] mx-1" />

          {/* Blocks */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${isBulletList ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition-colors ${isOrderedList ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded transition-colors ${isBlockquote ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded transition-colors ${isCodeBlock ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-[#334155] mx-1" />

          {/* Dialog link/image insertion */}
          {onOpenLinkDialog && (
            <button
              type="button"
              onClick={onOpenLinkDialog}
              className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] rounded transition-colors"
              title="Insert Link or Embed Media"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          )}
          {onOpenImageDialog && (
            <button
              type="button"
              onClick={onOpenImageDialog}
              className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] rounded transition-colors"
              title="Insert Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          )}

          {/* Social media direct prompt */}
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter YouTube, Instagram, or X (Twitter) URL:');
              if (url) {
                const social = detectSocialEmbed(url);
                if (social) {
                  editor.chain().focus().insertContent({
                    type: 'socialEmbed',
                    attrs: {
                      url,
                      type: social.type,
                      width: '100%',
                      alignment: 'center'
                    }
                  }).run();
                } else {
                  alert('URL is not recognized as a supported YouTube, Instagram, or X/Twitter status link.');
                }
              }
            }}
            className="p-1.5 text-[#94A3B8] hover:text-[#60A5FA] hover:bg-[#1E293B] rounded transition-colors flex items-center gap-1"
            title="Add Media Embed"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase">Embed</span>
          </button>
        </div>

        {/* Undo / Redo & Reuse Assets */}
        <div className="flex items-center gap-1 select-none">
          {onOpenAssetReuser && (
            <button
              type="button"
              onClick={onOpenAssetReuser}
              className="px-2.5 py-1 text-xs font-semibold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-md transition-colors"
              title="Reuse Images & Code from the other language translation"
            >
              Reuse Assets
            </button>
          )}
          <span className="w-px h-5 bg-[#334155] mx-1 hidden sm:inline" />
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] disabled:opacity-30 rounded transition-colors"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] disabled:opacity-30 rounded transition-colors"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Layout Bubble Menu (Resizing & Aligning Images & Embeds) */}
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor }) => editor.isActive('image') || editor.isActive('socialEmbed')}
        {...({ tippyOptions: { duration: 100, placement: 'top' } } as any)}
      >
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl shadow-2xl p-1 flex items-center gap-1 select-none z-50">
          
          {/* Sizing Toggles */}
          <div className="flex items-center gap-0.5 border-r border-[#334155] pr-1.5 mr-1.5">
            <button
              type="button"
              onClick={() => updateSelectedNodeAttrs({ width: '33%' })}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${activeAttrs.width === '33%' ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            >
              33%
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNodeAttrs({ width: '50%' })}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${activeAttrs.width === '50%' ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNodeAttrs({ width: '75%' })}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${activeAttrs.width === '75%' ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNodeAttrs({ width: '100%' })}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${activeAttrs.width === '100%' || !activeAttrs.width ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
            >
              100%
            </button>
          </div>

          {/* Alignment Toggles */}
          <div className="flex items-center gap-0.5 border-r border-[#334155] pr-1.5 mr-1.5">
            <button
              type="button"
              onClick={() => updateSelectedNodeAttrs({ alignment: 'left' })}
              className={`p-1.5 rounded transition-colors ${activeAttrs.alignment === 'left' ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
              title="Align Left (Text Wrap)"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNodeAttrs({ alignment: 'center' })}
              className={`p-1.5 rounded transition-colors ${activeAttrs.alignment === 'center' || !activeAttrs.alignment ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateSelectedNodeAttrs({ alignment: 'right' })}
              className={`p-1.5 rounded transition-colors ${activeAttrs.alignment === 'right' ? 'bg-blue-600 text-white' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'}`}
              title="Align Right (Text Wrap)"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Delete Button */}
          <button
            type="button"
            onClick={deleteSelectedNode}
            className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600 rounded transition-colors"
            title="Delete Item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </BubbleMenu>

      {/* 3. Text Editor View Canvas */}
      <div className="bg-[#0F172A] overflow-y-auto min-h-[50vh] max-h-[75vh] select-text">
        <EditorContent editor={editor} />
      </div>

    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
