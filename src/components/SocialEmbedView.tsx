import React, { useEffect, useRef, useState } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Youtube, Instagram, Twitter, Loader2, AlertCircle } from 'lucide-react';

// Helper to dynamically load the Twitter widgets script in the editor
const loadTwitterScript = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).twttr) {
      resolve();
      return;
    }
    const id = 'twitter-wjs';
    if (document.getElementById(id)) {
      // Script is already injecting, poll for completion
      const interval = setInterval(() => {
        if ((window as any).twttr) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.setAttribute('src', 'https://platform.twitter.com/widgets.js');
    script.setAttribute('async', 'true');
    script.setAttribute('charset', 'utf-8');
    script.onload = () => resolve();
    script.onerror = () => resolve(); // Resolve anyway to avoid infinite hang
    document.head.appendChild(script);
  });
};

export function SocialEmbedView(props: NodeViewProps) {
  const { url, type, width, alignment } = props.node.attrs;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const twitterContainerRef = useRef<HTMLDivElement>(null);
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
      const newWidthPx = e.clientX - rect.left;
      
      let newWidthPercent = Math.round((newWidthPx / parentWidth) * 100);
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

  // Helper to extract YouTube video ID
  const getYouTubeId = (videoUrl: string): string | null => {
    try {
      const parsed = new URL(videoUrl);
      if (parsed.hostname.includes('youtube.com')) {
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
        if (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/')) {
          return parsed.pathname.split('/')[2];
        }
      }
      if (parsed.hostname === 'youtu.be') {
        return parsed.pathname.slice(1);
      }
    } catch {
      // Regex fallback
      const m = videoUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (m) return m[1];
      const m2 = videoUrl.match(/(?:youtu\.be|embed|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (m2) return m2[1];
    }
    return null;
  };

  // Helper to extract Instagram post ID
  const getInstagramId = (igUrl: string): string | null => {
    const match = igUrl.match(/\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // Run effect to hydrate embeds (especially for X/Twitter)
  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    setError(null);

    const initEmbed = async () => {
      if (type === 'twitter') {
        try {
          await loadTwitterScript();
          if (!isMountedRef.current) return;
          
          if (!(window as any).twttr || !(window as any).twttr.widgets) {
            throw new Error('Twitter widgets script failed to load.');
          }

          if (twitterContainerRef.current) {
            twitterContainerRef.current.innerHTML = '';
            const tweetId = url.split('/status/')[1]?.split('?')[0] || '';
            if (!tweetId) {
              throw new Error('Could not extract status ID from X link.');
            }

            // Create tweet widget inside the container
            await (window as any).twttr.widgets.createTweet(tweetId, twitterContainerRef.current, {
              theme: 'dark',
              align: 'center',
              conversation: 'none',
              dnt: true,
            });

            if (isMountedRef.current) {
              setLoading(false);
            }
          }
        } catch (err: any) {
          console.error('[SocialEmbedView] Twitter error:', err);
          if (isMountedRef.current) {
            setError(err.message || 'Failed to render X tweet.');
            setLoading(false);
          }
        }
      } else {
        // YouTube and Instagram just render iframes, which load natively.
        // We set loading false after a small delay.
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    };

    initEmbed();

    return () => {
      isMountedRef.current = false;
    };
  }, [url, type]);

  // Determine width classes
  const widthStyle = width || '100%';

  // Determine alignment classes
  let alignmentClass = 'mx-auto';
  let floatStyle = 'none';
  let marginStyle = '1.5rem auto';
  let displayStyle = 'block';

  if (alignment === 'left') {
    alignmentClass = 'mr-auto';
    floatStyle = 'left';
    marginStyle = '0.5rem 1.5rem 1.5rem 0';
  } else if (alignment === 'right') {
    alignmentClass = 'ml-auto';
    floatStyle = 'right';
    marginStyle = '0.5rem 0 1.5rem 1.5rem';
  }

  // Selected state border styling
  const isSelected = props.selected;
  const containerBorderClass = isSelected 
    ? 'ring-2 ring-[#60A5FA] border-[#60A5FA]' 
    : 'border-[#334155] hover:border-[#475569]';

  // Render YouTube
  const renderYouTube = () => {
    const videoId = getYouTubeId(url);
    if (!videoId) {
      return (
        <div className="flex items-center gap-2 text-rose-400 p-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs">Invalid YouTube URL: {url}</span>
        </div>
      );
    }

    return (
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video"
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
          allowFullScreen
        />
        {/* Transparent overlay to catch clicks in Tiptap and prevent player activation inside the editing canvas */}
        <div className="absolute inset-0 bg-transparent cursor-pointer" />
      </div>
    );
  };

  // Render Instagram
  const renderInstagram = () => {
    const igId = getInstagramId(url);
    if (!igId) {
      return (
        <div className="flex items-center gap-2 text-rose-400 p-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs">Invalid Instagram URL: {url}</span>
        </div>
      );
    }

    return (
      <div className="w-full flex justify-center bg-zinc-900/50 p-4 rounded-lg relative min-h-[400px]">
        <iframe
          src={`https://www.instagram.com/p/${igId}/embed/`}
          className="w-full max-w-[400px] h-[450px] border-0 rounded-lg pointer-events-none"
          scrolling="no"
          allowTransparency
        />
        {/* Transparent overlay */}
        <div className="absolute inset-0 bg-transparent cursor-pointer" />
      </div>
    );
  };

  // Render Twitter
  const renderTwitter = () => {
    return (
      <div className="w-full flex justify-center bg-black/30 p-2 rounded-lg relative min-h-[150px]">
        <div 
          ref={twitterContainerRef} 
          className="w-full max-w-[500px] flex justify-center [&>.twitter-tweet]:mx-auto" 
        />
        {/* Transparent overlay */}
        <div className="absolute inset-0 bg-transparent cursor-pointer" />
      </div>
    );
  };

  return (
    <NodeViewWrapper 
      className="social-embed-wrapper select-none group"
      style={{
        width: widthStyle,
        float: floatStyle as any,
        margin: marginStyle,
        display: displayStyle,
        clear: floatStyle !== 'none' ? 'none' : 'both',
      }}
    >
      <div ref={containerRef} className={`relative border rounded-xl bg-[#1E293B] overflow-hidden transition-all shadow-md ${containerBorderClass}`}>
        
        {/* Embed Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#0F172A] border-b border-[#334155] text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2 font-medium">
            {type === 'youtube' && <Youtube className="w-4 h-4 text-rose-500" />}
            {type === 'instagram' && <Instagram className="w-4 h-4 text-pink-500" />}
            {type === 'twitter' && <Twitter className="w-4 h-4 text-sky-400" />}
            <span className="capitalize">{type} Embed</span>
          </div>
          <span className="truncate max-w-[200px] opacity-75 font-mono text-[10px]">{url}</span>
        </div>

        {/* Live Preview Embed Area */}
        <div className="p-1 min-h-[80px] flex flex-col justify-center">
          {loading && type === 'twitter' && (
            <div className="flex flex-col items-center justify-center py-8 text-[#94A3B8] gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#60A5FA]" />
              <span className="text-xs">Loading X Card...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center p-6 text-rose-400 gap-2">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <span className="text-xs text-center font-medium">{error}</span>
              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[11px] underline text-[#60A5FA] hover:text-[#93C5FD]"
              >
                Open link in new tab
              </a>
            </div>
          )}

          {!error && (
            <div className={loading && type === 'twitter' ? 'hidden' : 'block'}>
              {type === 'youtube' && renderYouTube()}
              {type === 'instagram' && renderInstagram()}
              {type === 'twitter' && renderTwitter()}
            </div>
          )}
        </div>

        {/* Resizer Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute bottom-2 right-2 w-5 h-5 bg-blue-600 rounded-full border-2 border-white cursor-se-resize shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20"
          title="Drag to resize"
        >
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
