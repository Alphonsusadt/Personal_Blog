import { embedYouTube } from './youtubeEmbed';
import { embedInstagram, embedX } from './socialEmbed';

/**
 * Checks if a URL is a social media link that we can embed.
 */
export function detectSocialEmbed(url: string): { type: 'youtube' | 'twitter' | 'instagram'; url: string } | null {
  const trimmed = url.trim();
  
  // YouTube
  if (
    trimmed.match(/^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^"'\s<>]*?v=[a-zA-Z0-9_-]{11}|embed\/[a-zA-Z0-9_-]{11}|shorts\/[a-zA-Z0-9_-]{11})|youtu\.be\/[a-zA-Z0-9_-]{11})/i)
  ) {
    return { type: 'youtube', url: trimmed };
  }
  
  // Instagram
  if (
    trimmed.match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/i)
  ) {
    return { type: 'instagram', url: trimmed };
  }
  
  // X / Twitter
  if (
    trimmed.match(/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/i)
  ) {
    return { type: 'twitter', url: trimmed };
  }
  
  return null;
}

/**
 * Converts Markdown content from the database into clean HTML for the Tiptap editor.
 */
export function markdownToEditorHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // 1. Separate code blocks to prevent formatting regexes from corrupting code contents
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `<!--CODEBLOCK_${codeBlocks.length}-->`;
    const cleanLang = lang ? ` class="language-${lang.toLowerCase()}"` : '';
    codeBlocks.push(`<pre><code${cleanLang}>${escapeHtml(code.trimEnd())}</code></pre>`);
    return placeholder;
  });

  // 2. Separate block LaTeX ($$...$$) to preserve equations
  const latexBlocks: string[] = [];
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => {
    const placeholder = `<!--LATEX_${latexBlocks.length}-->`;
    latexBlocks.push(`$$${eq.trim()}$$`);
    return placeholder;
  });

  // 3. Convert custom social-embed div placeholders if they already exist in markdown
  // (e.g. from previously saved visual posts)
  // Example: <div class="social-embed" data-type="youtube" data-url="URL" ...></div>
  // We keep them as-is, Tiptap's parser will read them.

  // 4. Convert bare URLs of YouTube, Instagram, X/Twitter that are alone on a line to social-embed divs
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('<div class="social-embed"')) {
      return line; // Preserve existing
    }
    
    // Check if line is a bare social media URL
    const social = detectSocialEmbed(trimmed);
    if (social) {
      let float = '';
      let margin = '1.5rem auto';
      let display = 'block';
      const style = `width: 100%; float: ${float}; margin: ${margin}; display: ${display}; max-width: 100%;`;
      return `<div class="social-embed" data-type="${social.type}" data-url="${social.url}" data-width="100%" data-alignment="center" style="${style}"></div>`;
    }
    return line;
  });
  html = processedLines.join('\n');

  // 5. Convert standard markdown formatting
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, (_, alt, url) => {
    return `<img src="${url}" alt="${alt}" style="width: 100%; display: block; margin: 1.5rem auto;" />`;
  });

  // Bold & Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code (not inside block LaTeX placeholders)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');

  // Lists (simple handling)
  html = html.replace(/^[\-\*] (.*)$/gim, '<li class="list-item">$1</li>');
  html = html.replace(/(<li class="list-item">.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/<li class="list-item">/g, '<li>');

  html = html.replace(/^\d+\. (.*)$/gim, '<li class="ol-item">$1</li>');
  html = html.replace(/(<li class="ol-item">.*<\/li>\n?)+/g, '<ol>$&</ol>');
  html = html.replace(/<li class="ol-item">/g, '<li>');

  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr />');

  // Paragraphs: Wrap lines that don't start with block HTML elements or placeholders
  html = html.replace(/^(?!<h[1-6]|<blockquote|<pre|<div|<p|<img|<ul|<ol|<li|<hr|<!--)(.+)$/gim, '<p>$1</p>');

  // 6. Restore block LaTeX equations
  latexBlocks.forEach((eq, index) => {
    html = html.replace(`<!--LATEX_${index}-->`, `<p>${eq}</p>`);
  });

  // 7. Restore code blocks
  codeBlocks.forEach((code, index) => {
    html = html.replace(`<!--CODEBLOCK_${index}-->`, code);
  });

  return html;
}

/**
 * Parses Tiptap editor's HTML back to clean Markdown for database storage.
 */
