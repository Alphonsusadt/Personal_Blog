export type DetectedLanguage = 'en' | 'id' | 'mixed' | 'unknown';

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

export interface AutoFixOptions {
  language?: 'en' | 'id';
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

const wordPattern = /[A-Za-z]+(?:'[A-Za-z]+)?/g;
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

function normalizeRepeatedLetters(word: string): string {
  if (!repeatedLetterPattern.test(word)) return word;
  repeatedLetterPattern.lastIndex = 0;
  return word.replace(repeatedLetterPattern, '$1');
}

const fuzzySkipTokens = new Set([
  'api',
  'url',
  'http',
  'https',
  'www',
  'json',
  'html',
  'css',
  'js',
  'ts',
  'tsx',
  'md',
  'cms',
  'vite',
  'react',
  'node',
]);

const extraIndonesianCommonWords = [
  'hari',
  'aku',
  'pergi',
  'sekolah',
  'hati',
  'sangat',
  'gembira',
  'karena',
  'ingin',
  'bertemu',
  'teman',
  'lama',
  'kelas',
  'baru',
  'belajar',
  'matematika',
  'bahasa',
  'indonesia',
  'bersama',
  'guru',
  'baik',
  'saat',
  'waktu',
  'istirahat',
  'tadi',
  'makan',
  'bekal',
  'nasi',
  'goreng',
  'buatan',
  'rasanya',
  'paling',
  'enak',
  'setelah',
  'bermain',
  'bola',
  'lapangan',
  'rumput',
  'hijau',
  'luas',
  'meskipun',
  'cukup',
  'melelahkan',
  'tetapi',
  'perasaan',
  'bahagia',
  'sekali',
  'sore',
  'langit',
  'mulai',
  'terlihat',
  'gelap',
  'pertanda',
  'hujan',
  'segera',
  'turun',
  'membasahi',
  'bumi',
  'bergegas',
  'pulang',
  'naik',
  'sepeda',
  'agar',
  'tidak',
  'basah',
  'kuyup',
  'tengah',
  'jalan',
  'menuju',
  'rumah',
  'nyaman',
];

function buildWordsByLength(words: Iterable<string>): Record<number, string[]> {
  const byLen: Record<number, string[]> = {};
  for (const word of words) {
    const lower = word.toLowerCase();
    if (!lower) continue;
    const len = lower.length;
    if (!byLen[len]) byLen[len] = [];
    byLen[len].push(lower);
  }
  return byLen;
}

const indonesianFuzzyDictionary = (() => {
  const words = new Set<string>();

  for (const marker of indonesianMarkers) words.add(marker);
  for (const word of extraIndonesianCommonWords) words.add(word);

  for (const to of Object.values(indonesianTypoMap)) {
    words.add(to);
  }

  for (const to of Object.values(commonIndonesianFixes)) {
    words.add(to);
  }

  return buildWordsByLength(words);
})();

function isAllCaps(word: string): boolean {
  return word.length > 1 && word.toUpperCase() === word;
}

function isOneSubstitutionAway(a: string, b: string): boolean {
  if (a.length !== b.length || a === b) return false;
  let mismatches = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      mismatches += 1;
      if (mismatches > 1) return false;
    }
  }
  return mismatches === 1;
}

function isOneAdjacentSwapAway(a: string, b: string): boolean {
  if (a.length !== b.length || a.length < 2 || a === b) return false;

  let i = 0;
  while (i < a.length && a[i] === b[i]) i += 1;
  if (i >= a.length - 1) return false;

  if (a[i] !== b[i + 1] || a[i + 1] !== b[i]) return false;
  for (let j = i + 2; j < a.length; j += 1) {
    if (a[j] !== b[j]) return false;
  }

  return true;
}

function isOneInsertDeleteAway(shorter: string, longer: string): boolean {
  if (longer.length !== shorter.length + 1) return false;
  let i = 0;
  let j = 0;
  let usedSkip = false;

  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i += 1;
      j += 1;
      continue;
    }

    if (usedSkip) return false;
    usedSkip = true;
    j += 1;
  }

  return true;
}

