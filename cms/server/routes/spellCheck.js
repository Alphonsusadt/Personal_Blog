import express from 'express';
import { isValidWord, findCorrections } from '../utils/hunspellDictionary.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Indonesia: koreksi cepat by-lookup untuk singkatan/typo yang sudah dikenal.
// Kata yang TIDAK ada di sini masih dicek lewat kamus Hunspell id_ID penuh
// (cms/hunspell-id) + fuzzy match, jadi daftar ini cukup berisi yang paling
// sering muncul di tulisan blog — bukan usaha mendaftar semua typo yang mungkin.
const commonTypoMapId = {
  // Common abbreviations
  karna: 'karena',
  krn: 'karena',
  yg: 'yang',
  dgn: 'dengan',
  dg: 'dengan',
  dr: 'dari',
  utk: 'untuk',
  tdk: 'tidak',
  ga: 'tidak',
  gk: 'tidak',
  jg: 'juga',
  jd: 'jadi',
  tp: 'tapi',
  klo: 'kalau',
  kalo: 'kalau',
  gmn: 'bagaimana',
  knp: 'kenapa',
  org: 'orang',
  sy: 'saya',
  mrk: 'mereka',
  stlh: 'setelah',
  sblm: 'sebelum',
  bgt: 'banget',
  udh: 'sudah',
  udah: 'sudah',
  blg: 'bilang',
  jgn: 'jangan',
  trs: 'terus',
  hbs: 'habis',
  msh: 'masih',
  skrg: 'sekarang',
  dpt: 'dapat',
  spt: 'seperti',
  hrs: 'harus',
  tsb: 'tersebut',
  bbrp: 'beberapa',
  sbg: 'sebagai',
  pdhl: 'padahal',
  dlm: 'dalam',
  spy: 'supaya',
  bhw: 'bahwa',

  // Common misspellings (informal spelling vs. baku/standard KBBI form)
  praktek: 'praktik',
  ijin: 'izin',
  resiko: 'risiko',
  aktifitas: 'aktivitas',
  analisa: 'analisis',
  kwalitas: 'kualitas',
  kwitansi: 'kuitansi',
  merubah: 'mengubah',
  dirubah: 'diubah',
  silahkan: 'silakan',
  hipotesa: 'hipotesis',
  nasehat: 'nasihat',
  hakekat: 'hakikat',
  apotik: 'apotek',
  atlit: 'atlet',
  azas: 'asas',
  disyahkan: 'disahkan',
  extrakurikuler: 'ekstrakurikuler',
  frekwensi: 'frekuensi',
  himbau: 'imbau',
  hutang: 'utang',
  jaman: 'zaman',
  kangker: 'kanker',
  komplit: 'komplet',
  kreatifitas: 'kreativitas',
  kuatir: 'khawatir',
  lansekap: 'lanskap',
  metoda: 'metode',
  nomer: 'nomor',
  obyektif: 'objektif',
  pasport: 'paspor',
  produktifitas: 'produktivitas',
  rejeki: 'rezeki',
  sekedar: 'sekadar',
  standarisasi: 'standardisasi',
  study: 'studi',
  syah: 'sah',
  telor: 'telur',
  trilyun: 'triliun',

  // Severely distorted typos (from real examples)
  kmerain: 'kemarin',
  mebmli: 'membeli',
  mkanaan: 'makanan',
  mleihat: 'melihat',
  prtunjukan: 'pertunjukan',
  rmaia: 'ramai',
  breabgai: 'berbagai',
  meantnang: 'menantang',
  menobca: 'mencoba',

  // Letter swap and transposition patterns
  bnoeka: 'boneka',
  pukau: 'pukul',
  mlemepar: 'melempar',

  // Repeated/doubled letter fixes
  seolahh: 'seolah',
  seolaah: 'seolah',
  semmakin: 'semakin',
  hanyaa: 'hanya',
  kelihattan: 'kelihatan',
  kegelisahaftnya: 'kegelisahannya',
  kegelisahaftnnya: 'kegelisahannya',
  kegelisahannyaa: 'kegelisahannya',
  mennujukan: 'menunjukkan',

  // Common compound/derived patterns
  kmabali: 'kembali',
  bearktiftas: 'beraktifitas',
  beiristiahat: 'beristirahat',

  // Words with letter insertion/deletion errors
  menadpatkan: 'mendapatkan',
  permainna: 'permainan',
  pramianan: 'permainan',
  aidkku: 'adikku',
  sletah: 'setelah',
  brekliling: 'berkeliling',
  sabil: 'sambil',
  mnikmait: 'menikmati',
  traesa: 'terasa',
  meumtuskan: 'memutuskan',

  // Very short common typos
  lam: 'dalam',
  sara: 'sari',
  rna: 'dan',
  kep: 'ke',
  pgi: 'pagi',
  id: 'di',

  // Additional distorted patterns
  malta: 'malah',
  brehmbus: 'berhembus',
  memabut: 'membuat',
  sepluuh: 'sepuluh',
  dudu: 'duduk',

  // Very short words and fragments
  ama: 'ada',
  ad: 'ada',
  se: 'saat', // or 'sang'
  sasana: 'suasana',
};

