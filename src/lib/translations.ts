import type { SiteLanguage } from './localized';

type TranslationKey = string;
type Translations = Record<TranslationKey, { en: string; id: string }>;

const translations: Translations = {
  // Navigation
  'nav.home': { en: 'Home', id: 'Beranda' },
  'nav.engineering': { en: 'Engineering', id: 'Teknik' },
  'nav.writings': { en: 'Writings', id: 'Tulisan' },
  'nav.library': { en: 'Library', id: 'Perpustakaan' },
  'nav.about': { en: 'About', id: 'Tentang' },

  // Footer
  'footer.quickLinks': { en: 'Quick Links', id: 'Tautan Cepat' },
  'footer.connect': { en: 'Connect', id: 'Terhubung' },
  'footer.copyright': { en: 'All rights reserved.', id: 'Hak cipta dilindungi.' },
  'footer.builtWith': { en: 'Built with', id: 'Dibuat dengan' },
  'footer.andCuriosity': { en: 'and biomedical curiosity', id: 'dan rasa ingin tahu biomedis' },

  // Home page
  'home.viewProjects': { en: 'View Projects', id: 'Lihat Proyek' },
  'home.readReflections': { en: 'Read Reflections', id: 'Baca Refleksi' },
  'home.viewAllProjects': { en: 'View All Projects', id: 'Lihat Semua Proyek' },
  'home.readAllWritings': { en: 'Read All Writings', id: 'Baca Semua Tulisan' },
  'home.browseLibrary': { en: 'Browse Library', id: 'Jelajahi Perpustakaan' },

  // Engineering page
  'engineering.title': { en: 'Engineering Projects', id: 'Proyek Teknik' },
  'engineering.subtitle': { en: 'Exploring biomedical engineering through signal processing, medical devices, and data analysis', id: 'Menjelajahi teknik biomedis melalui pemrosesan sinyal, perangkat medis, dan analisis data' },
  'engineering.searchPlaceholder': { en: 'Search projects by title, description, or tags...', id: 'Cari proyek berdasarkan judul, deskripsi, atau tag...' },
  'engineering.noResults': { en: 'No projects found', id: 'Tidak ada proyek ditemukan' },
  'engineering.noResultsHint': { en: 'Try adjusting your search terms or filters', id: 'Coba ubah kata kunci pencarian atau filter' },
  'engineering.showing': { en: 'Showing', id: 'Menampilkan' },
  'engineering.of': { en: 'of', id: 'dari' },
  'engineering.projects': { en: 'projects', id: 'proyek' },
  'engineering.loading': { en: 'Loading projects...', id: 'Memuat proyek...' },
  'engineering.backToProjects': { en: 'Back to Projects', id: 'Kembali ke Proyek' },
  'engineering.viewAllProjects': { en: 'View All Projects', id: 'Lihat Semua Proyek' },
  'engineering.projectLinks': { en: 'Project Links', id: 'Tautan Proyek' },
  'engineering.githubRepo': { en: 'GitHub Repository', id: 'Repositori GitHub' },
  'engineering.researchPaper': { en: 'Research Paper', id: 'Makalah Penelitian' },
  'engineering.liveDemo': { en: 'Live Demo', id: 'Demo Langsung' },
  'engineering.viewFullDetails': { en: 'Click "View Project" to see the full project details with LaTeX equations and diagrams', id: 'Klik "Lihat Proyek" untuk melihat detail lengkap proyek dengan persamaan LaTeX dan diagram' },
  'engineering.projectNotFound': { en: 'Project Not Found', id: 'Proyek Tidak Ditemukan' },
  'engineering.projectNotFoundHint': { en: "The project you're looking for doesn't exist or has been removed.", id: 'Proyek yang Anda cari tidak ada atau telah dihapus.' },
  'engineering.linksAvailable': { en: 'Links available', id: 'Tautan tersedia' },
  'engineering.viewProject': { en: 'View Project', id: 'Lihat Proyek' },

  // Categories - Projects
  'category.allProjects': { en: 'All Projects', id: 'Semua Proyek' },
  'category.signalProcessing': { en: 'Signal Processing', id: 'Pemrosesan Sinyal' },
  'category.control': { en: 'Control', id: 'Kontrol' },
  'category.dataAnalysis': { en: 'Data Analysis', id: 'Analisis Data' },

  // Categories - Writings
  'category.allWritings': { en: 'All Writings', id: 'Semua Tulisan' },
  'category.reflections': { en: 'Reflections', id: 'Refleksi' },
  'category.stories': { en: 'Stories', id: 'Cerita' },
  'category.fiction': { en: 'Fiction', id: 'Fiksi' },

  // Categories - Books
  'category.allBooks': { en: 'All Books', id: 'Semua Buku' },
  'category.technical': { en: 'Technical', id: 'Teknis' },
  'category.biography': { en: 'Biography', id: 'Biografi' },
  'category.spiritual': { en: 'Spiritual', id: 'Spiritual' },
  'category.philosophy': { en: 'Philosophy', id: 'Filosofi' },

  // Writings page
  'writings.title': { en: 'Writings', id: 'Tulisan' },
  'writings.subtitle': { en: 'Reflections on faith, engineering, and the human experience', id: 'Refleksi tentang iman, teknik, dan pengalaman manusia' },
  'writings.searchPlaceholder': { en: 'Search writings by title, excerpt, or tags...', id: 'Cari tulisan berdasarkan judul, kutipan, atau tag...' },
  'writings.noResults': { en: 'No writings found', id: 'Tidak ada tulisan ditemukan' },
  'writings.noResultsHint': { en: 'Try adjusting your search terms or category filter', id: 'Coba ubah kata kunci pencarian atau filter kategori' },
  'writings.showing': { en: 'Showing', id: 'Menampilkan' },
  'writings.writings': { en: 'writings', id: 'tulisan' },
  'writings.loading': { en: 'Loading writings...', id: 'Memuat tulisan...' },
  'writings.readMore': { en: 'Read More', id: 'Baca Selengkapnya' },
  'writings.read': { en: 'read', id: 'baca' },
  'writings.backToWritings': { en: 'Back to Writings', id: 'Kembali ke Tulisan' },
  'writings.viewAllWritings': { en: 'View All Writings', id: 'Lihat Semua Tulisan' },
  'writings.writingNotFound': { en: 'Writing Not Found', id: 'Tulisan Tidak Ditemukan' },
  'writings.writingNotFoundHint': { en: "The writing you're looking for doesn't exist or has been removed.", id: 'Tulisan yang Anda cari tidak ada atau telah dihapus.' },
  'writings.postedAt': { en: 'Posted:', id: 'Diposting:' },
  'writings.updatedAt': { en: 'Updated:', id: 'Diperbarui:' },

  // Library page
  'library.title': { en: 'Library', id: 'Perpustakaan' },
  'library.subtitle': { en: 'Books that shape my thinking on technology, faith, and philosophy', id: 'Buku yang membentuk pemikiran saya tentang teknologi, iman, dan filosofi' },
  'library.searchPlaceholder': { en: 'Search books by title, author, or review...', id: 'Cari buku berdasarkan judul, penulis, atau ulasan...' },
  'library.noResults': { en: 'No books found', id: 'Tidak ada buku ditemukan' },
  'library.noResultsHint': { en: 'Try adjusting your search terms or category filter', id: 'Coba ubah kata kunci pencarian atau filter kategori' },
  'library.showing': { en: 'Showing', id: 'Menampilkan' },
  'library.books': { en: 'books', id: 'buku' },
  'library.loading': { en: 'Loading books...', id: 'Memuat buku...' },
  'library.backToLibrary': { en: 'Back to Library', id: 'Kembali ke Perpustakaan' },
  'library.viewAllBooks': { en: 'View All Books', id: 'Lihat Semua Buku' },
  'library.myReview': { en: 'My Review', id: 'Ulasan Saya' },
  'library.keyTakeaways': { en: 'Key Takeaways', id: 'Poin Utama' },
  'library.readFullReview': { en: 'Read Full Review', id: 'Baca Ulasan Lengkap' },
  'library.moreInsights': { en: 'more insights', id: 'wawasan lainnya' },
  'library.keyTakeawaysLabel': { en: 'Key Takeaways:', id: 'Poin Utama:' },
  'library.bookNotFound': { en: 'Book Not Found', id: 'Buku Tidak Ditemukan' },
  'library.bookNotFoundHint': { en: "The book you're looking for doesn't exist or has been removed.", id: 'Buku yang Anda cari tidak ada atau telah dihapus.' },
  'library.postedAt': { en: 'Posted:', id: 'Diposting:' },
  'library.updatedAt': { en: 'Updated:', id: 'Diperbarui:' },

  // Book card
  'book.by': { en: 'by', id: 'oleh' },
  'book.more': { en: 'more', id: 'lagi' },

  // Generic
  'generic.close': { en: 'Close', id: 'Tutup' },
  'generic.loading': { en: 'Loading...', id: 'Memuat...' },
  'generic.more': { en: 'more', id: 'lagi' },
};

export function t(key: string, language: SiteLanguage): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[language] || entry.en || key;
}
