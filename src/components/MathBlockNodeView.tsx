import React, { useState, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';
import { Sigma } from 'lucide-react';

export function MathBlockNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const equation = node.attrs.equation || '';
  const [isEditing, setIsEditing] = useState(selected);
  const [tempEquation, setTempEquation] = useState(equation);

  // Sync selection state to editing state
  useEffect(() => {
    setIsEditing(selected);
  }, [selected]);

  // Sync attribute changes
  useEffect(() => {
    setTempEquation(equation);
  }, [equation]);

  const handleBlur = () => {
    updateAttributes({ equation: tempEquation.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent Enter inside input from breaking Tiptap node, let it insert newlines if Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      updateAttributes({ equation: tempEquation.trim() });
      setIsEditing(false);
    }
  };

  // Render KaTeX HTML
  let katexHtml = '';
  let hasError = false;
  if (tempEquation.trim()) {
    try {
      katexHtml = katex.renderToString(tempEquation.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
      });
    } catch (err) {
      hasError = true;
      katexHtml = `<span class="text-rose-500">Error: ${(err as Error).message}</span>`;
    }
  }

  return (
    <NodeViewWrapper className="math-block-node-wrapper my-6 relative group select-none">
      <div 
        className={`border rounded-lg p-4 bg-[#0B0F19] transition-all duration-200 ${
          selected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-[#334155] hover:border-[#475569]'
        }`}
      >
        <div className="flex items-center justify-between mb-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider select-none">
          <div className="flex items-center gap-1.5">
            <Sigma className="w-3.5 h-3.5 text-blue-400" />
            <span>LaTeX Math Block</span>
          </div>
          {isEditing ? (
            <span className="text-blue-400 animate-pulse font-mono">Editing Mode (Press Enter to apply)</span>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">Click to Edit</span>
          )}
        </div>

        {/* Editing Input */}
        {isEditing ? (
          <div className="mb-3">
            <textarea
              value={tempEquation}
              onChange={(e) => setTempEquation(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Type LaTeX equation here, e.g. f(x) = \int_{-\infty}^{\infty} \hat{f}(\xi)\,e^{2 \pi i \xi x}\,d\xi"
              className="w-full bg-[#1E293B] text-[#F8FAFC] border border-[#334155] rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-blue-500 h-20 resize-y"
              autoFocus
            />
          </div>
        ) : null}

        {/* Live KaTeX Render Output */}
        <div 
          onClick={() => setIsEditing(true)}
          className={`overflow-x-auto py-2 flex justify-center cursor-pointer min-h-[2.5rem] items-center rounded select-none ${
            !tempEquation.trim() ? 'text-[#475569] font-mono text-xs italic hover:text-[#94A3B8]' : ''
          }`}
        >
          {tempEquation.trim() ? (
            <div 
              className="math-render max-w-full text-[#F8FAFC]"
              dangerouslySetInnerHTML={{ __html: katexHtml }} 
            />
          ) : (
            <span>Empty Math Block. Click to enter LaTeX equations...</span>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
