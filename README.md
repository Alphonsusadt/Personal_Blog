# Personal Blog & Portfolio CMS

Selamat datang di repository personal blog/portfolio dengan sistem CMS (Content Management System) berbasis React + Node.js + MongoDB.

---

## 🚀 Cara Mengakses CMS

### Prasyarat

Pastikan sudah terinstall:
- [Node.js](https://nodejs.org/) v18 atau lebih baru
- [MongoDB](https://www.mongodb.com/try/download/community) (lokal) atau koneksi MongoDB Atlas

---

### Langkah 1 — Konfigurasi Environment

Salin file contoh environment ke file `.env` yang sebenarnya:

```bash
cp cms/.env.example cms/.env
```

Lalu buka `cms/.env` dan sesuaikan nilainya:

```env
# Ganti dengan string acak yang panjang (minimal 32 karakter)
JWT_SECRET=isi_dengan_secret_panjang_dan_acak_minimal_32_karakter

# Kredensial login CMS admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ganti_dengan_password_aman

# URI koneksi MongoDB
MONGODB_URI=mongodb://localhost:27017

# Port server CMS (default: 5000)
CMS_PORT=5000
```

> ⚠️ **Penting:** File `cms/.env` tidak boleh di-commit ke git (sudah ada di `.gitignore`).

---

### Langkah 2 — Install Dependencies

**Backend (CMS Server):**
```bash
cd cms
npm install
cd ..
```

**Frontend:**
```bash
npm install
```

---

### Langkah 3 — Jalankan Server

Buka **dua terminal** secara bersamaan:

**Terminal 1 — Backend CMS:**
```bash
cd cms
npm start
```
Server API berjalan di: `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
npm run dev
```
Website berjalan di: `http://localhost:5173`

Atau gunakan satu perintah dari root project:
```bash
# Backend (terminal 1)
npm run dev:cms

# Frontend (terminal 2)
npm run dev
```

---

### Langkah 4 — Akses CMS

Buka browser dan navigasi ke:

```
http://localhost:5173/admin/login
```

Login menggunakan kredensial yang sudah dikonfigurasi di `cms/.env`:
- **Username:** nilai `ADMIN_USERNAME` (contoh: `admin`)
- **Password:** nilai `ADMIN_PASSWORD` yang telah dikonfigurasi

---

## 📋 Fitur Lengkap CMS & Portal Publik

Sistem ini didesain sebagai portofolio premium dengan Content Management System (CMS) mandiri yang memiliki fitur-fitur canggih:

### 🌐 1. Penerjemahan Dwibahasa (Bilingual Translation Engine)
* **Mesin Multi-Mode**: Mendukung 3 mode penerjemahan canggih:
  * **Google Translate API**: Cepat, akurat, dan stabil untuk teks dasar.
  * **Smart AI (DeepSeek)**: Penerjemahan kontekstual cerdas menggunakan model LLM pihak ketiga melalui OpenRouter.
  * **Hybrid Mode**: Menggabungkan kecepatan Google Translate dengan polesan tata bahasa natural (polishing) oleh LLM AI.
* **Auto-Detection Arah Bahasa**: Server secara otomatis mendeteksi arah penerjemahan (Indonesia ⇄ Inggris) berdasarkan field konten yang sudah terisi.
* **Short-Text LLM Bypass**: Menghindari halusinasi AI pada teks pendek seperti judul/tag dengan menerjemahkannya secara presisi lewat Google Translate, sementara teks panjang seperti konten draf tetap dipoles secara mendalam oleh AI.
* **Sinkronisasi Pra-Translate**: Secara otomatis memicu penyimpanan draf (autosave) sebelum proses translate berjalan, sehingga mencegah hilangnya teks terbaru yang belum sempat terkirim ke server.

### 💾 2. Autosave & Pencegahan Konten Ganda (Anti-Duplication)
* **Debounced Autosave**: Menyimpan perubahan konten secara cerdas setiap kali pengguna berhenti mengetik tanpa membebani server (memakai debounce 800ms di level input editor).
* **Idempotensi Rute Baru**: Saat membuat dokumen baru, editor secara transparan dialihkan ke rute edit spesifik `/edit/:id` setelah penyimpanan pertama sukses dilakukan.
* **Server-Side Idempotence**: Backend secara aktif memfilter permintaan penyimpanan baru dengan mengecek keberadaan slug ID draf yang sama untuk mencegah terjadinya dokumen ganda.
* **Pemetaan Filter Upsert MongoDB**: Modifikasi penanganan database agar `upsert` MongoDB secara akurat mencari kecocokan data menggunakan `_id` bertipe `ObjectId`, menjamin penyimpanan data yang aman dan cepat.
* **Penyelamat Unmount (Unmount Safety)**: Menyediakan bendera pengaman (`skipUnloadSaveRef`) untuk mencegah kondisi balapan (*race condition*) React saat unmount/berpindah halaman tepat setelah melakukan klik Simpan secara manual, sehingga draft usang tidak tersimpan kembali ke browser lokal.
* **Deteksi Konflik Tab Ganda (Multi-Tab Collision Warning)**: Menggunakan sesi ID unik dan *event listener* `storage` bawaan HTML5 untuk memantau tab editor secara *real-time*. Jika artikel yang sama dibuka di tab lain, sistem secara lokal menampilkan banner peringatan berkedip untuk mencegah tab saling menimpa draf.


### 🏷️ 3. Pengelolaan Kategori Dinamis (Dynamic Category Manager)
* **Custom Category Creator**: Admin bebas membuat, menyortir, mengaktifkan/menonaktifkan kategori baru untuk Proyek, Artikel, maupun Buku.
* **Penyematan Ikon Kustom**: Mendukung 3 format ikon kategori yang akan langsung dirender secara indah pada kartu publik:
  * **Lucide Icon**: Cukup ketik nama ikon Lucide (misal: `Terminal`, `Cpu`, `BookOpen`).
  * **Emoji**: Mendukung karakter emoji langsung (misal: 💻, 📚, 🔬).
  * **Image URL**: Mendukung URL eksternal atau gambar yang diunggah ke CMS.
* **Sinkronisasi Cache Instan**: Memperbarui cache memori runtime editor secara langsung dan menghapus cache list publik saat kategori diubah atau postingan dihapus, sehingga data baru langsung tampil di halaman depan tanpa lag.

### 📂 4. Manajemen Konten Lengkap
* **Dashboard**: Berisi ringkasan statistik jumlah postingan secara keseluruhan.
* **Engineering Projects**: Portofolio proyek lengkap dengan gambar, deskripsi, tag teknologi, kategori, dan link.
* **Writings**: Blog personal pendukung markdown dengan perkiraan waktu baca (*read time*).
* **Books Review**: Review ulasan buku dilengkapi bintang rating dinamis (1-5), detail penulis, sampul buku, dan poin intisari penting (*key takeaways*).
* **Custom Editors**: Editor visual khusus untuk menyunting konten halaman **Home** (banner hero, perkenalan singkat) dan halaman **About** secara interaktif.

### 🗑️ 5. Trash Bin & Pembersihan Otomatis
* **Soft Delete**: Item yang dihapus tidak langsung hilang secara permanen melainkan dikirim ke halaman **Trash Manager**.
* **Auto-Cleanup**: CMS menjalankan fungsi pembersihan otomatis di latar belakang untuk menghapus item di dalam Trash yang sudah berumur lebih dari 30 hari.

### 🛠️ 6. Infrastruktur Pengujian Otomatis (E2E Diagnostic Suite)
* **Automated Diagnostics**: Menyediakan skrip tes `cms/e2e_diagnostic.js` untuk memvalidasi koneksi MongoDB, login token admin, penulisan data, dan pengetesan endpoint API.
* **Browser Automation (Puppeteer)**: Menyediakan skrip `cms/test_browser.js` yang menyimulasikan 3 skenario tes secara otomatis pada browser nyata:
  1. Pembuatan draf konten baru dan keluar langsung tanpa tombol simpan.
  2. Penerjemahan konten dari Indonesia ke Inggris.
  3. Penerjemahan konten dari Inggris ke Indonesia.

### ✉️ 7. Integrasi Layanan Email (Resend.com)
* **Hubungi Saya (Contact Submission)**: Portal publik menyediakan formulir kontak bagi pengunjung untuk mengirimkan nama, email, subjek, dan pesan.
* **Filter Status Pesan**: 
  * Jika pengunjung menyertakan alamat email, status pesan diatur sebagai `pending_reply` (menunggu tanggapan).
  * Jika tidak menyertakan email, pesan diatur sebagai `read_only` (hanya baca).
* **Fitur Balas Email Langsung**: Melalui CMS, admin dapat langsung menulis dan mengirimkan tanggapan email kepada pengunjung menggunakan layanan **Resend**.
* **Template Email Profesional**: Tanggapan email dikirimkan menggunakan template HTML yang elegan dengan visualisasi pesan asli dan tanggapan admin yang rapi.
* **Konfigurasi API**: Menggunakan variabel lingkungan `RESEND_API_KEY` di dalam `cms/.env` untuk keamanan autentikasi pengiriman email.

### ☁️ 8. Integrasi Layanan Cloud (Supabase & Cloudinary)
* **Supabase (Dual-Write Database)**: Melakukan sinkronisasi data draf, tulisan, ulasan buku, proyek engineering, dan pesan secara real-time dari MongoDB lokal ke tabel database PostgreSQL Supabase di cloud sebagai cadangan data.
* **Cloudinary (Manajemen Aset Media)**: Unggah file media gambar, sampul ulasan buku, dan ikon kustom secara instan dan aman ke Cloudinary CDN, lengkap dengan pengoptimalan ukuran berkas secara dinamis.
* **Konfigurasi API Keamanan**: Menggunakan variabel lingkungan (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) di dalam berkas `.env` lokal untuk keamanan autentikasi.

### 📝 9. Visual Rich Text Editor Premium (WYSIWYG Tiptap)
* **Visual WYSIWYG Editor**: Menggantikan textarea markdown tradisional dengan editor visual premium bergaya Microsoft Word menggunakan **Tiptap**.
* **Penyematan Media Langsung (Interactive Media Embeds)**: URL YouTube, Instagram, dan X (Twitter) yang disalin langsung dirender sebagai kartu visual interaktif di dalam kanvas edit.
* **Resizer Gambar & Media Kustom**: Dilengkapi handle drag-to-resize interaktif warna biru di pojok kanan bawah gambar dan media embed untuk mengubah ukuran persentase lebar (dari 15% hingga 100%) secara langsung serta mendukung alignment (float kiri/kanan dengan pembungkusan teks, atau center).
* **Editor Kode Visual & Penomoran Baris (Line Numbers Gutter)**: Blok kode dilengkapi dengan baris penomoran dinamis (*line numbers gutter*) di sebelah kiri yang sinkron secara real-time dan dropdown pemilih bahasa pemrograman (mendukung input nama bahasa kustom).
* **Editor Persamaan Matematika LaTeX (KaTeX)**: Dilengkapi tombol Sigma (Σ) khusus untuk menyisipkan rumus matematika blok (`$$...$$`) dan inline (`$...$`). Rumus LaTeX ditulis melalui editor input langsung dan ditampilkan seketika (*live render*) menggunakan KaTeX di dalam editor sebelum disimpan kembali dalam format standard Markdown.

---

## 🔑 Ganti Password Admin

Setelah login, password bisa diganti melalui menu **Settings** di dalam CMS.

---

## 🛠️ Troubleshooting

**MongoDB tidak bisa connect?**
- Pastikan MongoDB service sedang berjalan: `sudo systemctl start mongod` (Linux) atau buka MongoDB Compass
- Cek URI di `cms/.env` sudah benar

**Login gagal / "Invalid credentials"?**
- Pastikan CMS backend server (`npm run dev:cms`) sudah berjalan di port 5000
- Pastikan username dan password sesuai dengan yang ada di `cms/.env`
- Jika user admin sudah ada di database dengan password lama, hapus collection `users` di MongoDB lalu restart server

**Port sudah digunakan?**
- Ganti port backend dengan mengubah `CMS_PORT` di `cms/.env`
- Ganti port frontend: `npm run dev -- --port 3000`

**Frontend tidak bisa konek ke backend?**
- Buat file `.env.local` di root project:
  ```
  VITE_API_URL=http://localhost:5000
  ```

---

## 📁 Struktur Project

```
├── src/                    # Kode frontend (React)
│   ├── pages/
│   │   ├── admin/          # Halaman-halaman CMS
│   │   └── ...             # Halaman publik
│   └── lib/api.ts          # Client API
├── cms/                    # Backend CMS
│   ├── server/             # Express.js server
│   │   └── routes/         # API routes
│   ├── .env.example        # Template environment variables
│   └── package.json
└── package.json            # Frontend dependencies & scripts
```
