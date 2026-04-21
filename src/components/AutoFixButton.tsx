import { useEffect, useMemo, useState } from 'react';
import { autoFixText, detectTextLanguage } from '../utils/textAutoFix';

interface AutoFixButtonProps {
  text: string;
  onApply: (nextText: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function AutoFixButton({
  text,
  onApply,
  disabled = false,
  className,
  label = 'Auto Fix',
}: AutoFixButtonProps) {
  const resultPreview = useMemo(() => autoFixText(text), [text]);
  const detectedLanguage = useMemo(() => detectTextLanguage(text), [text]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(''), 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleAutoFix = () => {
    if (resultPreview.text !== text) {
      onApply(resultPreview.text);
      setStatus(`Applied ${resultPreview.changes.length} fix${resultPreview.changes.length === 1 ? '' : 'es'}`);
      return;
    }

    setStatus(
      resultPreview.language === 'unknown'
        ? 'No language signal yet'
        : `No common typos found (${resultPreview.language.toUpperCase()})`,
    );
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleAutoFix}
        disabled={disabled || !text.trim()}
        title={`Detect language + fix common typos (${detectedLanguage})`}
        className={
          className ||
          'px-3 py-2 rounded-lg text-sm font-medium border border-[#334155] bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        }
      >
        {label}
      </button>
      <span
        className={`text-[11px] leading-tight px-1 ${
          resultPreview.changes.length > 0 ? 'text-emerald-400' : 'text-slate-400'
        }`}
      >
        {status || `Detected ${detectedLanguage.toUpperCase()} · ${resultPreview.changes.length} fix${resultPreview.changes.length === 1 ? '' : 'es'}`}
      </span>
    </div>
  );
}
