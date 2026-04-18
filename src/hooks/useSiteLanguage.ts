import { useEffect, useState } from 'react';

export type SiteLanguage = 'en' | 'id';

const SITE_LANGUAGE_KEY = 'site_language';
const SITE_LANGUAGE_EVENT = 'site-language-changed';

function readSiteLanguage(): SiteLanguage {
  const saved = localStorage.getItem(SITE_LANGUAGE_KEY);
  return saved === 'id' ? 'id' : 'en';
}

export function useSiteLanguage() {
  const [language, setLanguageState] = useState<SiteLanguage>(() => readSiteLanguage());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SITE_LANGUAGE_KEY) {
        setLanguageState(readSiteLanguage());
      }
    };

    const handleCustomChange = () => {
      setLanguageState(readSiteLanguage());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(SITE_LANGUAGE_EVENT, handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(SITE_LANGUAGE_EVENT, handleCustomChange);
    };
  }, []);

  const setLanguage = (nextLanguage: SiteLanguage) => {
    localStorage.setItem(SITE_LANGUAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
    window.dispatchEvent(new Event(SITE_LANGUAGE_EVENT));
  };

  return { language, setLanguage };
}