// English: same idea as the Indonesian map above, but for common English
// typos. Words not listed here still get checked against the full en_US
// Hunspell dictionary (cms/hunspell-en, ~49k words) + fuzzy match.
const commonTypoMapEn = {
  teh: 'the',
  recieve: 'receive',
  seperate: 'separate',
  occuring: 'occurring',
  occured: 'occurred',
  definately: 'definitely',
  definitly: 'definitely',
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
  alot: 'a lot',
  accomodate: 'accommodate',
  arguement: 'argument',
  calender: 'calendar',
  cemetary: 'cemetery',
  collegue: 'colleague',
  concious: 'conscious',
  dependant: 'dependent',
  embarass: 'embarrass',
  existance: 'existence',
  experiance: 'experience',
  finaly: 'finally',
  foriegn: 'foreign',
  fourty: 'forty',
  freind: 'friend',
  futher: 'further',
  grammer: 'grammar',
  happend: 'happened',
  harrass: 'harass',
  independant: 'independent',
  intelligance: 'intelligence',
  knowlege: 'knowledge',
  liason: 'liaison',
  maintainance: 'maintenance',
  millenium: 'millennium',
  neccessary: 'necessary',
  noticable: 'noticeable',
  occassion: 'occasion',
  persistant: 'persistent',
  posession: 'possession',
  prefered: 'preferred',
  pronounciation: 'pronunciation',
  publically: 'publicly',
  refered: 'referred',
  relevent: 'relevant',
  religous: 'religious',
  reccommend: 'recommend',
  rythm: 'rhythm',
  supercede: 'supersede',
  tommorow: 'tomorrow',
  truely: 'truly',
  wether: 'whether',
  wierd: 'weird',
  withdrawl: 'withdrawal',
  writen: 'written',
  youre: "you're",
};

// Kata benar yang tidak boleh "diperbaiki" secara fuzzy (mencegah false-positive).
const commonCorrectWordsId = new Set([
  'bersama', 'keluarga', 'untuk', 'yang', 'dan', 'di', 'ke', 'dari',
  'dengan', 'adalah', 'ini', 'itu', 'akan', 'telah', 'dapat', 'sudah',
  'tidak', 'juga', 'atau', 'pada', 'oleh', 'sebagai', 'dalam', 'tanpa',
  'buku', 'pergi', 'asik', 'pagi', 'malam', 'hari', 'waktu', 'rumah',
  'orang', 'anak', 'adik', 'kakak', 'ayah', 'ibu', 'nenek', 'kakek',
  'teman', 'sahabat', 'guru', 'murid', 'siswa', 'pelajar', 'mahasiswa',
  'kota', 'desa', 'negara', 'dunia', 'langit', 'bumi', 'laut', 'gunung',
  'pohon', 'bunga', 'buah', 'makanan', 'minuman', 'mainan', 'permainan',
  'sekolah', 'kantor', 'toko', 'pasar', 'jalan', 'halaman', 'taman',
  'mobil', 'motor', 'sepeda', 'kereta', 'pesawat', 'kapal', 'perahu',
  'merah', 'biru', 'hijau', 'putih', 'hitam', 'kuning', 'ungu', 'orange',
  'besar', 'kecil', 'panjang', 'pendek', 'tinggi', 'rendah', 'lebar', 'sempit',
  'panas', 'dingin', 'hangat', 'sejuk', 'manis', 'asin', 'pahit', 'pedas',
  'senang', 'sedih', 'marah', 'takut', 'heran', 'bingung', 'lelah',
  'pinggir', 'manis', 'nyaman', 'sejuk', 'pukul', 'malam', 'bergambar',
  'asia', 'dengan', 'nyenyak', 'kamu', 'wahana', 'macam', 'seru', 'hadiah',
]);

const LANGUAGE_CONFIG = {
  id: { typoMap: commonTypoMapId, correctWords: commonCorrectWordsId },
  en: { typoMap: commonTypoMapEn, correctWords: new Set() },
};

