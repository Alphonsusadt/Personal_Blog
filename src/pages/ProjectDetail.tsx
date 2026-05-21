import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, ExternalLink, Clock } from 'lucide-react';
import { useEffect, useRef, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { embedYouTube } from '../lib/youtubeEmbed';
import { CodeBlock } from '../components/CodeBlock';
import { resolveLocalizedText } from '../lib/localized';
import { useSiteLanguage } from '../hooks/useSiteLanguage';
import { t } from '../lib/translations';

interface Project {
  _id?: string;
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: 'signal-processing' | 'control' | 'data-analysis';
  content: string;
  status?: 'draft' | 'published' | 'scheduled';
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  devStatus?: 'planning' | 'ongoing' | 'completed';
  date?: string;
  githubUrl?: string;
  paperUrl?: string;
  demoUrl?: string;
}

function formatDateTimeDetailed(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function CategoryBadge({ category, language }: { category: Project['category']; language: 'en' | 'id' }) {
  const getStyle = () => {
    switch (category) {
      case 'signal-processing':
        return 'bg-block-lilac text-ink border border-hairline';
      case 'control':
        return 'bg-block-lime text-ink border border-hairline';
      case 'data-analysis':
        return 'bg-block-pink text-ink border border-hairline';
      default:
        return 'bg-surface-soft text-ink border border-hairline';
    }
  };

  const getLabel = () => {
    switch (category) {
      case 'signal-processing':
        return t('category.signalProcessing', language);
      case 'control':
        return t('category.control', language);
      case 'data-analysis':
        return t('category.dataAnalysis', language);
      default:
        return category;
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStyle()}`}>
      {getLabel()}
    </span>
  );
}

interface ContentPart {
  type: 'html' | 'mermaid' | 'code';
  content: string;
  index: number;
  language?: string;
  title?: string;
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

  // Process Markdown
  html = html.replace(/^### (.+)$/gm, '<h3 class="card-title text-ink mt-8 mb-4">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="display-sm text-ink mt-10 mb-4 pb-2 border-b border-hairline">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="display-md text-ink mb-6">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-[480]">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 mb-2 body text-ink opacity-80">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-4 space-y-1">$&</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-2 body text-ink opacity-80">$1</li>');

  // Process markdown links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');

  html = html.replace(/^(?!<[hul]|<div|<li|<a|<img|```)([\w\S].*)$/gm, '<p class="body text-ink opacity-80 leading-relaxed mb-4">$1</p>');

  // Embed YouTube videos from links and bare URLs
  html = embedYouTube(html);

  return html;
}

function splitContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let mermaidIndex = 0;
  let partIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const htmlContent = content.slice(lastIndex, match.index);
      if (htmlContent.trim()) {
        parts.push({ type: 'html', content: htmlContent, index: partIndex++ });
      }
    }

    const lang = match[1].toLowerCase();

    if (lang === 'mermaid') {
      parts.push({ type: 'mermaid', content: match[2].trim(), index: mermaidIndex++ });
    } else {
      parts.push({
        type: 'code',
        content: match[2],
        index: partIndex,
        language: lang || 'plaintext',
        title: lang || undefined,
      });
    }

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
        const { svg } = await mermaid.render(`mermaid-diagram-${id}`, code);
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

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useSiteLanguage();
  const [project, setProject] = useState<Project | null>(null);
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
        const enabled = settings?.sections?.projects?.enabled !== false;
        if (!enabled) {
          navigate('/', { replace: true });
          return;
        }
        return api.get(`/api/projects/public/${id}`, false)
          .then((data: Project) => {
            if (!cancelled) setProject(data);
          })
          .catch(() => {
            if (!cancelled) setProject(null);
          });
      })
      .catch(() => {
        // If settings fail, fall back to attempting to fetch
        return api.get(`/api/projects/public/${id}`, false)
          .then((data: Project) => {
            if (!cancelled) setProject(data);
          })
          .catch(() => {
            if (!cancelled) setProject(null);
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
    if (!project) return [];
    return splitContent(resolveLocalizedText(project.content, language));
  }, [language, project]);

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

  if (loading) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#E5E7EB] dark:bg-[#334155] flex items-center justify-center">
              <ExternalLink className="w-12 h-12 text-[#6B7280]" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
              {t('engineering.projectNotFound', language)}
            </h1>
            <p className="text-[#6B7280] mb-8">
              {t('engineering.projectNotFoundHint', language)}
            </p>
            <Link
              to="/engineering"
              className="inline-flex items-center px-6 py-3 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('engineering.backToProjects', language)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 md:py-[96px] bg-canvas">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center caption text-ink opacity-60 hover:opacity-100 transition-opacity mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('engineering.backToProjects', language)}
        </button>

        {/* Project Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <CategoryBadge category={project.category} language={language} />
            {project.date && (
              <span className="caption text-ink opacity-60 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(project.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}
              </span>
            )}
          </div>

          <h1 className="display-lg text-ink mb-6">
            {resolveLocalizedText(project.title, language)}
          </h1>

          <p className="body-lg text-ink opacity-80 mb-6">
            {resolveLocalizedText(project.description, language)}
          </p>

          {/* Timestamps */}
          {(project.createdAt || project.updatedAt) && (
            <div className="flex flex-wrap items-center gap-4 caption text-ink opacity-40 mb-6">
              {project.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Diposting: {formatDateTimeDetailed(project.createdAt)}
                </span>
              )}
              {project.updatedAt && project.updatedAt !== project.createdAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Diperbarui: {formatDateTimeDetailed(project.updatedAt)}
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {project.tags.map((tag, index) => (
              <span
                key={index}
                className="tag"
              >
                <Tag className="w-3 h-3 mr-1.5" />
                {tag}
              </span>
            ))}
          </div>

          {/* Project Links */}
          {(project.githubUrl || project.paperUrl || project.demoUrl) && (
            <div className="bg-canvas rounded-[24px] p-8 border border-hairline shadow-sm">
              <h3 className="card-title text-ink mb-6 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-ink" />
                {t('engineering.projectLinks', language)}
              </h3>
              <div className="flex flex-wrap gap-4">
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary inline-flex items-center"
                  >
                    {t('engineering.githubRepo', language)}
                  </a>
                )}

                {project.paperUrl && (
                  <a
                    href={project.paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary inline-flex items-center"
                  >
                    {t('engineering.researchPaper', language)}
                  </a>
                )}

                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary inline-flex items-center"
                  >
                    {t('engineering.liveDemo', language)}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <hr className="border-hairline mb-10" />

        {/* Project Content */}
        <article className="prose prose-lg dark:prose-invert max-w-none">
          {renderedParts.map((part, idx) => {
            if (part.type === 'html') {
              return (
                <div
                  key={`html-${idx}`}
                  dangerouslySetInnerHTML={{ __html: part.content }}
                />
              );
            } else if (part.type === 'code') {
              return (
                <CodeBlock
                  key={`code-${idx}`}
                  code={part.content}
                  language={part.language || 'plaintext'}
                  title={part.title}
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
            to="/engineering"
            className="btn btn-secondary inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('engineering.viewAllProjects', language)}
          </Link>
        </div>
      </div>
    </div>
  );
}
