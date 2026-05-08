export type DetectedLanguage = 'en' | 'id' | 'mixed' | 'unknown';

export type AutoFixLanguageOption = 'auto' | 'en' | 'id';

export interface TextFixChange {
  from: string;
  to: string;
  index: number;
}

export interface TextFixResult {
  text: string;
  language: DetectedLanguage;
  changes: TextFixChange[];
}

const englishTypoMap: Record<string, string> = {
  teh: 'the',
  recieve: 'receive',
  seperate: 'separate',
  occuring: 'occurring',
  occured: 'occurred',
  definately: 'definitely',
  adress: 'address',
  goverment: 'government',
  enviroment: 'environment',
  acheive: 'achieve',
  langauge: 'language',
  wich: 'which',
  thier: 'their',
  untill: 'until',
  recomend: 'recommend',
  sucess: 'success',
  usefull: 'useful',
  begining: 'beginning',
  writting: 'writing',
  becuase: 'because',
  spaling: 'spelling',
  speling: 'spelling',
};

const indonesianTypoMap: Record<string, string> = {
  karna: 'karena',
  yg: 'yang',
  dgn: 'dengan',
  dr: 'dari',
  utk: 'untuk',
  tdk: 'tidak',
  gk: 'tidak',
  ga: 'tidak',
  ngga: 'tidak',
  resiko: 'risiko',
  aktifitas: 'aktivitas',
  analisa: 'analisis',
  praktek: 'praktik',
  ijin: 'izin',
  sistim: 'sistem',
  fikir: 'pikir',
  efektifitas: 'efektivitas',
  kwalitas: 'kualitas',
  obyek: 'objek',
  subyek: 'subjek',
  karir: 'karier',
  seolaah: 'seolah',
  ikuut: 'ikut',
  merasakaan: 'merasakan',
  kegelisahaftnya: 'kegelisahannya',
  kegelisahaftnnya: 'kegelisahannya',
  kegelisahannyaa: 'kegelisahannya',
  takuted: 'takut',
  seolahh: 'seolah',
  nyatanya: 'nyatanya',
};

const englishMarkers = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'you', 'your', 'are', 'is', 'was',
  'have', 'has', 'will', 'should', 'can', 'not', 'about', 'project', 'writing', 'book',
]);

const indonesianMarkers = new Set([
  'yang', 'dan', 'untuk', 'dengan', 'ini', 'itu', 'dari', 'kamu', 'anda', 'adalah', 'tidak',
  'saya', 'kami', 'kita', 'akan', 'pada', 'tentang', 'proyek', 'tulisan', 'buku',
]);