// 'mixed'/'unknown' (teks yang tidak jelas satu bahasa, atau caller lama yang
// belum mengirim `language` sama sekali): gabungkan kedua peta typo, sama
// seperti perlakuan client-side di src/utils/textAutoFix.ts.
function resolveLanguageConfig(language) {
  if (language === 'en') return { lang: 'en', ...LANGUAGE_CONFIG.en };
  if (language === 'id') return { lang: 'id', ...LANGUAGE_CONFIG.id };
  return {
    lang: 'mixed',
    typoMap: { ...commonTypoMapEn, ...commonTypoMapId },
    correctWords: commonCorrectWordsId,
  };
}

// Kata 2 huruf hanya dicek kalau memang terdaftar sebagai singkatan/typo yang
// dikenal di peta di atas — dihitung otomatis dari isi peta itu sendiri supaya
// menambah entri baru tidak perlu mengingat mengubah daftar terpisah lagi.
function shortAllowList(typoMap) {
  return new Set(Object.keys(typoMap).filter((k) => k.length < 3));
}

async function isValidInLanguage(word, langConfig) {
  if (langConfig.lang === 'mixed') {
    const [validId, validEn] = await Promise.all([
      isValidWord(word, 'id'),
      isValidWord(word, 'en'),
    ]);
    return validId || validEn;
  }
  return isValidWord(word, langConfig.lang);
}

async function findCorrectionsInLanguage(word, langConfig) {
  if (langConfig.lang === 'mixed') {
    const idSuggestions = await findCorrections(word, 'id');
    if (idSuggestions.length > 0) return idSuggestions;
    return findCorrections(word, 'en');
  }
  return findCorrections(word, langConfig.lang);
}

/**
 * POST /api/spell-check
 * Check if words are spelled correctly.
 * Body: { words: string[], language?: 'id' | 'en' }  (default: 'id')
 * Response: { results: { word: string, isValid: boolean, suggestions: string[] }[] }
 */
router.post('/spell-check', authMiddleware, async (req, res) => {
  try {
    const { words, language } = req.body;

    if (!Array.isArray(words)) {
      return res.status(400).json({ error: 'words must be an array' });
    }

    const langConfig = resolveLanguageConfig(language);

    const results = await Promise.all(
      words.map(async (word) => {
        const isValid = await isValidInLanguage(word, langConfig);
        const suggestions = isValid ? [] : await findCorrectionsInLanguage(word, langConfig);
        return { word, isValid, suggestions };
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Spell check error:', error);
    res.status(500).json({ error: 'Spell check failed' });
  }
});

/**
 * POST /api/auto-fix-text
 * Auto-fix text using a Hunspell dictionary (id_ID or en_US) and fuzzy matching.
 * Body: { text: string, language?: 'id' | 'en' }  (default: 'id')
 * Response: { original: string, fixed: string, changes: { from: string, to: string, pos: number }[] }
 */
router.post('/auto-fix-text', authMiddleware, async (req, res) => {
  try {
    const { text, language } = req.body;

    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text must be a string' });
    }

    const langConfig = resolveLanguageConfig(language);
    const shortAllowed = shortAllowList(langConfig.typoMap);

    const changes = [];
    let fixed = text;

    // Extract words and check validity
    const wordRegex = /\b[\p{L}]+(?:'[\p{L}]+)?\b/gu;
    let match;
    const wordMatches = [];

    while ((match = wordRegex.exec(text)) !== null) {
      wordMatches.push({ word: match[0], index: match.index });
    }

    // Process each word and collect replacements first
    const replacements = [];
    for (const { word, index } of wordMatches) {
      const lower = word.toLowerCase();

      // Skip very short words (less than 2 chars), but allow known 2-letter
      // corrections (derived from the typo map itself, see shortAllowList).
      if (word.length < 2) continue;
      if (word.length < 3 && !shortAllowed.has(lower)) continue;

      // Skip words that are in the known-correct list for this language
      if (langConfig.correctWords.has(lower)) continue;

      let correction = langConfig.typoMap[lower];
      if (!correction) {
        const isValid = await isValidInLanguage(word, langConfig);
        if (!isValid) {
          const suggestions = await findCorrectionsInLanguage(word, langConfig);
          if (suggestions.length > 0) {
            correction = suggestions[0];
          }
        }
      }

      if (correction && correction !== lower) {
        replacements.push({ from: word, to: correction, pos: index });
      }
    }

    // Apply from right-to-left so offsets remain stable
    replacements.sort((a, b) => b.pos - a.pos);
    for (const replacement of replacements) {
      fixed =
        fixed.slice(0, replacement.pos) +
        replacement.to +
        fixed.slice(replacement.pos + replacement.from.length);
      changes.push(replacement);
    }

    // Return changes in reading order
    changes.sort((a, b) => a.pos - b.pos);

    res.json({ original: text, fixed, changes });
  } catch (error) {
    console.error('Auto-fix error:', error);
    res.status(500).json({ error: 'Auto-fix failed' });
  }
});

export default router;
