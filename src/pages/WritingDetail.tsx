import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag, BookOpen, Edit3, PenTool } from 'lucide-react';
import { useMemo, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { embedYouTube } from '../lib/youtubeEmbed';
import { resolveLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';

interface Writing {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: 'reflections' | 'stories' | 'fiction';
  tags?: string[];
  content: string;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

function CategoryBadge({ category, language }: { category: Writing['category']; language: 'en' | 'id' }) {
  const getStyle = () => {
    switch (category) {
      case 'reflections':
        return 'bg-block-lilac text-ink border border-hairline';
      case 'stories':
        return 'bg-block-lime text-ink border border-hairline';
      case 'fiction':
        return 'bg-block-pink text-ink border border-hairline';
      default:
        return 'bg-surface-soft text-ink border border-hairline';
    }
  };

  const getLabel = () => {
    switch (category) {
      case 'reflections':
        return t('category.reflections', language);
      case 'stories':
        return t('category.stories', language);
      case 'fiction':
        return t('category.fiction', language);
      default:
        return category;
    }
  };

  const getIcon = () => {
    switch (category) {
      case 'reflections':
        return <BookOpen className="w-4 h-4 mr-1.5" />;
      case 'stories':
        return <Edit3 className="w-4 h-4 mr-1.5" />;
      case 'fiction':
        return <PenTool className="w-4 h-4 mr-1.5" />;
      default:
        return <BookOpen className="w-4 h-4 mr-1.5" />;
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStyle()}`}>
      {getIcon()}
      {getLabel()}
    </span>
  );
}

interface ContentPart {
  type: 'html' | 'mermaid';
  content: string;
  index: number;
}

let katexModule: typeof import('katex') | null = null;
async function getKatex() {
  if (!katexModule) katexModule = await import('katex');
  return katexModule.default;
}

async function renderMarkdown(content: string): Promise<string> {
  const katex = await getKatex();
  let html = content;

  // Process images first
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const safeAlt = alt.replace(/"/g, '&quot;');
    const safeUrl = url.replace(/"/g, '&quot;');
    return `<img src="${safeUrl}" alt="${safeAlt}" class="my-6 rounded-[16px] max-w-full h-auto border border-hairline block mx-auto" onerror="this.onerror=null; this.src='/placeholder-image.svg'; this.classList.add('opacity-50');" loading="lazy" />`;
  });

  // Process block LaTeX equations ($$...$$)
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try {
      return `<div class="my-6 overflow-x-auto">${katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="my-6 text-red-500">LaTeX Error: ${tex}</div>`;
    }
  });

  // Process inline LaTeX ($...$)
  html = html.replace(/\$([^$\n]+)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="text-red-500">${tex}</span>`;
    }
  });

  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary pl-4 my-6 italic text-ink opacity-80 serif-font">$1</blockquote>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="card-title text-ink mt-8 mb-4">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="display-sm text-ink mt-10 mb-4 pb-2 border-b border-hairline">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="display-md text-ink mb-6">$1</h1>');
  html = html.replace(/\*\*\[(.+?)\]\*\*/g, '<strong class="font-[480]">[$1]</strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-[480]">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 mb-2 body text-ink opacity-80 serif-font">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-4 space-y-1">$&</ul>');

  // Process markdown links (but not images which are already converted)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');

  html = html.replace(/^(?!<[hublq]|<div|<li|<img|<a|```)([\w\S].*)$/gm, '<p class="body text-ink opacity-80 leading-relaxed mb-4 serif-font">$1</p>');

  // Embed YouTube videos from links and bare URLs
  html = embedYouTube(html);

  return html;
}

function splitContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let mermaidIndex = 0;
  let partIndex = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const htmlContent = content.slice(lastIndex, match.index);
      if (htmlContent.trim()) {
        parts.push({ type: 'html', content: htmlContent, index: partIndex++ });
      }
    }
    parts.push({ type: 'mermaid', content: match[1].trim(), index: mermaidIndex++ });
    lastIndex = match.index + match[0].length;
    partIndex++;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      parts.push({ type: 'html', content: remaining, index: partIndex });
    }
  }

  return parts;
}

function MermaidDiagram({ code, id }: { code: string; id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
        if (cancelled) return;
        const { svg } = await mermaid.render(`mermaid-writing-${id}`, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (error) {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-red-500">Diagram render error</pre>`;
        }
      }
    };
    renderDiagram();
    return () => { cancelled = true; };
  }, [code, id]);

  return (
    <div
      ref={containerRef}
      className="my-8 p-6 bg-surface-soft border border-hairline rounded-[16px] flex justify-center overflow-x-auto"
    />
  );
}

