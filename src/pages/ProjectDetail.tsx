import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, ExternalLink, Clock } from 'lucide-react';
import { useEffect, useRef, useMemo, useState } from 'react';
import { api } from '../lib/api';
import katex from 'katex';
import mermaid from 'mermaid';

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

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
});

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

function CategoryBadge({ category }: { category: Project['category'] }) {
  const getStyle = () => {
    switch (category) {
      case 'signal-processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'control':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'data-analysis':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getLabel = () => {
    switch (category) {
      case 'signal-processing':
        return 'Signal Processing';
      case 'control':
        return 'Control';
      case 'data-analysis':
        return 'Data Analysis';
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
  type: 'html' | 'mermaid';
  content: string;
  index: number;
}

function renderMarkdown(content: string): string {
  let html = content;

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
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mt-8 mb-4">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mt-10 mb-4 pb-2 border-b border-[#E5E7EB] dark:border-[#334155]">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-6">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 mb-2 text-[#4B5563] dark:text-[#94A3B8]">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-4 space-y-1">$&</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-2 text-[#4B5563] dark:text-[#94A3B8]">$1</li>');

  // Paragraphs (lines that don't start with special characters)
  html = html.replace(/^(?!<[hul]|<div|<li|```)([\w\S].*)$/gm, '<p class="text-[#4B5563] dark:text-[#94A3B8] leading-relaxed mb-4">$1</p>');

  return html;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let mermaidIndex = 0;
  let partIndex = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    // Add HTML part before this mermaid block
    if (match.index > lastIndex) {
      const htmlContent = content.slice(lastIndex, match.index);
      if (htmlContent.trim()) {
        parts.push({ type: 'html', content: renderMarkdown(htmlContent), index: partIndex++ });
      }
    }

    // Add mermaid block
    parts.push({ type: 'mermaid', content: match[1].trim(), index: mermaidIndex++ });
    lastIndex = match.index + match[0].length;
    partIndex++;
  }

  // Add remaining HTML content
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      parts.push({ type: 'html', content: renderMarkdown(remaining), index: partIndex });
    }
  }

  return parts;
}

function MermaidDiagram({ code, id }: { code: string; id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (containerRef.current) {
        try {
          const { svg } = await mermaid.render(`mermaid-diagram-${id}`, code);
          containerRef.current.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid render error:', error);
          containerRef.current.innerHTML = `<pre class="text-red-500">Diagram render error</pre>`;
        }
      }
    };
    renderDiagram();
  }, [code, id]);

  return (
    <div
      ref={containerRef}
      className="my-8 p-6 bg-[#F8FAFC] dark:bg-[#1E293B] rounded-xl flex justify-center overflow-x-auto"
    />
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/api/projects/public/${id}`, false)
      .then((data: Project) => setProject(data))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [id]);

  const contentParts = useMemo(() => {
    if (!project) return [];
    return parseContent(project.content);
  }, [project]);

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
              Project Not Found
            </h1>
            <p className="text-[#6B7280] mb-8">
              The project you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/engineering"
              className="inline-flex items-center px-6 py-3 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </button>

        {/* Project Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <CategoryBadge category={project.category} />
            {project.date && (
              <span className="text-[#6B7280] text-sm flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(project.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
            {project.title}
          </h1>

          <p className="text-xl text-[#6B7280] mb-4">
            {project.description}
          </p>

          {/* Timestamps */}
          {(project.createdAt || project.updatedAt) && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#9CA3AF] dark:text-[#6B7280] mb-4">
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
          <div className="flex flex-wrap gap-2 mb-6">
            {project.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#E5E7EB] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] text-sm font-medium"
              >
                <Tag className="w-3 h-3 mr-1.5" />
                {tag}
              </span>
            ))}
          </div>

          {/* Project Links */}
          {(project.githubUrl || project.paperUrl || project.demoUrl) && (
            <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-xl p-6 border border-[#E5E7EB] dark:border-[#334155]">
              <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-[#1E40AF] dark:text-[#60A5FA]" />
                Project Links
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:border-[#1E40AF] dark:hover:border-[#60A5FA] transition-colors group"
                  >
                    <div className="w-10 h-10 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA]">
                        GitHub Repository
                      </p>
                      <p className="text-xs text-[#6B7280] truncate">View source code</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#6B7280] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA]" />
                  </a>
                )}

                {project.paperUrl && (
                  <a
                    href={project.paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:border-[#1E40AF] dark:hover:border-[#60A5FA] transition-colors group"
                  >
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA]">
                        Research Paper
                      </p>
                      <p className="text-xs text-[#6B7280] truncate">Read documentation</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#6B7280] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA]" />
                  </a>
                )}

                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:border-[#1E40AF] dark:hover:border-[#60A5FA] transition-colors group"
                  >
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,16.5L18,12L11,7.5V16.5Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA]">
                        Live Demo
                      </p>
                      <p className="text-xs text-[#6B7280] truncate">Try the application</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#6B7280] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA]" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <hr className="border-[#E5E7EB] dark:border-[#334155] mb-10" />

        {/* Project Content */}
        <article className="prose prose-lg dark:prose-invert max-w-none">
          {contentParts.map((part, idx) => {
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
        <div className="mt-16 pt-8 border-t border-[#E5E7EB] dark:border-[#334155]">
          <Link
            to="/engineering"
            className="inline-flex items-center px-6 py-3 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            View All Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
