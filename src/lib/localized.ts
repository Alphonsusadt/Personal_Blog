export type SiteLanguage = 'en' | 'id';

export type LocalizedText = {
  en?: string;
  id?: string;
};

export type LocalizedTextValue = string | LocalizedText | null | undefined;

export function normalizeLocalizedText(value: LocalizedTextValue, fallback = ''): Required<LocalizedText> {
  let parsedValue = value;
  if (typeof value === 'string' && value.trim().startsWith('{') && value.trim().endsWith('}')) {
    try { parsedValue = JSON.parse(value); } catch (e) {}
  }

  if (typeof parsedValue === 'string') {
    return { en: parsedValue, id: parsedValue };
  }

  if (parsedValue && typeof parsedValue === 'object') {
    const localized = parsedValue as LocalizedText;
    const english = typeof localized.en === 'string' ? localized.en : fallback;
    const indonesian = typeof localized.id === 'string' ? localized.id : english || fallback;

    return {
      en: english,
      id: indonesian,
    };
  }

  return { en: fallback, id: fallback };
}

export function resolveLocalizedText(value: LocalizedTextValue, language: SiteLanguage, fallback = ''): string {
  const localized = normalizeLocalizedText(value, fallback);
  const primary = localized[language]?.trim();
  if (primary) return primary;

  const secondary = localized[language === 'en' ? 'id' : 'en']?.trim();
  if (secondary) return secondary;

  return fallback;
}

export function getExactLocalizedText(value: LocalizedTextValue, language: SiteLanguage): string {
  let parsedValue = value;
  if (typeof value === 'string' && value.trim().startsWith('{') && value.trim().endsWith('}')) {
    try { parsedValue = JSON.parse(value); } catch (e) {}
  }

  if (typeof parsedValue === 'string') {
    // Treat plain strings (legacy data) as English content
    return language === 'en' ? parsedValue : '';
  }
  if (parsedValue && typeof parsedValue === 'object') {
    return ((parsedValue as any)[language] || '').trim();
  }
  return '';
}

export function setLocalizedText(
  value: LocalizedTextValue,
  language: SiteLanguage,
  nextValue: string,
): Required<LocalizedText> {
  const localized = normalizeLocalizedText(value, '');
  return {
    ...localized,
    [language]: nextValue,
  };
}

export function getTranslationStatus(value: LocalizedTextValue, translationOfId?: string): 'bilingual' | 'single-id' | 'single-en' {
  if (translationOfId && translationOfId.trim().length > 0) {
    return 'bilingual';
  }

  if (!value) return 'single-id';

  let parsedValue = value;
  if (typeof value === 'string' && value.trim().startsWith('{') && value.trim().endsWith('}')) {
    try { parsedValue = JSON.parse(value); } catch (e) {}
  }

  if (typeof parsedValue === 'string') {
    return 'single-en';
  }

  if (typeof parsedValue === 'object' && parsedValue !== null) {
    const hasEn = !!(parsedValue as any).en?.trim();
    const hasId = !!(parsedValue as any).id?.trim();

    if (hasEn && hasId) return 'bilingual';
    if (hasEn) return 'single-en';
    if (hasId) return 'single-id';
  }

  return 'single-id';
}