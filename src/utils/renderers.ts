let katexModule: typeof import('katex') | null = null;
let mermaidModule: typeof import('mermaid') | null = null;
let mermaidInitialized = false;
let prismModule: any = null;

async function getKatex() {
  if (!katexModule) katexModule = await import('katex');
  return katexModule.default;
}

async function getMermaid() {
  if (!mermaidModule) mermaidModule = await import('mermaid');
  const m = mermaidModule.default;
  if (!mermaidInitialized) {
    m.initialize({
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
    mermaidInitialized = true;
  }
  return m;
}

async function getPrism() {
  if (!prismModule) {
    // @ts-ignore
    prismModule = await import('prismjs');
    await Promise.all([
      // @ts-ignore
      import('prismjs/components/prism-markup-templating'),
      // @ts-ignore
      import('prismjs/components/prism-javascript'),
      // @ts-ignore
      import('prismjs/components/prism-typescript'),
      // @ts-ignore
      import('prismjs/components/prism-python'),
      // @ts-ignore
      import('prismjs/components/prism-css'),
      // @ts-ignore
      import('prismjs/components/prism-json'),
      // @ts-ignore
      import('prismjs/components/prism-bash'),
      // @ts-ignore
      import('prismjs/components/prism-markup'),
      // @ts-ignore
      import('prismjs/components/prism-c'),
      // @ts-ignore
      import('prismjs/components/prism-cpp'),
      // @ts-ignore
      import('prismjs/components/prism-java'),
      // @ts-ignore
      import('prismjs/components/prism-matlab'),
      // @ts-ignore
      import('prismjs/components/prism-sql'),
      // @ts-ignore
      import('prismjs/components/prism-csharp'),
      // @ts-ignore
      import('prismjs/components/prism-go'),
      // @ts-ignore
      import('prismjs/components/prism-rust'),
      // @ts-ignore
      import('prismjs/components/prism-php'),
      // @ts-ignore
      import('prismjs/components/prism-ruby'),
      // @ts-ignore
      import('prismjs/components/prism-yaml'),
    ]);
  }
  return prismModule;
}

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash',
  yml: 'yaml', html: 'markup', xml: 'markup', svg: 'markup', matlab: 'matlab',
  cs: 'csharp', golang: 'go',
};

const LANG_COLORS: Record<string, { bg: string; text: string }> = {
  javascript: { bg: '#fef3c7', text: '#92400e' },
  typescript: { bg: '#dbeafe', text: '#1e40af' },
  python: { bg: '#d1fae5', text: '#065f46' },
  java: { bg: '#ffedd5', text: '#9a3412' },
  cpp: { bg: '#e0e7ff', text: '#3730a3' },
  c: { bg: '#f1f5f9', text: '#334155' },
  csharp: { bg: '#ede9fe', text: '#5b21b6' },
  go: { bg: '#cffafe', text: '#155e75' },
  rust: { bg: '#fef3c7', text: '#92400e' },
  sql: { bg: '#e0f2fe', text: '#075985' },
  html: { bg: '#ffedd5', text: '#9a3412' },
  css: { bg: '#fce7f3', text: '#9d174d' },
  json: { bg: '#f3f4f6', text: '#374151' },
  yaml: { bg: '#ccfbf1', text: '#115e59' },
  bash: { bg: '#ecfccb', text: '#3f6212' },
  matlab: { bg: '#ffe4e6', text: '#9f1239' },
  markup: { bg: '#ffedd5', text: '#9a3412' },
};

const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', c: 'C', csharp: 'C#', go: 'Go', rust: 'Rust',
  sql: 'SQL', html: 'HTML', css: 'CSS', json: 'JSON', yaml: 'YAML',
  bash: 'Bash', matlab: 'MATLAB', markup: 'HTML',
};

function getPrismLang(lang: string): string {
  return LANG_MAP[lang.toLowerCase()] || lang.toLowerCase();
}

export async function renderLaTeX(content: string): Promise<string> {
  const katex = await getKatex();

  // Handle block equations $$...$$
  content = content.replace(/\$\$([\s\S]*?)\$\$/g, (_match, equation) => {
    try {
      return katex.renderToString(equation.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore'
      });
    } catch {
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
    } catch {
      return `<span class="text-red-500">Error: ${equation}</span>`;
    }
  });

  return content;
}

