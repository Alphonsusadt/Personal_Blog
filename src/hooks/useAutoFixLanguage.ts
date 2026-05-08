export type AutoFixLanguage = 'id' | 'en';

const STORAGE_KEY = 'auto_fix_language';
const EVENT_NAME = 'auto-fix-language-changed';

function isAutoFixLanguage(value: unknown): value is AutoFixLanguage {
  return value === 'id' || value === 'en';
}

export function readAutoFixLanguage(): AutoFixLanguage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isAutoFixLanguage(raw)) return raw;
  } catch {
    // ignore
  }
  return 'id';
}

export function writeAutoFixLanguage(next: AutoFixLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }

  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  } catch {
    // ignore
  }
}

import { useEffect, useState } from 'react';

export function useAutoFixLanguage(): {
  language: AutoFixLanguage;
  setLanguage: (next: AutoFixLanguage) => void;
} {
  const [language, setLanguageState] = useState<AutoFixLanguage>(() => readAutoFixLanguage());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readAutoFixLanguage();
      setLanguageState(next);
    };

    const handleCustom = () => {
      const next = readAutoFixLanguage();
      setLanguageState(next);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_NAME, handleCustom as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_NAME, handleCustom as EventListener);
    };
  }, []);

  const setLanguage = (next: AutoFixLanguage) => {
    setLanguageState(next);
    writeAutoFixLanguage(next);
  };

  return { language, setLanguage };
}
