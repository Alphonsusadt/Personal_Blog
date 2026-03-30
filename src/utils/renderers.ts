import katex from 'katex';
import mermaid from 'mermaid';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
  themeCSS: `
    .node rect {
      fill: #F8FAFC;
      stroke: #1E40AF;
      stroke-width: 1px;
    }
    .edgeLabel {
      background-color: #F8FAFC;
      color: #1A1A1A;
    }
    .label {
      color: #1A1A1A;
    }
    .dark .node rect {
      fill: #1E293B;
      stroke: #60A5FA;
    }
    .dark .edgeLabel {
      background-color: #1E293B;
      color: #F8FAFC;
    }
    .dark .label {
      color: #F8FAFC;
    }
  `
});

export function renderLaTeX(content: string): string {
  // Handle block equations $$...$$
  content = content.replace(/\$\$([\s\S]*?)\$\$/g, (_match, equation) => {
    try {
      return katex.renderToString(equation.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore'
      });
    } catch (error) {
      return `<div class="text-red-500">Error rendering equation: ${equation}</div>`;
    }
  });

  // Handle inline equations $...$
  content = content.replace(/\$([^$\n]+?)\$/g, (_match, equation) => {
    try {
      return katex.renderToString(equation.trim(), {
        displayMode: false,
        throwOnError: false,
        strict: 'ignore'
      });
    } catch (error) {
      return `<span class="text-red-500">Error: ${equation}</span>`;
    }
  });

  return content;
}

export async function renderMermaid(content: string): Promise<string> {
  // Find all mermaid code blocks
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  const matches = [...content.matchAll(mermaidRegex)];

  for (const match of matches) {
    const chartDefinition = match[1].trim();
    try {
      const { svg } = await mermaid.render(
        `mermaid-${Math.random().toString(36).substr(2, 9)}`,
        chartDefinition
      );
      content = content.replace(match[0], `<div class="mermaid">${svg}</div>`);
    } catch (error) {
      content = content.replace(
        match[0],
        `<div class="text-red-500">Error rendering diagram</div>`
      );
    }
  }

  return content;
}

export async function renderContent(content: string): Promise<string> {
  let processedContent = renderLaTeX(content);
  processedContent = await renderMermaid(processedContent);
  return processedContent;
}

// Simple markdown to HTML converter for basic formatting
export function markdownToHtml(content: string): string {
  // Headers
  content = content.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>');
  content = content.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1</h2>');
  content = content.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-10 mb-6">$1</h1>');

  // Bold
  content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  content = content.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" class="text-[#1E40AF] hover:underline">$1</a>');

  // Blockquotes
  content = content.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-[#1E40AF] pl-4 my-4 serif-font text-[#6B7280]">$1</blockquote>');

  // Code blocks (excluding mermaid)
  content = content.replace(/```(?!mermaid)\n([\s\S]*?)\n```/g, '<pre class="bg-[#F1F5F9] dark:bg-[#1E293B] p-4 rounded-lg overflow-x-auto mono-font text-sm my-4"><code>$1</code></pre>');

  // Inline code
  content = content.replace(/`([^`]+)`/g, '<code class="bg-[#F1F5F9] dark:bg-[#1E293B] px-1.5 py-0.5 rounded text-sm mono-font">$1</code>');

  // Paragraphs (for lines that don't start with HTML tags)
  content = content.replace(/^(?!<[h1-6]|<blockquote|<pre|<div|<p)(.+)$/gim, '<p class="mb-4">$1</p>');

  return content;
}

// Combined Markdown + LaTeX renderer for live preview
export function renderMarkdown(content: string): string {
  // First render LaTeX equations
  let processed = renderLaTeX(content);
  // Then convert markdown to HTML
  processed = markdownToHtml(processed);
  return processed;
}