export async function renderMermaid(content: string): Promise<string> {
  const mermaid = await getMermaid();
  const mermaidRegex = /```mermaid\r?\n([\s\S]*?)\r?\n```/g;
  const matches = [...content.matchAll(mermaidRegex)];

  for (const match of matches) {
    const chartDefinition = match[1].trim();
    try {
      const { svg } = await mermaid.render(
        `mermaid-${Math.random().toString(36).substr(2, 9)}`,
        chartDefinition
      );
      content = content.replace(match[0], `<div class="mermaid">${svg}</div>`);
    } catch {
      content = content.replace(
        match[0],
        `<div class="text-red-500">Error rendering diagram</div>`
      );
    }
  }

  return content;
}

export async function renderContent(content: string): Promise<string> {
  let processedContent = await renderLaTeX(content);
  processedContent = await renderMermaid(processedContent);
  processedContent = await renderCodeBlocks(processedContent);
  return processedContent;
}

/** Highlight code blocks with Prism.js and wrap in styled HTML using table layout for alignment */
async function renderCodeBlocks(content: string): Promise<string> {
  const codeBlockRegex = /```(\w*)\r?\n([\s\S]*?)```/g;
  const matches = [...content.matchAll(codeBlockRegex)];
  if (matches.length === 0) return content;

  let Prism: any = null;
  try {
    Prism = await getPrism();
  } catch (e) {
    console.error('[renderCodeBlocks] Failed to load Prism.js, falling back to plain code blocks:', e);
    // Fallback: wrap code blocks in simple styled pre/code without highlighting
    for (const match of matches) {
      const rawLang = match[1].toLowerCase();
      if (rawLang === 'mermaid') continue;
      const code = match[2];
      const label = LANG_LABELS[rawLang] || (rawLang ? rawLang.charAt(0).toUpperCase() + rawLang.slice(1) : 'Code');
      const colors = LANG_COLORS[rawLang] || { bg: '#f3f4f6', text: '#374151' };
      const escaped = escapeHtml(code.trimEnd());
      const lines = escaped.split('\n');
      const lineCount = lines.length;
      const gutterWidth = String(lineCount).length;
      const rowsHtml = lines.map((line, i) =>
        `<tr><td style="user-select:none;text-align:right;padding:0 16px 0 16px;border-right:1px solid #3d3d3d;color:#555;vertical-align:top;white-space:nowrap;width:${gutterWidth + 3}ch;">${String(i + 1).padStart(gutterWidth)}</td><td style="padding:0 16px 0 16px;vertical-align:top;white-space:pre;color:#ccc;">${line || '&nbsp;'}</td></tr>`
      ).join('');
      const html = `<div style="margin:24px 0;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,0.1);"><div style="display:flex;align-items:center;justify-content:space-between;background:#F8FAFC;padding:10px 16px;border-bottom:1px solid #E5E7EB;"><span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:9999px;font-size:13px;font-weight:500;background:${colors.bg};color:${colors.text};"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>${label}</span></div><div style="background:#1e1e1e;overflow-x:auto;"><table style="border-collapse:collapse;width:100%;font-size:13px;line-height:1.6;font-family:'JetBrains Mono','Courier New',monospace;"><tbody style="padding:16px 0;">${rowsHtml}</tbody></table></div></div>`;
      content = content.replace(match[0], html);
    }
    return content;
  }

  for (const match of matches) {
    const rawLang = match[1].toLowerCase();
    if (rawLang === 'mermaid') continue;

    const prismLang = getPrismLang(rawLang);
    const code = match[2];
    const grammar = Prism.languages[prismLang];

    let highlighted: string;
    try {
      highlighted = grammar
        ? Prism.highlight(code, grammar, prismLang)
        : escapeHtml(code);
    } catch {
      highlighted = escapeHtml(code);
    }

    const highlightedLines = highlighted.split('\n');
    const lineCount = highlightedLines.length;
    const gutterWidth = String(lineCount).length;
    const label = LANG_LABELS[prismLang] || (rawLang ? rawLang.charAt(0).toUpperCase() + rawLang.slice(1) : 'Code');
    const colors = LANG_COLORS[prismLang] || { bg: '#f3f4f6', text: '#374151' };

    const rowsHtml = highlightedLines.map((lineHtml, i) =>
      `<tr><td style="user-select:none;text-align:right;padding:0 16px 0 16px;border-right:1px solid #3d3d3d;color:#555;vertical-align:top;white-space:nowrap;width:${gutterWidth + 3}ch;">${String(i + 1).padStart(gutterWidth)}</td><td style="padding:0 16px 0 16px;vertical-align:top;white-space:pre;color:#ccc;">${lineHtml || '&nbsp;'}</td></tr>`
    ).join('');

    const html = `<div style="margin:24px 0;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,0.1);"><div style="display:flex;align-items:center;justify-content:space-between;background:#F8FAFC;padding:10px 16px;border-bottom:1px solid #E5E7EB;"><span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:9999px;font-size:13px;font-weight:500;background:${colors.bg};color:${colors.text};"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>${label}</span></div><div style="background:#1e1e1e;overflow-x:auto;"><table style="border-collapse:collapse;width:100%;font-size:13px;line-height:1.6;font-family:'JetBrains Mono','Courier New',monospace;"><tbody style="padding:16px 0;">${rowsHtml}</tbody></table></div></div>`;

    content = content.replace(match[0], html);
  }

  return content;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Simple markdown to HTML converter for basic formatting
export function markdownToHtml(content: string): string {
  // Headers
  content = content.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>');
  content = content.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1</h2>');
  content = content.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-10 mb-6">$1</h1>');

  // Images - render before links to prevent conflicts
  content = content.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4 shadow-md block mx-auto" loading="lazy" />');

  // Bold
  content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  content = content.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" class="text-[#1E40AF] hover:underline">$1</a>');

  // Blockquotes
  content = content.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-[#1E40AF] pl-4 my-4 serif-font text-[#6B7280]">$1</blockquote>');

  // Code blocks are now handled by renderCodeBlocks() before this function runs.
  // This regex only catches any remaining code blocks without language identifiers:
  content = content.replace(/```\r?\n([\s\S]*?)```/g, '<pre class="bg-[#F1F5F9] dark:bg-[#1E293B] p-4 rounded-lg overflow-x-auto mono-font text-sm my-4"><code>$1</code></pre>');

  // Inline code
  content = content.replace(/`([^`]+)`/g, '<code class="bg-[#F1F5F9] dark:bg-[#1E293B] px-1.5 py-0.5 rounded text-sm mono-font">$1</code>');

  // Unordered lists
  content = content.replace(/^[\-\*] (.*)$/gim, '<li class="ml-4 list-disc">$1</li>');
  content = content.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="my-4 space-y-1">$&</ul>');

  // Ordered lists
  content = content.replace(/^\d+\. (.*)$/gim, '<li class="ml-4 list-decimal">$1</li>');

  // Horizontal rule
  content = content.replace(/^---$/gim, '<hr class="my-6 border-t border-gray-300" />');

  // Paragraphs (for lines that don't start with HTML tags)
  content = content.replace(/^(?!<[h1-6]|<blockquote|<pre|<div|<p|<img|<ul|<li|<hr)(.+)$/gim, '<p class="mb-4">$1</p>');

  return content;
}

// Combined Markdown + LaTeX renderer for live preview
export async function renderMarkdown(content: string): Promise<string> {
  try {
    // First render LaTeX equations
    let processed = await renderLaTeX(content);
    // Then render code blocks with Prism.js (before markdownToHtml to avoid conflicts)
    processed = await renderCodeBlocks(processed);
    // Then convert remaining markdown to HTML
    processed = markdownToHtml(processed);
    // Embed YouTube videos from links and bare URLs
    const { embedYouTube } = await import('../lib/youtubeEmbed');
    processed = embedYouTube(processed);
    return processed;
  } catch (e) {
    console.error('[renderMarkdown] Error, falling back to basic markdown:', e);
    // Fallback: at least render basic markdown without code blocks/LaTeX
    return markdownToHtml(content);
  }
}