function isOneEditAway(a: string, b: string): boolean {
  const diff = Math.abs(a.length - b.length);
  if (diff > 1) return false;
  if (a.length === b.length) {
    return isOneSubstitutionAway(a, b) || isOneAdjacentSwapAway(a, b);
  }
  return a.length < b.length
    ? isOneInsertDeleteAway(a, b)
    : isOneInsertDeleteAway(b, a);
}

function chooseFuzzyCorrection(wordLower: string, wordOriginal: string, language: DetectedLanguage): string | undefined {
  if (language !== 'id') return undefined;
  if (wordLower.length < 4 || wordLower.length > 16) return undefined;
  if (isAllCaps(wordOriginal)) return undefined;
  if (wordLower.includes('\'')) return undefined;
  if (fuzzySkipTokens.has(wordLower)) return undefined;
  if (/\d/.test(wordLower)) return undefined;

  const len = wordLower.length;
  const candidatePools = [
    indonesianFuzzyDictionary[len - 1] || [],
    indonesianFuzzyDictionary[len] || [],
    indonesianFuzzyDictionary[len + 1] || [],
  ];

  let match: string | undefined;

  for (const pool of candidatePools) {
    for (const candidate of pool) {
      if (candidate === wordLower) continue;
      if (!isOneEditAway(wordLower, candidate)) continue;

      if (match && match !== candidate) return undefined;
      match = candidate;
    }
  }

  return match;
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

  const fuzzy = chooseFuzzyCorrection(lower, word, language);
  if (fuzzy) return fuzzy;

  return undefined;
}

function fixChunk(
  chunk: string,
  offset: number,
  fixMap: Record<string, string>,
  language: DetectedLanguage,
  changes: TextFixChange[],
): string {
  return chunk.replace(wordPattern, (word, localIndex: number) => {
    const normalized = word.toLowerCase();
    const fixed = fixMap[normalized] || chooseFallbackCorrection(word, language);
    if (!fixed || fixed === normalized) return word;

    const output = applyCaseStyle(word, fixed);
    if (output !== word) {
      changes.push({ from: word, to: output, index: offset + localIndex });
    }
    return output;
  });
}

function isAsciiLetter(value: string): boolean {
  if (value.length !== 1) return false;
  return (value >= 'A' && value <= 'Z') || (value >= 'a' && value <= 'z');
}

function toUpperAscii(value: string): string {
  return value.toUpperCase();
}

function normalizeCommaSpacing(chunk: string, offset: number, changes: TextFixChange[]): string {
  let out = '';
  let i = 0;

  while (i < chunk.length) {
    const ch = chunk[i];

    if (ch !== ',') {
      out += ch;
      i += 1;
      continue;
    }

    const originalOutLen = out.length;

    let hadSpaceBefore = false;

    // Remove spaces/tabs before comma (but don't cross newlines)
    while (out.length > 0) {
      const last = out[out.length - 1];
      if (last === ' ' || last === '\t') {
        hadSpaceBefore = true;
        out = out.slice(0, -1);
      } else {
        break;
      }
    }

    if (hadSpaceBefore && out.length !== originalOutLen) {
      changes.push({ from: ' ,', to: ',', index: offset + i });
    }

    const prevChar = out.length > 0 ? out[out.length - 1] : '';
    out += ',';

    // Consume spaces/tabs after comma
    let j = i + 1;
    const spaceStart = j;
    while (j < chunk.length && (chunk[j] === ' ' || chunk[j] === '\t')) {
      j += 1;
    }
    const spaceCountAfter = j - spaceStart;

    const nextChar = j < chunk.length ? chunk[j] : '';

    // Do not force a space before newlines/end
    if (nextChar === '' || nextChar === '\n' || nextChar === '\r') {
      if (spaceCountAfter > 0) {
        changes.push({ from: ', ', to: ',', index: offset + i });
      }
      i = j;
      continue;
    }

    // Thousands separator: digit,comma,digit => keep as-is (no space)
    const thousandsLike = /\d/.test(prevChar) && /\d/.test(nextChar);
    if (thousandsLike) {
      if (spaceCountAfter > 0) {
        // Normalize wrong "1, 000" -> "1,000" without adding spaces
        changes.push({ from: ', ', to: ',', index: offset + i });
      }
      i = j;
      continue;
    }

    const shouldHaveSpaceAfter = ![')', ']', '}', '.', ',', ';', ':', '?', '!'].includes(nextChar);
    if (!shouldHaveSpaceAfter) {
      if (spaceCountAfter > 0) {
        changes.push({ from: ', ', to: ',', index: offset + i });
      }
      i = j;
      continue;
    }

    // Ensure exactly one space after comma
    out += ' ';
    if (spaceCountAfter === 0) {
      changes.push({ from: ',', to: ', ', index: offset + i });
    }
    if (spaceCountAfter > 1) {
      changes.push({ from: ',  ', to: ', ', index: offset + i });
    }

    i = j;
  }

  return out;
}