export function editorHtmlToMarkdown(html: string): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let markdown = '';

  doc.body.childNodes.forEach(node => {
    markdown += domNodeToMarkdown(node);
  });

  // Post-process: clean up three or more newlines to exactly two newlines
  return markdown.replace(/\n{3,}/g, '\n\n').trim();
}

function domNodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  let childrenMarkdown = '';
  element.childNodes.forEach(child => {
    childrenMarkdown += domNodeToMarkdown(child);
  });

  switch (tagName) {
    case 'h1':
      return `# ${childrenMarkdown}\n\n`;
    case 'h2':
      return `## ${childrenMarkdown}\n\n`;
    case 'h3':
      return `### ${childrenMarkdown}\n\n`;
    case 'h4':
      return `#### ${childrenMarkdown}\n\n`;
    case 'h5':
      return `##### ${childrenMarkdown}\n\n`;
    case 'h6':
      return `###### ${childrenMarkdown}\n\n`;
    case 'p': {
      // Check if this paragraph contains only inline equations, or plain text
      return `${childrenMarkdown}\n\n`;
    }
    case 'strong':
    case 'b':
      return `**${childrenMarkdown}**`;
    case 'em':
    case 'i':
      return `*${childrenMarkdown}*`;
    case 'a':
      return `[${childrenMarkdown}](${element.getAttribute('href') || ''})`;
    case 'img': {
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || '';
      const style = element.getAttribute('style') || '';
      
      // If the image has custom sizing or alignment styling, we save it as a raw HTML tag
      // to keep it layout-controllable!
      const float = element.style.float || '';
      const width = element.style.width || element.getAttribute('width') || '';
      
      if (float || (width && width !== '100%')) {
        let styles = '';
        if (width) styles += `width: ${width}; `;
        if (float) styles += `float: ${float}; `;
        if (float === 'left') styles += 'margin-right: 1.5rem; margin-bottom: 1.5rem;';
        else if (float === 'right') styles += 'margin-left: 1.5rem; margin-bottom: 1.5rem;';
        else if (float === 'center') styles += 'display: block; margin: 1.5rem auto;';
        
        return `<img src="${src}" alt="${alt}" style="${styles.trim()}" />\n\n`;
      }
      
      return `![${alt}](${src})\n\n`;
    }
    case 'blockquote':
      return `> ${childrenMarkdown.trim().replace(/\n/g, '\n> ')}\n\n`;
    case 'code':
      // If code is inside pre, its content is already written by PRE case
      if (element.parentElement?.tagName.toLowerCase() === 'pre') {
        return childrenMarkdown;
      }
      return `\`${childrenMarkdown}\``;
    case 'pre': {
      const codeElement = element.querySelector('code');
      let lang = '';
      if (codeElement) {
        const classList = Array.from(codeElement.classList);
        const langClass = classList.find(c => c.startsWith('language-'));
        if (langClass) {
          lang = langClass.replace('language-', '');
        }
      }
      const codeText = codeElement ? codeElement.textContent || '' : element.textContent || '';
      return `\`\`\`${lang}\n${codeText.trim()}\n\`\`\`\n\n`;
    }
    case 'ul':
      return `${childrenMarkdown}\n`;
    case 'ol':
      return `${childrenMarkdown}\n`;
    case 'li': {
      const parentTag = element.parentElement?.tagName.toLowerCase();
      if (parentTag === 'ol') {
        const siblings = Array.from(element.parentElement?.children || []);
        const index = siblings.indexOf(element) + 1;
        return `${index}. ${childrenMarkdown}\n`;
      }
      return `- ${childrenMarkdown}\n`;
    }
    case 'div': {
      // Check if this is our custom social embed placeholder
      if (element.classList.contains('social-embed') || element.getAttribute('data-type')) {
        const type = element.getAttribute('data-type') || '';
        const url = element.getAttribute('data-url') || '';
        const width = element.getAttribute('data-width') || '100%';
        const alignment = element.getAttribute('data-alignment') || 'center';
        const style = element.getAttribute('style') || '';
        return `<div class="social-embed" data-type="${type}" data-url="${url}" data-width="${width}" data-alignment="${alignment}" style="${style}"></div>\n\n`;
      }
      return `${childrenMarkdown}\n\n`;
    }
    case 'hr':
      return '---\n\n';
    case 'br':
      return '\n';
    default:
      return childrenMarkdown;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
