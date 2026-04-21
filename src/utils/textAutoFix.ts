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

export function autoFixText(input: string): TextFixResult {
  const language = detectTextLanguage(input);
  const fixMap = buildFixMap(language);
  const changes: TextFixChange[] = [];

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
    result += fixChunk(before, cursor, fixMap, language, changes);
    result += protectedText;

    cursor = protectedIndex + protectedText.length;
    protectedMatch = protectedChunkPattern.exec(input);
  }

  const tail = input.slice(cursor);
  result += fixChunk(tail, cursor, fixMap, language, changes);

  return {
    text: result,
    language,
    changes,
  };
}
