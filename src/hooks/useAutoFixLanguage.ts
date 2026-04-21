import { useEffect, useState } from 'react';

export type AutoFixLanguage = 'en' | 'id';

const AUTO_FIX_LANGUAGE_KEY = 'auto_fix_language';
const AUTO_FIX_LANGUAGE_EVENT = 'auto-fix-language-changed';

function readAutoFixLanguage(): AutoFixLanguage {
  const saved = localStorage.getItem(AUTO_FIX_LANGUAGE_KEY);
  return saved === 'id' ? 'id' : 'en';
}

export function useAutoFixLanguage() {
  const [language, setLanguageState] = useState<AutoFixLanguage>(() => readAutoFixLanguage());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTO_FIX_LANGUAGE_KEY) {
        setLanguageState(readAutoFixLanguage());
      }
    };

    const handleCustomChange = () => {
      setLanguageState(readAutoFixLanguage());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(AUTO_FIX_LANGUAGE_EVENT, handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(AUTO_FIX_LANGUAGE_EVENT, handleCustomChange);
    };
  }, []);

  const setLanguage = (nextLanguage: AutoFixLanguage) => {
    localStorage.setItem(AUTO_FIX_LANGUAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
    window.dispatchEvent(new Event(AUTO_FIX_LANGUAGE_EVENT));
  };

  return { language, setLanguage };
}
