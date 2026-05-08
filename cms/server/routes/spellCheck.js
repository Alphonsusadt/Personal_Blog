import express from 'express';
import { isValidIndonesianWord, findCorrections } from '../utils/hunspellDictionary.js';

const router = express.Router();

const commonTypoMap = {
  // Common abbreviations
  karna: 'karena',
  yg: 'yang',
  dgn: 'dengan',
  dr: 'dari',
  utk: 'untuk',
  tdk: 'tidak',
  ga: 'tidak',
  gk: 'tidak',
  
  // Common misspellings
  praktek: 'praktik',
  ijin: 'izin',
  resiko: 'risiko',
  aktifitas: 'aktivitas',
  analisa: 'analisis',
  kwalitas: 'kualitas',
  
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

// Common correct words that should not be fuzzily corrected
// Prevents false matches from being applied to correctly spelled words
const commonCorrectWords = new Set([
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

/**
 * POST /api/spell-check
 * Check if Indonesian words are spelled correctly
 * Body: { words: string[] }
 * Response: { results: { word: string, isValid: boolean, suggestions: string[] }[] }
 */
router.post('/spell-check', async (req, res) => {
  try {
    const { words } = req.body;
    
    if (!Array.isArray(words)) {
      return res.status(400).json({ error: 'words must be an array' });
    }

    const results = await Promise.all(
      words.map(async (word) => {
        const isValid = await isValidIndonesianWord(word);
        const suggestions = isValid ? [] : await findCorrections(word);
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
 * Auto-fix Indonesian text using hunspell dictionary and fuzzy matching
 * Body: { text: string }
 * Response: { original: string, fixed: string, changes: { from: string, to: string, pos: number }[] }
 */
router.post('/auto-fix-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text must be a string' });
    }

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
      
      // Skip very short words (less than 2 chars), but allow specific 2-letter corrections
      if (word.length < 2) continue;
      if (word.length < 3 && !['id', 'ad', 'se', 'ak', 'rn'].includes(lower)) continue;

      // Skip words that are in the common correct words list
      if (commonCorrectWords.has(lower)) continue;

      let correction = commonTypoMap[lower];
      if (!correction) {
        const isValid = await isValidIndonesianWord(word);
        if (!isValid) {
          const suggestions = await findCorrections(word);
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
