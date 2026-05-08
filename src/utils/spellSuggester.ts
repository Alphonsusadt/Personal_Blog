import type { AutoFixLanguage } from '../hooks/useAutoFixLanguage';
import words from 'an-array-of-english-words';
import { API_BASE } from '../lib/api';

let englishWordSet: Set<string> | null = null;
let indonesianWordSet: Set<string> | null = null;

function getEnglishWordSet(): Set<string> {
  if (englishWordSet) return englishWordSet;

  englishWordSet = new Set((words || []).map((w) => String(w).toLowerCase()));
  return englishWordSet;
}

// Built-in Indonesian word list (common words for spell checking)
const indonesianWords = [
  'ada', 'adalah', 'agama', 'air', 'akar', 'akhir', 'akibat', 'akses', 'aktif', 'aktivitas',
  'alam', 'alat', 'ambil', 'anak', 'analisis', 'anda', 'anggota', 'antar', 'apa', 'arah',
  'arti', 'asal', 'atas', 'atur', 'author', 'auto', 'awal', 'ayah', 'bahasa', 'bahaya',
  'baik', 'baikan', 'banyak', 'barang', 'baru', 'basis', 'batas', 'bawah', 'bebas', 'begitu',
  'beberapa', 'belakang', 'belanja', 'belum', 'benar', 'berat', 'berbeda', 'beri', 'berita',
  'besar', 'biasa', 'bilang', 'bila', 'bisa', 'boleh', 'buku', 'bulan', 'bumi', 'cara',
  'cepat', 'cinta', 'ciri', 'cocok', 'contoh', 'cuaca', 'dalam', 'dan', 'dari', 'depan',
  'derajat', 'dengan', 'depan', 'dia', 'dingin', 'diri', 'dobel', 'dokumen', 'dong', 'dua',
  'duduk', 'dulu', 'edit', 'efek', 'efektif', 'eksport', 'elemen', 'emosi', 'end', 'engkau',
  'enak', 'error', 'fungsi', 'gaji', 'gambar', 'garis', 'gaya', 'ganti', 'gelap', 'generasi',
  'gerak', 'guna', 'hadap', 'halaman', 'hamper', 'hangat', 'hari', 'harus', 'hanya', 'harga',
  'hendak', 'hidup', 'hijau', 'hingga', 'hitam', 'hubung', 'hud', 'hukum', 'harga', 'ia',
  'ikan', 'izin', 'ide', 'ikut', 'img', 'indah', 'indonesia', 'informasi', 'ini', 'input',
  'itu', 'izin', 'jabat', 'jadi', 'jalan', 'jaman', 'jumlah', 'jangan', 'jari', 'jawab',
  'jelas', 'jemput', 'jenis', 'juga', 'jumlah', 'jumat', 'kabar', 'kadar', 'kamera', 'kamus',
  'kapan', 'kapasitas', 'karena', 'karya', 'kasih', 'kata', 'kausal', 'ke', 'keadaan',
  'kecil', 'kedua', 'kegelisahan', 'kehendak', 'keinginan', 'kejaksaan', 'keluar', 'kelihatan',
  'kemana', 'kemarin', 'kembali', 'kemudian', 'kenal', 'kenapa', 'kepada', 'keputusan', 'keras',
  'kerja', 'keseluruhan', 'ketika', 'ketiga', 'kualitas', 'kunci', 'kurang', 'lain', 'lama',
  'langsung', 'lakukan', 'lama', 'lapangan', 'lawan', 'lebih', 'lelah', 'lewat', 'lihat',
  'lima', 'logika', 'luar', 'lucus', 'lupa', 'maaf', 'makan', 'malam', 'mana', 'masyarakat',
  'masalah', 'masa', 'mata', 'mati', 'mau', 'media', 'melalui', 'melihat', 'memang', 'memiliki',
  'mempelajari', 'memenuhi', 'menara', 'mencapai', 'mencoba', 'mendapat', 'menerima', 'mengapa',
  'mengatakan', 'menggunakan', 'mengikut', 'menolong', 'menulis', 'menyediakan', 'menyebabkan',
  'merah', 'merasa', 'merasakan', 'mereka', 'merupakan', 'meskipun', 'metode', 'milik',
  'minuman', 'modal', 'model', 'mohon', 'momen', 'mula', 'mulai', 'muncul', 'museum', 'musik',
  'mutlak', 'nama', 'nasib', 'nasional', 'negara', 'nilai', 'nanti', 'nyaman', 'nyata',
  'nyatanya', 'objek', 'oleh', 'olahraga', 'orang', 'otoritas', 'pilih', 'pandang', 'panggil',
  'pantai', 'papan', 'para', 'pasal', 'pasang', 'pasti', 'patut', 'peduli', 'pelanggan',
  'peluang', 'pemimpin', 'pendapatan', 'pendidikan', 'penjualan', 'penuh', 'perlu', 'permulaan',
  'pertama', 'perusahaan', 'pikir', 'pinggir', 'pixel', 'pohon', 'pokok', 'politik', 'posisi',
  'post', 'potensi', 'praktek', 'prediksi', 'produk', 'proses', 'provinsi', 'puas', 'publik',
  'puncak', 'putus', 'raja', 'ramai', 'rapat', 'rasa', 'rasional', 'realitas', 'redaksi',
  'rendah', 'rentan', 'respon', 'risiko', 'rizki', 'ruang', 'rudal', 'sabit', 'sadar',
  'sahabat', 'sakit', 'salah', 'sama', 'sampai', 'sangat', 'sapa', 'sarana', 'saran',
  'sebab', 'sebagai', 'sebagian', 'sebelum', 'sebentar', 'secara', 'sedang', 'sedikit',
  'segala', 'seharusnya', 'sehingga', 'sejak', 'sekali', 'sekarang', 'sekolah', 'selesai',
  'selalu', 'selamat', 'seluruh', 'semakin', 'sementara', 'seminyak', 'semua', 'sendiri',
  'seni', 'sentuh', 'seperti', 'seolah', 'sepuluh', 'sering', 'serta', 'sesuai', 'setelah',
  'setiap', 'seusia', 'sibuk', 'sidd', 'siap', 'sinyal', 'sistem', 'sitasi', 'soal',
  'sosial', 'status', 'subjek', 'suka', 'sulit', 'sumbang', 'sumber', 'sungguh', 'supaya',
  'surat', 'syarat', 'tahu', 'takut', 'tambah', 'tamu', 'tanah', 'tanpa', 'tanya', 'tapi',
  'target', 'tanda', 'tentang', 'tepat', 'tepi', 'terhadap', 'terakhir', 'terasa', 'terbang',
  'terima', 'terjadi', 'terlalu', 'termasuk', 'ternyata', 'tersedia', 'tertentu', 'terus',
  'tes', 'tetap', 'tetapi', 'tidak', 'tiga', 'tinggi', 'tipu', 'tolong', 'total', 'tujuan',
  'tulis', 'tunai', 'tunjuk', 'turun', 'ujung', 'ukuran', 'ulang', 'umat', 'umum', 'umur',
  'unit', 'untuk', 'update', 'upaya', 'usaha', 'urus', 'usul', 'utilitas', 'uang', 'vaksin',
  'valid', 'variabel', 'versi', 'visual', 'wajah', 'wajib', 'waktu', 'wanita', 'warna',
  'warga', 'wilayah', 'wujud', 'ya', 'yang', 'yakin', 'zona',
];

