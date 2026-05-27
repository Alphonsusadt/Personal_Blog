import React, { useState, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';

export function MathInlineNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const equation = node.attrs.equation || '';
  const [isEditing, setIsEditing] = useState(selected);
  const [tempEquation, setTempEquation] = useState(equation);

  useEffect(() => {
    setIsEditing(selected);
  }, [selected]);

  useEffect(() => {
    setTempEquation(equation);
  }, [equation]);

  const handleBlur = () => {
    updateAttributes({ equation: tempEquation.trim() });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateAttributes({ equation: tempEquation.trim() });
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTempEquation(equation);
      setIsEditing(false);
    }
  };

  let katexHtml = '';
  if (tempEquation.trim()) {
    try {
      katexHtml = katex.renderToString(tempEquation.trim(), {
        displayMode: false,
        throwOnError: false,
        strict: 'ignore',
      });
    } catch (err) {
      katexHtml = `<span class="text-rose-500 font-mono text-[10px]">Error</span>`;
    }
  }

  return (
    <NodeViewWrapper as="span" className="math-inline-node-wrapper inline-block align-middle mx-0.5 select-none">
      {isEditing ? (
        <span className="inline-flex items-center gap-1 bg-[#1E293B] border border-blue-500 rounded px-1.5 py-0.5 text-xs">
          <span className="text-[10px] font-bold text-blue-400 font-mono select-none">$</span>
          <input
            type="text"
            value={tempEquation}
            onChange={(e) => setTempEquation(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="formula"
            className="bg-transparent text-[#F8FAFC] border-none outline-none font-mono text-xs w-24 p-0 focus:ring-0"
            autoFocus
          />
          <span className="text-[10px] font-bold text-blue-400 font-mono select-none">$</span>
        </span>
      ) : (
        <span 
          onClick={() => setIsEditing(true)}
          className={`inline-flex items-center cursor-pointer px-1 py-0.5 rounded transition-colors ${
            selected 
              ? 'bg-blue-600/20 ring-1 ring-blue-500 text-[#F8FAFC]' 
              : 'bg-[#1E293B]/60 hover:bg-[#1E293B] text-[#E2E8F0] border border-[#334155]/60'
          }`}
          title="Click to edit math formula"
        >
          {tempEquation.trim() ? (
            <span 
              className="inline-math-render"
              dangerouslySetInnerHTML={{ __html: katexHtml }}
            />
          ) : (
            <span className="text-[#64748B] font-mono text-[10px] italic">empty $x$</span>
          )}
        </span>
      )}
    </NodeViewWrapper>
  );
}
