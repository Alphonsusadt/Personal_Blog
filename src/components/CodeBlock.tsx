import { useState, useCallback, useMemo, useRef } from 'react';
import { Copy, Check, Code } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-matlab';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-yaml';

/* ---------- props ---------- */

export interface CodeSnippetData {
  id?: number;
  language: string;
  code: string;
  description?: string;
}

export interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
  description?: string;
}

export interface CodeSnippetGroupProps {
  snippets: CodeSnippetData[];
}

/* ---------- helpers ---------- */

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash',
  yml: 'yaml', html: 'markup', xml: 'markup', svg: 'markup', matlab: 'matlab',
  cs: 'csharp', golang: 'go',
};

function getPrismLanguage(lang: string): string {
  return LANG_MAP[lang.toLowerCase()] || lang.toLowerCase();
}

function getLanguageLabel(lang: string): string {
  const labels: Record<string, string> = {
    javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
    java: 'Java', cpp: 'C++', c: 'C', csharp: 'C#', go: 'Go', rust: 'Rust',
    php: 'PHP', ruby: 'Ruby', sql: 'SQL', html: 'HTML', css: 'CSS',
    json: 'JSON', yaml: 'YAML', bash: 'Bash', matlab: 'MATLAB',
    markup: 'HTML', plaintext: 'Text',
  };
  return labels[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

function getBadgeColor(lang: string): string {
  const colors: Record<string, string> = {
    javascript: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    typescript: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    python: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    java: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    cpp: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    c: 'bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300',
    csharp: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
    go: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
    rust: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    php: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-300',
    ruby: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    sql: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
    html: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    css: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
    json: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
    yaml: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
    bash: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300',
    matlab: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
    markup: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    plaintext: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
  };
  return colors[lang.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300';
}

/**
 * Split highlighted HTML into individual lines.
 * We add a sentinel \x00 to each newline, highlight, then split.
 */
function splitHighlightedLines(highlightedHtml: string): string[] {
  // Replace newlines with a sentinel so we can split after highlighting
  const lines = highlightedHtml.split('\n');
  return lines;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cleanCodeForCopy(code: string): string {
  const lines = code.split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return code;

  let minIndent = Infinity;
  for (const line of nonEmpty) {
    const leading = line.match(/^(\s*)/)?.[1].length ?? 0;
    if (leading < minIndent) minIndent = leading;
  }

  const dedented = lines.map((l) => l.slice(minIndent).replace(/\s+$/, ''));
  while (dedented.length && dedented[0] === '') dedented.shift();
  while (dedented.length && dedented[dedented.length - 1] === '') dedented.pop();
  return dedented.join('\n');
}

/* ---------- single CodeBlock ---------- */

export function CodeBlock({ code, language, title, description }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const prismLang = getPrismLanguage(language);
  const grammar = Prism.languages[prismLang];
  const label = getLanguageLabel(prismLang);
  const badgeColor = getBadgeColor(prismLang);

  // Highlight with Prism.highlight() (string-based, not DOM-based)
  const highlightedLines = useMemo(() => {
    const trimmedCode = code.trimEnd();
    if (!trimmedCode) return [];

    let highlighted: string;
    try {
      highlighted = grammar
        ? Prism.highlight(trimmedCode, grammar, prismLang)
        : escapeHtml(trimmedCode);
    } catch {
      highlighted = escapeHtml(trimmedCode);
    }

    return splitHighlightedLines(highlighted);
  }, [code, grammar, prismLang]);

  const lineCount = highlightedLines.length;
  const gutterWidth = String(lineCount).length;

  const handleCopy = useCallback(async () => {
    const clean = cleanCodeForCopy(code);
    try {
      await navigator.clipboard.writeText(clean);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = clean;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [code]);

  if (!code || code.trim().length === 0) {
    return (
      <div className="my-6 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 text-center">
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">No code to display</p>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg overflow-hidden border border-[#E5E7EB] dark:border-[#334155] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#F8FAFC] dark:bg-[#1E293B] px-4 py-2.5 border-b border-[#E5E7EB] dark:border-[#334155]">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium ${badgeColor}`}>
            <Code className="w-3.5 h-3.5" />
            {label}
          </span>
          {title && (
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">{title}</span>
          )}
        </div>

        <button
          onClick={handleCopy}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium',
            'transition-all duration-150 min-h-[32px] min-w-[44px]',
            'focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#60A5FA] focus:ring-offset-1',
            copied
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              : 'bg-transparent text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#334155] hover:text-[#1A1A1A] dark:hover:text-[#F8FAFC]',
          ].join(' ')}
          aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
          type="button"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5" /><span>Copied!</span></>
          ) : (
            <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
          )}
        </button>
      </div>

      {description && (
        <div className="px-4 py-2 bg-[#F8FAFC]/80 dark:bg-[#1E293B]/80 border-b border-[#E5E7EB] dark:border-[#334155]">
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">{description}</p>
        </div>
      )}

      {/* Code area - table layout for perfect line alignment */}
      <div className="bg-[#1e1e1e] overflow-x-auto max-h-[600px]">
        <table className="border-collapse w-full" style={{ fontSize: '13px', lineHeight: '1.6', fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
          <tbody>
            {highlightedLines.map((lineHtml, i) => (
              <tr key={i}>
                {/* Line number */}
                <td
                  className="select-none text-right pr-4 pl-4 pt-0 pb-0 border-r border-[#3d3d3d] text-[#555] align-top whitespace-nowrap"
                  style={{ width: `${gutterWidth + 3}ch` }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(gutterWidth)}
                </td>
                {/* Code line */}
                <td className="pl-4 pr-4 pt-0 pb-0 align-top whitespace-pre" style={{ color: '#ccc' }}>
                  <code
                    className={`language-${prismLang}`}
                    dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- multiple snippets wrapper ---------- */

export function CodeSnippetGroup({ snippets }: CodeSnippetGroupProps) {
  return (
    <div className="space-y-6">
      {snippets.map((snippet, idx) => (
        <CodeBlock
          key={snippet.id ?? idx}
          code={snippet.code}
          language={snippet.language}
          description={snippet.description}
        />
      ))}
    </div>
  );
}
