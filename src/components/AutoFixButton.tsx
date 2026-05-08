import { useEffect, useMemo, useRef, useState } from 'react';
import { detectTextLanguage, type AutoFixLanguageOption, type TextFixResult } from '../utils/textAutoFix';
import { API_BASE } from '../lib/api';

interface AutoFixButtonProps {
  text: string;
  onApply: (nextText: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  language?: AutoFixLanguageOption;
}

const EMPTY_RESULT: TextFixResult = { text: '', language: 'unknown', changes: [] };

export function AutoFixButton({
  text,
  onApply,
  disabled = false,
  className,
  label = 'Auto Fix',
  language = 'auto',
}: AutoFixButtonProps) {
  const detectedLanguage = useMemo(() => detectTextLanguage(text), [text]);
  const [debouncedResult, setDebouncedResult] = useState<TextFixResult>(EMPTY_RESULT);
  const [apiFailed, setApiFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(text);
  textRef.current = text;

  const targetLanguage = language === 'auto' ? detectedLanguage : language;

  // Debounced computation of autoFixText to avoid blocking UI on every keystroke
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const controller = new AbortController();
    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`${API_BASE}/api/auto-fix-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textRef.current, language: targetLanguage }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Auto-fix request failed with ${response.status}`);
          }

          const data = await response.json();
          setApiFailed(false);
          setDebouncedResult({
            text: data.fixed ?? textRef.current,
            language: targetLanguage,
            changes: Array.isArray(data.changes) ? data.changes : [],
          });
        } catch {
          setApiFailed(true);
          // Keep previous result instead of resetting to EMPTY_RESULT with text:''
          // This prevents accidentally wiping content on click
        }
      })();
    }, 300);
    return () => {
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, detectedLanguage, targetLanguage]);

  const resultPreview = debouncedResult;
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(''), 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleAutoFix = () => {
    // GUARD: Never apply empty text - prevents content wipe on API failure
    if (!resultPreview.text || resultPreview.text === '') {
      setStatus('Auto-fix unavailable (API error)');
      return;
    }

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
        title={`Fix common typos (${language === 'auto' ? `auto:${detectedLanguage}` : language})`}
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
        {status || (apiFailed
          ? 'API unavailable'
          : `Lang ${language === 'auto' ? detectedLanguage.toUpperCase() : language.toUpperCase()} · ${resultPreview.changes.length} fix${resultPreview.changes.length === 1 ? '' : 'es'}`)}
      </span>
    </div>
  );
}