export function WritingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useSiteLanguage();
  const [writing, setWriting] = useState<Writing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    api.getPublicSettings()
      .then((settings: any) => {
        const enabled = settings?.sections?.writings?.enabled !== false;
        if (!enabled) {
          navigate('/', { replace: true });
          return;
        }
        return api.get(`/api/writings/public/${id}`, false)
          .then((data: Writing) => {
            if (!cancelled) setWriting(data);
          })
          .catch(() => {
            if (!cancelled) setWriting(null);
          });
      })
      .catch(() => {
        return api.get(`/api/writings/public/${id}`, false)
          .then((data: Writing) => {
            if (!cancelled) setWriting(data);
          })
          .catch(() => {
            if (!cancelled) setWriting(null);
          });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const rawParts = useMemo(() => {
    if (!writing) return [];
    return splitContent(resolveLocalizedText(writing.content, language));
  }, [language, writing]);

  const [renderedParts, setRenderedParts] = useState<ContentPart[]>([]);

  useEffect(() => {
    if (rawParts.length === 0) return;
    let cancelled = false;
    Promise.all(
      rawParts.map(async (part) => {
        if (part.type === 'html') {
          return { ...part, content: await renderMarkdown(part.content) };
        }
        return part;
      })
    ).then((parts) => {
      if (!cancelled) setRenderedParts(parts);
    });
    return () => { cancelled = true; };
  }, [rawParts]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTimeDetailed = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!writing) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#E5E7EB] dark:bg-[#334155] flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-[#6B7280]" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
              {t('writings.writingNotFound', language)}
            </h1>
            <p className="text-[#6B7280] mb-8">
              {t('writings.writingNotFoundHint', language)}
            </p>
            <Link
              to="/writings"
              className="inline-flex items-center px-6 py-3 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('writings.backToWritings', language)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-[96px] bg-canvas">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center caption text-ink opacity-60 hover:opacity-100 transition-opacity mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('writings.backToWritings', language)}
        </button>

        {/* Writing Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <CategoryBadge category={writing.category} language={language} />
          </div>

          <h1 className="display-lg text-ink mb-6 serif-font">
            {resolveLocalizedText(writing.title, language)}
          </h1>

          <p className="body-lg text-ink opacity-80 mb-6 serif-font italic">
            {resolveLocalizedText(writing.excerpt, language)}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 caption text-ink opacity-60 mb-6">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1.5" />
              {formatDate(writing.date)}
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1.5" />
              {writing.readTime} {t('writings.read', language)}
            </span>
          </div>

          {/* Timestamps */}
          {(writing.createdAt || writing.updatedAt) && (
            <div className="flex flex-wrap items-center gap-4 caption text-ink opacity-40 mb-6">
              {writing.createdAt && (
                <span>{t('writings.postedAt', language)} {formatDateTimeDetailed(writing.createdAt)}</span>
              )}
              {writing.updatedAt && writing.updatedAt !== writing.createdAt && (
                <span>• {t('writings.updatedAt', language)} {formatDateTimeDetailed(writing.updatedAt)}</span>
              )}
            </div>
          )}

          {/* Tags */}
          {writing.tags && writing.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {writing.tags.map((tag, index) => (
                <span
                  key={index}
                  className="tag"
                >
                  <Tag className="w-3 h-3 mr-1.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Divider */}
        <hr className="border-hairline mb-10" />

        {/* Writing Content */}
        <article className="prose prose-lg dark:prose-invert max-w-none">
          {renderedParts.map((part, idx) => {
            if (part.type === 'html') {
              return (
                <div
                  key={`html-${idx}`}
                  dangerouslySetInnerHTML={{ __html: part.content }}
                />
              );
            } else {
              return (
                <MermaidDiagram
                  key={`mermaid-${idx}`}
                  code={part.content}
                  id={`${id}-${part.index}`}
                />
              );
            }
          })}
        </article>

        {/* Bottom Navigation */}
        <div className="mt-16 pt-8 border-t border-hairline">
          <Link
            to="/writings"
            className="btn btn-secondary inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('writings.viewAllWritings', language)}
          </Link>
        </div>
      </div>
    </div>
  );
}