const protectedChunkPattern =
  /(```[\s\S]*?```|`[^`\n]*`|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g;

const wordPattern = /[\p{L}]+(?:'[\p{L}]+)?/gu;
const repeatedLetterPattern = /(.)\1{2,}/g;

const commonIndonesianFixes: Record<string, string> = {
  seolahh: 'seolah',
  seolaah: 'seolah',
  ikuut: 'ikut',
  merasakaan: 'merasakan',
  kegelisahaftnnya: 'kegelisahannya',
  kegelisahannyaa: 'kegelisahannya',
  takuted: 'takut',
  semmakin: 'semakin',
  kelihattan: 'kelihatan',
};

const commonEnglishFixes: Record<string, string> = {
  betterr: 'better',
  happenned: 'happened',
  comming: 'coming',
  succesful: 'successful',
};

function tokenizeLower(input: string): string[] {
  const matches = input.match(/[A-Za-z]+/g);
  return matches ? matches.map((item) => item.toLowerCase()) : [];
}

function scoreLanguage(words: string[], markers: Set<string>): number {
  let score = 0;
  for (const word of words) {
    if (markers.has(word)) score += 1;
  }
  return score;
}

function scoreTypoHits(words: string[], typoMap: Record<string, string>): number {
  let score = 0;
  for (const word of words) {
    if (typoMap[word]) score += 1.5;
  }
  return score;
}

export function detectTextLanguage(input: string): DetectedLanguage {
  const words = tokenizeLower(input);
  if (words.length === 0) return 'unknown';

  const enScore = scoreLanguage(words, englishMarkers) + scoreTypoHits(words, englishTypoMap);
  const idScore = scoreLanguage(words, indonesianMarkers) + scoreTypoHits(words, indonesianTypoMap);

  if (enScore === 0 && idScore === 0) return 'unknown';
  if (enScore > idScore * 1.25) return 'en';
  if (idScore > enScore * 1.25) return 'id';
  return 'mixed';
}

function normalizeCommaSpacing(input: string): string {
  // Ensure exactly one space after comma when followed by a non-space.
  return input.replace(/,\s*(\S)/g, ', $1');
}

type CapitalizationState = {
  isStart: boolean;
  capitalizeNext: boolean;
};

function normalizeSentenceCapitalization(input: string, state: CapitalizationState): { text: string; state: CapitalizationState } {
  let output = '';
  let capitalizeNext = state.capitalizeNext;
  let isStart = state.isStart;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if ((isStart || capitalizeNext) && /[A-Za-z\p{L}]/u.test(ch)) {
      output += ch.toUpperCase();
      isStart = false;
      capitalizeNext = false;
      continue;
    }

    output += ch;
    if (ch === '.' || ch === '!' || ch === '?') {
      capitalizeNext = true;
    }
    if (isStart && !/\s/.test(ch)) {
      isStart = false;
    }
  }

  return { text: output, state: { isStart, capitalizeNext } };
}

function applyCaseStyle(source: string, replacement: string): string {
  if (source.toUpperCase() === source) return replacement.toUpperCase();
  const sourceFirst = source.charAt(0);
  const sourceRest = source.slice(1);
  const isTitle = sourceFirst.toUpperCase() === sourceFirst && sourceRest.toLowerCase() === sourceRest;
  if (isTitle) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

function buildFixMap(language: DetectedLanguage): Record<string, string> {
  if (language === 'en') return { ...englishTypoMap, ...commonEnglishFixes };
  if (language === 'id') return { ...indonesianTypoMap, ...commonIndonesianFixes };
  return { ...englishTypoMap, ...indonesianTypoMap, ...commonEnglishFixes, ...commonIndonesianFixes };
}

function buildKnownWords(language: DetectedLanguage): Set<string> {
  const words = new Set<string>();
  const addAll = (items: Iterable<string>) => {
    for (const item of items) words.add(item.toLowerCase());
  };

  if (language === 'en') {
    addAll(englishMarkers);
    addAll(Object.values(englishTypoMap));
    addAll(Object.values(commonEnglishFixes));
    return words;
  }

  if (language === 'id') {
    addAll(indonesianMarkers);
    addAll(Object.values(indonesianTypoMap));
    addAll(Object.values(commonIndonesianFixes));
    return words;
  }

  addAll(englishMarkers);
  addAll(indonesianMarkers);
  addAll(Object.values(englishTypoMap));
  addAll(Object.values(indonesianTypoMap));
  addAll(Object.values(commonEnglishFixes));
  addAll(Object.values(commonIndonesianFixes));
  return words;
}

function isOneEditAway(source: string, candidate: string): boolean {
  if (source === candidate) return false;
  const a = source;
  const b = candidate;
  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff > 1) return false;

  // Same length: substitution or transposition.
  if (a.length === b.length) {
    let mismatches = 0;
    const mismatchIndexes: number[] = [];
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        mismatches += 1;
        mismatchIndexes.push(i);
        if (mismatches > 2) return false;
      }
    }
    if (mismatches === 1) return true;
    if (mismatches === 2) {
      const [i, j] = mismatchIndexes;
      return i + 1 === j && a[i] === b[j] && a[j] === b[i];
    }
    return false;
  }

  // Insert/delete.
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let i = 0;
  let j = 0;
  let usedEdit = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i += 1;
      j += 1;
      continue;
    }
    if (usedEdit) return false;
    usedEdit = true;
    j += 1;
  }
  return true;
}

function chooseFuzzyCorrection(wordLower: string, knownWords: Set<string>): string | undefined {
  if (wordLower.length < 4) return undefined;

  const candidates: string[] = [];
  for (const known of knownWords) {
    if (Math.abs(known.length - wordLower.length) > 1) continue;
    if (isOneEditAway(wordLower, known)) candidates.push(known);
    if (candidates.length > 4) break;
  }

  // Only apply when unambiguous.
  if (candidates.length === 1) return candidates[0];
  return undefined;
}

function normalizeRepeatedLetters(word: string): string {
  if (!repeatedLetterPattern.test(word)) return word;
  repeatedLetterPattern.lastIndex = 0;
  return word.replace(repeatedLetterPattern, '$1');
}

function chooseFallbackCorrection(word: string, language: DetectedLanguage): string | undefined {
  const lower = word.toLowerCase();

  if (language === 'id') {
    const direct = commonIndonesianFixes[lower];
    if (direct) return direct;
  }

  if (language === 'en') {
    const direct = commonEnglishFixes[lower];
    if (direct) return direct;
  }

  const normalized = normalizeRepeatedLetters(lower);
  if (normalized !== lower) {
    const normalizedDirect = commonIndonesianFixes[normalized] || commonEnglishFixes[normalized] || indonesianTypoMap[normalized] || englishTypoMap[normalized];
    if (normalizedDirect) return normalizedDirect;
    return normalized;
  }

  if (/^kegelisah[a-z]*n{1,2}ya?$/.test(lower) || /^kegelisah[a-z]*t{1,2}nya?$/.test(lower)) {
    return 'kegelisahannya';
  }

  if (lower.startsWith('merasak')) {
    return 'merasakan';
  }

  if (/^seo+l+a+h?$/.test(lower)) {
    return 'seolah';
  }

  if (/^i+k+u+t+$/.test(lower)) {
    return 'ikut';
  }

  return undefined;
}

function fixChunk(
  chunk: string,
  offset: number,
  fixMap: Record<string, string>,
  language: DetectedLanguage,
  knownWords: Set<string>,
  changes: TextFixChange[],
): string {
  return chunk.replace(wordPattern, (word, localIndex: number) => {
    const normalized = word.toLowerCase();
    const fixed =
      fixMap[normalized] ||
      chooseFallbackCorrection(word, language) ||
      (language === 'id' ? chooseFuzzyCorrection(normalized, knownWords) : undefined);
    if (!fixed || fixed === normalized) return word;

    const output = applyCaseStyle(word, fixed);
    if (output !== word) {
      changes.push({ from: word, to: output, index: offset + localIndex });
    }
    return output;
  });
}

export function getAutoFixSuggestionsForWord(word: string, language: DetectedLanguage | AutoFixLanguageOption): string[] {
  const targetLanguage: DetectedLanguage = language === 'auto' ? 'mixed' : language;
  const fixMap = buildFixMap(targetLanguage);
  const knownWords = buildKnownWords(targetLanguage);
  const normalized = word.toLowerCase();

  const suggestions = new Set<string>();
  const direct = fixMap[normalized];
  if (direct) suggestions.add(applyCaseStyle(word, direct));

  const fallback = chooseFallbackCorrection(word, targetLanguage);
  if (fallback && fallback !== normalized) suggestions.add(applyCaseStyle(word, fallback));

  if (targetLanguage === 'id') {
    const fuzzy = chooseFuzzyCorrection(normalized, knownWords);
    if (fuzzy && fuzzy !== normalized) suggestions.add(applyCaseStyle(word, fuzzy));
  }

  return Array.from(suggestions).slice(0, 6);
}

export function autoFixText(input: string, options?: { language?: AutoFixLanguageOption }): TextFixResult {
  const language = options?.language && options.language !== 'auto'
    ? options.language
    : detectTextLanguage(input);
  const fixMap = buildFixMap(language);
  const knownWords = buildKnownWords(language);
  const changes: TextFixChange[] = [];

  if (!input.trim()) {
    return { text: input, language, changes };
  }

  let result = '';
  let cursor = 0;
  let capState: CapitalizationState = { isStart: true, capitalizeNext: false };
  protectedChunkPattern.lastIndex = 0;
  let protectedMatch: RegExpExecArray | null = protectedChunkPattern.exec(input);

  while (protectedMatch) {
    const protectedIndex = protectedMatch.index;
    const protectedText = protectedMatch[0];

    const before = input.slice(cursor, protectedIndex);
    const fixedBefore = fixChunk(before, cursor, fixMap, language, knownWords, changes);
    const spacedBefore = normalizeCommaSpacing(fixedBefore);
    const capitalizedBefore = normalizeSentenceCapitalization(spacedBefore, capState);
    capState = capitalizedBefore.state;
    result += capitalizedBefore.text;
    result += protectedText;

    cursor = protectedIndex + protectedText.length;
    protectedMatch = protectedChunkPattern.exec(input);
  }

  const tail = input.slice(cursor);
  const fixedTail = fixChunk(tail, cursor, fixMap, language, knownWords, changes);
  const spacedTail = normalizeCommaSpacing(fixedTail);
  const capitalizedTail = normalizeSentenceCapitalization(spacedTail, capState);
  capState = capitalizedTail.state;
  result += capitalizedTail.text;

  return {
    text: result,
    language,
    changes,
  };
}