function getIndonesianWordSet(): Set<string> {
  if (indonesianWordSet) return indonesianWordSet;
  indonesianWordSet = new Set(indonesianWords);
  return indonesianWordSet;
}

function normalizeWord(input: string): string {
  return input.toLowerCase();
}

function edits1(word: string): Set<string> {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const results = new Set<string>();

  for (let i = 0; i <= word.length; i += 1) {
    const a = word.slice(0, i);
    const b = word.slice(i);

    if (b) {
      results.add(a + b.slice(1));
    }

    if (b.length > 1) {
      results.add(a + b[1] + b[0] + b.slice(2));
    }

    if (b) {
      for (let j = 0; j < letters.length; j += 1) {
        results.add(a + letters[j] + b.slice(1));
      }
    }

    for (let j = 0; j < letters.length; j += 1) {
      results.add(a + letters[j] + b);
    }
  }

  return results;
}

function rankSuggestions(original: string, candidates: string[]): string[] {
  const lower = original.toLowerCase();
  const first = lower.charAt(0);

  return candidates
    .slice()
    .sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aFirst = aLower.charAt(0) === first ? 0 : 1;
      const bFirst = bLower.charAt(0) === first ? 0 : 1;
      if (aFirst !== bFirst) return aFirst - bFirst;

      const aLenDiff = Math.abs(aLower.length - lower.length);
      const bLenDiff = Math.abs(bLower.length - lower.length);
      if (aLenDiff !== bLenDiff) return aLenDiff - bLenDiff;

      return aLower.localeCompare(bLower);
    });
}

export async function getSpellSuggestions(word: string, language: AutoFixLanguage): Promise<string[]> {
  const normalized = normalizeWord(word);
  if (normalized.length < 3) return [];

  if (language === 'en') {
    const dict = getEnglishWordSet();
    if (dict.has(normalized)) return [];

    const candidates = Array.from(edits1(normalized)).filter((c) => dict.has(c));
    const ranked = rankSuggestions(normalized, candidates);
    return ranked.slice(0, 6);
  }

  // Indonesian: use built-in word list for spell checking
  if (language === 'id') {
    try {
      const response = await fetch(`${API_BASE}/api/spell-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: [word] }),
      });

      if (response.ok) {
        const data = await response.json();
        const first = Array.isArray(data?.results) ? data.results[0] : null;
        if (first?.isValid) return [];
        if (Array.isArray(first?.suggestions)) return first.suggestions.slice(0, 6);
      }
    } catch {
      // fall back to local list below
    }

    const dict = getIndonesianWordSet();
    if (dict.has(normalized)) return [];

    const candidates = Array.from(edits1(normalized)).filter((c) => dict.has(c));
    const ranked = rankSuggestions(normalized, candidates);
    return ranked.slice(0, 6);
  }

  return [];
}
