import React, { useState } from 'react';
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { List } from 'lucide-react';

const PRESETS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML / XML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'sql', label: 'SQL' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'matlab', label: 'MATLAB' },
];

const PRESET_VALUES = PRESETS.map((p) => p.value);

export function CodeBlockNodeView({ node, updateAttributes }: NodeViewProps) {
  const currentLang = node.attrs.language || '';
  
  // Enter custom input mode if the language is set to something not in our preset values
  const [isCustomMode, setIsCustomMode] = useState(
    currentLang !== '' && !PRESET_VALUES.includes(currentLang)
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomMode(true);
      updateAttributes({ language: 'custom' });
    } else {
      updateAttributes({ language: val });
    }
  };

  const switchToPresets = () => {
    setIsCustomMode(false);
    updateAttributes({ language: 'javascript' });
  };

  // Count lines based on text content to render line numbers in the gutter
  const linesCount = node.textContent.split('\n').length;

  return (
    <NodeViewWrapper className="code-block-node-wrapper my-6 relative group select-text">
      <div className="border border-[#334155] rounded-lg overflow-hidden bg-[#0F172A]">
        
        {/* Code Block Header Bar */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#0F172A] border-b border-[#334155] select-none">
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Code Editor
          </span>
          
          <div className="flex items-center gap-1.5">
            {isCustomMode ? (
              // Custom Text Input Mode
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={currentLang === 'custom' ? '' : currentLang}
                  onChange={(e) => updateAttributes({ language: e.target.value.toLowerCase().trim() })}
                  placeholder="Language (e.g. php, dart)..."
                  className="bg-[#1E293B] text-[11px] text-[#F8FAFC] border border-[#334155] rounded-md px-2.5 py-1 outline-none focus:border-[#60A5FA] w-36 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={switchToPresets}
                  className="p-1 text-[#94A3B8] hover:text-[#60A5FA] hover:bg-[#1E293B] rounded transition-colors"
                  title="Switch to Preset List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              // Preset Select Dropdown Mode
              <select
                value={currentLang}
                onChange={handleSelectChange}
                className="bg-[#1E293B] text-[11px] text-[#F8FAFC] border border-[#334155] rounded-md px-2.5 py-1 outline-none focus:border-[#60A5FA] cursor-pointer font-medium hover:bg-[#2A374E] transition-colors"
              >
                <option value="">Plain Text</option>
                {PRESETS.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
                <option value="__custom__">Custom / Other...</option>
              </select>
            )}
          </div>
        </div>

        {/* Code Box with Line Numbers Gutter */}
        <div className="flex font-mono text-xs leading-[1.6] py-4 bg-[#0F172A] text-[#E2E8F0] overflow-hidden">
          {/* Gutter numbers */}
          <div className="select-none text-right pr-4 text-[#475569] border-r border-[#334155] flex flex-col items-end min-w-[4.5ch] user-select-none">
            {Array.from({ length: Math.max(1, linesCount) }).map((_, i) => (
              <span key={i} style={{ height: '1.6em', lineHeight: '1.6em' }}>{i + 1}</span>
            ))}
          </div>
          
          {/* Main editable code element */}
          <pre 
            className="flex-1 overflow-x-auto"
            style={{
              backgroundColor: 'transparent',
              padding: '0 0 0 1rem',
              borderRadius: '0',
              border: 'none',
              margin: '0',
              outline: 'none',
            }}
          >
            <NodeViewContent 
              as={"code" as any} 
              className={currentLang ? `language-${currentLang}` : ''} 
              style={{ 
                display: 'block', 
                minHeight: '1.6em', 
                lineHeight: '1.6em',
                outline: 'none',
                whiteSpace: 'pre',
              }} 
            />
          </pre>
        </div>

      </div>
    </NodeViewWrapper>
  );
}
