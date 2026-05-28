import React, { useState, useEffect, useRef } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Palette, Loader2, Trash2 } from 'lucide-react';

export function TikzBlockNodeView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const code = node.attrs.code || '';
  const [isEditing, setIsEditing] = useState(selected);
  const [tempCode, setTempCode] = useState(code);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync selection state to editing state
  useEffect(() => {
    setIsEditing(selected);
  }, [selected]);

  // Sync attribute changes from external sources
  useEffect(() => {
    setTempCode(code);
  }, [code]);

  // Trigger TikZJax compilation
  const compileTikz = (tikzCode: string) => {
    if (!containerRef.current) return;

    if (!tikzCode.trim()) {
      containerRef.current.innerHTML = '<span class="text-[#475569] italic text-xs">Empty TikZ Block. Click to enter LaTeX TikZ code...</span>';
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    containerRef.current.innerHTML = '';

    // Create script node for TikZJax
    const script = document.createElement('script');
    script.type = 'text/tikz';
    script.id = `tikz-editor-${Math.random().toString(36).substr(2, 9)}`;

    // Ensure it has \begin{tikzpicture} and \end{tikzpicture}
    let formatted = tikzCode.trim();
    if (!formatted.includes('\\begin{tikzpicture}')) {
      formatted = `\\begin{tikzpicture}\n${formatted}\n\\end{tikzpicture}`;
    }
    script.textContent = formatted;

    const handleLoadFinished = (e: Event) => {
      if (e.target === script || (e as any).srcElement === script) {
        setIsLoading(false);
      }
    };

    script.addEventListener('tikzjax-load-finished', handleLoadFinished);
    document.addEventListener('tikzjax-load-finished', handleLoadFinished);

    containerRef.current.appendChild(script);

    // Call window.onload() to compile the script tag
    if (typeof window.onload === 'function') {
      try {
        (window.onload as any)();
      } catch (err) {
        console.error('Failed to trigger TikZJax compile:', err);
      }
    }

    // Polling fallback to detect when script is replaced by SVG (especially if cached)
    let attempts = 0;
    const interval = setInterval(() => {
      if (!containerRef.current) return;
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        setIsLoading(false);
        clearInterval(interval);
      }
      attempts++;
      if (attempts > 600) { // Timeout after 30s to allow first-time package downloads
        setIsLoading(false);
        if (containerRef.current && !containerRef.current.querySelector('svg')) {
          containerRef.current.innerHTML = '<span class="text-rose-500 text-xs font-mono">Compilation timed out. Please check if libraries (like circuitikz) are supported or syntax is correct.</span>';
        }
        clearInterval(interval);
      }
    }, 50);

    return () => {
      clearInterval(interval);
      script.removeEventListener('tikzjax-load-finished', handleLoadFinished);
      document.removeEventListener('tikzjax-load-finished', handleLoadFinished);
    };
  };

  // Compile on mount or when saved code changes
  useEffect(() => {
    compileTikz(code);
  }, [code]);

  // Debounced compilation of tempCode for real-time visual feedback while editing
  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      compileTikz(tempCode);
    }, 800); // 800ms debounce
    return () => clearTimeout(timer);
  }, [tempCode, isEditing]);

  const handleCommit = () => {
    updateAttributes({ code: tempCode.trim() });
  };

  const handleBlur = () => {
    handleCommit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommit();
      setIsEditing(false);
    }
  };

  return (
    <NodeViewWrapper className="tikz-block-node-wrapper my-6 relative group select-none">
      <div 
        className={`border rounded-lg p-4 bg-[#0B0F19] transition-all duration-200 ${
          selected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-[#334155] hover:border-[#475569]'
        }`}
      >
        <div className="flex items-center justify-between mb-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider select-none">
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            <span>LaTeX TikZ Diagram Block</span>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <span className="text-purple-400 animate-pulse font-mono">Editing Mode (Press Enter to apply)</span>
            ) : (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">Click to Edit</span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this TikZ block?')) {
                  deleteNode();
                }
              }}
              className="p-1 text-[#64748B] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors animate-fade-in"
              title="Delete TikZ Block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Editing Input */}
        {isEditing ? (
          <div className="mb-3">
            <textarea
              value={tempCode}
              onChange={(e) => setTempCode(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Type TikZ code here, e.g. \draw[red, very thick] (0,0) circle (1.5cm);"
              className="w-full bg-[#1E293B] text-[#F8FAFC] border border-[#334155] rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-purple-500 h-24 resize-y"
              autoFocus
            />
          </div>
        ) : null}

        {/* Output Render Box */}
        <div 
          onClick={() => setIsEditing(true)}
          className="overflow-x-auto py-2 flex flex-col justify-center items-center min-h-[3rem] rounded cursor-pointer relative bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors p-4"
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/95 z-10 rounded px-4 text-center">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin mr-2 shrink-0" />
              <span className="text-xs text-[#64748B] font-mono">Compiling (first run with libraries may take longer to download dependencies)...</span>
            </div>
          )}
          <div 
            ref={containerRef}
            className="tikz-render max-w-full text-black"
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
