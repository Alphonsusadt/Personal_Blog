import React, { useRef, useState, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';

export function ImageNodeView(props: NodeViewProps) {
  const { src, alt, width, alignment } = props.node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);
  const isMountedRef = useRef(true);

  // Resize handler using drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const parentElement = containerRef.current.parentElement;
      if (!parentElement) return;

      const parentWidth = parentElement.offsetWidth;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate new width in pixels based on mouse offset from the left edge of the image
      const newWidthPx = e.clientX - rect.left;
      
      // Convert to percentage of parent container
      let newWidthPercent = Math.round((newWidthPx / parentWidth) * 100);
      
      // Clamp between 15% and 100%
      newWidthPercent = Math.max(15, Math.min(100, newWidthPercent));

      if (isMountedRef.current) {
        props.updateAttributes({
          width: `${newWidthPercent}%`
        });
      }
    };

    const handleMouseUp = () => {
      if (isMountedRef.current) {
        setResizing(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  // Determine width and float styles
  const widthStyle = width || '100%';
  let floatStyle = 'none';
  let marginStyle = '1.5rem auto';
  let displayStyle = 'block';

  if (alignment === 'left') {
    floatStyle = 'left';
    marginStyle = '0.5rem 1.5rem 1.5rem 0';
  } else if (alignment === 'right') {
    floatStyle = 'right';
    marginStyle = '0.5rem 0 1.5rem 1.5rem';
  }

  const isSelected = props.selected;
  const borderClass = isSelected 
    ? 'ring-2 ring-blue-500 border-blue-500' 
    : 'border-[#334155] hover:border-[#475569]';

  return (
    <NodeViewWrapper
      className="image-node-wrapper select-none group"
      style={{
        width: widthStyle,
        float: floatStyle as any,
        margin: marginStyle,
        display: displayStyle,
        clear: floatStyle !== 'none' ? 'none' : 'both',
      }}
    >
      <div 
        ref={containerRef} 
        className={`relative rounded-lg overflow-hidden border bg-[#1E293B] shadow-md transition-all ${borderClass}`}
      >
        <img 
          src={src} 
          alt={alt || 'Visual Image'} 
          className="w-full h-auto block rounded-lg cursor-pointer max-w-full"
          loading="lazy"
        />

        {/* Diagonal resizing handles in bottom-right corner */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute bottom-2 right-2 w-5 h-5 bg-blue-600 rounded-full border-2 border-white cursor-se-resize shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20"
          title="Drag to resize"
        >
          {/* Arrow cursor icon lines */}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="3" y2="21"></line>
          </svg>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
