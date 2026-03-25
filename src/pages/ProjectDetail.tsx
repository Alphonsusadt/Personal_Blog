import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useMemo } from 'react';
import { getProjectById, Project } from '../data/projects';
import katex from 'katex';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
});

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
  const project = id ? getProjectById(id) : undefined;

  const contentParts = useMemo(() => {
    if (!project) return [];
    return parseContent(project.content);
  }, [project]);

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
            <span className="text-[#6B7280] text-sm flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              2024
            </span>
          </div>

          <h1 className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
            {project.title}
          </h1>

          <p className="text-xl text-[#6B7280] mb-6">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
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
