import { useState, useEffect } from 'react';
import { renderMarkdown } from '../utils/renderers';

export function useRenderedMarkdown(content: string): string {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    renderMarkdown(content)
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch((err) => {
        console.error('[useRenderedMarkdown] Failed to render:', err);
        // Fallback: show raw content escaped
        if (!cancelled) {
          setHtml(content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br/>'));
        }
      });
    return () => { cancelled = true; };
  }, [content]);

  return html;
}
