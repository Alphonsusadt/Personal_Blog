import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface TikzDiagramProps {
  code: string;
  id: string;
}

export function TikzDiagram({ code, id }: TikzDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);

    // Clean up existing elements
    containerRef.current.innerHTML = '';

    // Create the script element
    const script = document.createElement('script');
    script.type = 'text/tikz';
    script.id = `tikz-script-${id}`;
    
    // Ensure the code has \begin{tikzpicture} and \end{tikzpicture}
    let formattedCode = code.trim();
    if (!formattedCode.includes('\\begin{tikzpicture}')) {
      formattedCode = `\\begin{tikzpicture}\n${formattedCode}\n\\end{tikzpicture}`;
    }
    script.textContent = formattedCode;

    // Event listener for TikZJax completion
    const handleLoadFinished = (e: Event) => {
      if (e.target === script || (e as any).srcElement === script) {
        setIsLoading(false);
      }
    };

    // Listen for the custom tikzjax events
    script.addEventListener('tikzjax-load-finished', handleLoadFinished);
    document.addEventListener('tikzjax-load-finished', handleLoadFinished);

    containerRef.current.appendChild(script);

    // Explicitly trigger TikZJax compilation
    if (typeof window.onload === 'function') {
      try {
        (window.onload as any)();
      } catch (err) {
        console.error('Failed to trigger TikZJax compile:', err);
      }
    }

    // Fallback polling to detect when script is replaced by SVG (especially if cached)
    let attempts = 0;
    const interval = setInterval(() => {
      if (!containerRef.current) return;
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        setIsLoading(false);
        clearInterval(interval);
      }
      attempts++;
      if (attempts > 200) { // Stop polling after 10 seconds
        clearInterval(interval);
      }
    }, 50);

    return () => {
      clearInterval(interval);
      script.removeEventListener('tikzjax-load-finished', handleLoadFinished);
      document.removeEventListener('tikzjax-load-finished', handleLoadFinished);
    };
  }, [code, id]);

  return (
    <div className="my-8 flex flex-col items-center justify-center">
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 bg-surface-soft border border-hairline rounded-[16px] min-h-[150px] w-full max-w-lg">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="caption text-ink opacity-60">Mengompilasi LaTeX TikZ...</p>
        </div>
      )}
      <div
        ref={containerRef}
        className={`w-full p-6 bg-surface-soft border border-hairline rounded-[16px] flex justify-center overflow-x-auto tikz-container ${
          isLoading ? 'hidden' : ''
        }`}
      />
    </div>
  );
}