function normalizeSentenceCapitalization(
  chunk: string,
  offset: number,
  changes: TextFixChange[],
  state: { capitalizeNext: boolean },
): string {
  let out = '';

  for (let i = 0; i < chunk.length; i += 1) {
    const ch = chunk[i];

    if (state.capitalizeNext && isAsciiLetter(ch) && ch === ch.toLowerCase()) {
      const upper = toUpperAscii(ch);
      if (upper !== ch) {
        changes.push({ from: ch, to: upper, index: offset + i });
      }
      out += upper;
      state.capitalizeNext = false;
      continue;
    }

    out += ch;

    if (ch === '.' || ch === '?' || ch === '!') {
      state.capitalizeNext = true;
      continue;
    }

    if (isAsciiLetter(ch)) {
      // If we hit a letter and didn't capitalize, stop looking for sentence start.
      state.capitalizeNext = false;
    }
  }

  return out;
}

function applyFormattingRules(
  chunk: string,
  offset: number,
  changes: TextFixChange[],
  state: { capitalizeNext: boolean },
): string {
  const commaFixed = normalizeCommaSpacing(chunk, offset, changes);
  const capped = normalizeSentenceCapitalization(commaFixed, offset, changes, state);
  return capped;
}

function fixUnprotectedChunk(
  chunk: string,
  offset: number,
  fixMap: Record<string, string>,
  language: DetectedLanguage,
  changes: TextFixChange[],
  state: { capitalizeNext: boolean },
): string {
  const typoFixed = fixChunk(chunk, offset, fixMap, language, changes);
  return applyFormattingRules(typoFixed, offset, changes, state);
}

export function autoFixText(input: string, options: AutoFixOptions = {}): TextFixResult {
  const language: DetectedLanguage = options.language ? options.language : detectTextLanguage(input);
  const fixMap = buildFixMap(language);
  const changes: TextFixChange[] = [];

  const firstNonWhitespace = input.match(/[^\s]/)?.[0] ?? '';
  const state = { capitalizeNext: isAsciiLetter(firstNonWhitespace) };

  if (!input.trim()) {
    return { text: input, language, changes };
  }

  let result = '';
  let cursor = 0;
  protectedChunkPattern.lastIndex = 0;
  let protectedMatch: RegExpExecArray | null = protectedChunkPattern.exec(input);

  while (protectedMatch) {
    const protectedIndex = protectedMatch.index;
    const protectedText = protectedMatch[0];

    const before = input.slice(cursor, protectedIndex);
    result += fixUnprotectedChunk(before, cursor, fixMap, language, changes, state);
    result += protectedText;

    cursor = protectedIndex + protectedText.length;
    protectedMatch = protectedChunkPattern.exec(input);
  }

  const tail = input.slice(cursor);
  result += fixUnprotectedChunk(tail, cursor, fixMap, language, changes, state);

  return {
    text: result,
    language,
    changes,
  };
}
