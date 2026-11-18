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

#### Uji coba lokal yang aman (`cms/.env.dev`)

Bila `cms/.env` berisi koneksi **produksi** (MongoDB Atlas, Supabase, Cloudinary), menjalankan server lokal dengan file itu berarti **menulis ke database yang dibaca situs live**. Untuk mencoba fitur di komputer sendiri, buat salinan khusus lokal:

```bash
# cms/.env.dev (sudah ada di .gitignore)
MONGODB_URI=mongodb://127.0.0.1:27017   # MongoDB lokal, bukan Atlas
JWT_SECRET=<string acak lain>           # token lokal tidak berlaku di produksi
SUPABASE_URL=                           # kosong = tidak menyalin ke cadangan
CLOUDINARY_CLOUD_NAME=                  # kosong = gambar disimpan di cms/public/uploads
```

Lalu jalankan backend dengan file tersebut:

```bash
cd cms && node --env-file=.env.dev server/index.js
```

Untuk menyalin data produksi ke MongoDB lokal (hanya membaca produksi):

```bash
cd cms
node --env-file=.env scripts/backup.mjs                     # produksi → cms/backups/
MONGODB_URI=mongodb://127.0.0.1:27017 node scripts/restore.mjs --from <folder> --apply --overwrite
```

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

> Path admin bisa disamarkan lewat `VITE_ADMIN_PATH` di `.env.local` (default `/admin`). Bila diisi, halaman login ada di `<VITE_ADMIN_PATH>/login`.

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
* **Sinkronisasi Pra-Translate**: Sebelum menerjemahkan, editor menyimpan dulu dan **menunggu sampai antrean simpan benar-benar kosong**, sehingga kalimat terakhir yang baru diketik ikut diterjemahkan.
* **Teks Sumber Tidak Pernah Tertimpa**: Server selalu membaca dari MongoDB (bukan cadangan Supabase) dan hanya menulis **bahasa target** (mis. `content.en`). Ketikan di bahasa sumber selama terjemahan berjalan tetap aman.
* **Terjemahan Konten Berformat yang Aman**: Untuk konten dari editor ribbon (HTML), model AI tidak pernah menerima HTML. Server memecah konten menjadi potongan teks, menerjemahkannya, lalu merakit ulang di posisi semula. Warna, font, tabel, link, gambar, kode, dan rumus tetap utuh; keterangan gambar ikut diterjemahkan. Google Translate memakai mode `html` dengan blok yang dilindungi.
* **Penolakan Hasil Rusak**: Bila model AI mengembalikan jumlah potongan yang salah, server mencoba ulang (maksimal 3 kali). Bila tetap salah, **tidak ada yang disimpan** dan pengguna diminta mencoba lagi.
* **Pesan Error yang Jelas**: Mis. "Kuota Google Translate habis… pakai tombol Smart AI" alih-alih "status code 403".

### 💾 2. Autosave & Pencegahan Konten Ganda (Anti-Duplication)
* **Debounced Autosave**: Menyimpan ke server setiap kali pengguna berhenti mengetik ±600ms, dan ke draf lokal browser ±800ms.
* **Aman untuk Penulis Cepat**:
  * Hanya satu penyimpanan berjalan dalam satu waktu; ketikan selama penyimpanan berjalan **diantrekan, tidak dibuang**.
  * Balasan server hanya memperbarui metadata (`_id`, slug, waktu), tidak pernah menimpa isi yang sedang diketik.
  * Draf lokal baru dihapus bila server sudah persis sama dengan isi layar.
  * Penyimpanan yang gagal dicoba ulang dengan **data terbaru**, bukan data lama.
  * Ketikan terakhir dikirim seketika saat menekan Ctrl+S, Simpan, Translate, Back, Live Preview, ganti bahasa, atau menutup tab.
* **Ringan di Dokumen Panjang**: Isi editor dikirim ke halaman paling sering tiap 120ms (bukan tiap huruf), sehingga mengetik tetap lancar di cerita ribuan kata.
* **Pembersihan Draf**: Draf `*_new` dihapus setelah tulisan baru tersimpan (tidak lagi ditawarkan ke tulisan berikutnya), dan draf lokal berumur lebih dari 3 hari dibersihkan otomatis agar kuota localStorage tidak penuh.
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
* **Writings**: Blog personal dengan editor bergaya Word dan perkiraan waktu baca (*read time*).
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
* **MongoDB = Sumber Kebenaran**: Semua data dibaca dan ditulis ke MongoDB.
* **Supabase (Cadangan Satu Arah)**: Setiap simpanan disalin ke PostgreSQL Supabase sebagai cadangan. Aplikasi **tidak pernah membaca** dari Supabase, sehingga isi cadangan tidak bisa menimpa data utama.
* **Cloudinary (Manajemen Aset Media)**: Unggah gambar, sampul buku, dan ikon ke Cloudinary CDN. PNG/WebP transparan tetap transparan (tidak diubah menjadi JPEG berlatar hitam). **Kualitas asli dipertahankan**: gambar dengan sisi terpanjang ≤ 3840 px dan ≤ 10 MB diunggah persis seperti filenya (tanpa diperkecil atau dikompres ulang), sehingga skema rangkaian, diagram, dan screenshot berteks kecil tetap tajam. Hanya gambar yang lebih besar yang diperkecil ke 3840 px (PNG tetap PNG; GIF tidak pernah diubah). Aturan ini berlaku untuk tombol Pictures, paste, drag, crop/rotate. Bila Cloudinary tidak dikonfigurasi atau gagal, gambar disimpan di `cms/public/uploads`.
* **Konfigurasi API Keamanan**: Menggunakan variabel lingkungan (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) di dalam berkas `.env` lokal untuk keamanan autentikasi.

### 📝 9. Editor Bergaya Microsoft Word (Writings, Projects, Library)
Ketiga jenis tulisan (Writing, Project, ulasan Buku) memakai editor yang sama: ribbon bergaya Word dengan warna CMS, di atas "halaman kertas" putih yang tampilannya sama dengan halaman publik. Tata letak ribbon terinspirasi dari [WordCraft](https://github.com/storytold/wordcraft) (MIT/Apache-2.0), ditulis ulang dengan React + Tiptap.

* **Tab Ribbon**: **Home · Insert · Review · View**, plus tab kontekstual **Table** (saat kursor di tabel) dan **Picture Format** (saat gambar dipilih). Ribbon menempel di bawah header saat halaman di-scroll dan meringkas grupnya sendiri bila layar sempit.
* **Home**:
  * Font (Merriweather, Inter, Lora, Playfair Display, Source Serif 4, Roboto, Open Sans, dll.), ukuran (pt), perbesar/perkecil (Ctrl+] / Ctrl+[), Change Case, Clear Formatting.
  * Bold, Italic, Underline, Strikethrough, Subscript, Superscript, kode inline, warna sorot (highlight), warna font.
  * Bullets, Numbering, Increase/Decrease Indent, rata kiri/tengah/kanan/justify, spasi baris, tanda paragraf (¶).
  * Galeri Styles (Normal, Heading 1–4, Quote), Find & Replace (Ctrl+F / Ctrl+H), Select All, Format Painter, Paste.
* **Insert**: Tabel (pemilih grid), gambar, TikZ, video/post YouTube · Instagram · X, link (Ctrl+K), blok kode, garis horizontal, tanggal, rumus LaTeX (blok/inline), simbol, Other Language (aset dari versi bahasa lain).
* **Review**: Auto Fix ejaan (Indonesia/Inggris) yang hanya mengubah teks, tidak pernah tag atau kode.
* **View**: Live Preview berdampingan, lebar halaman (Narrow/Normal/Wide). Zoom dan jumlah kata/karakter ada di status bar bawah.
* **Tab seperti Word**:
  * Tab di awal paragraf = indentasi baris pertama (paragraf cerita); Enter membuat paragraf berikutnya ikut menjorok.
  * Tab kedua menggeser seluruh paragraf; Shift+Tab/Backspace di awal paragraf mengurangi indentasi.
  * Tab di tengah kalimat menyisipkan jarak tab; di daftar/tabel Tab tetap naik level/pindah sel.
* **Tempel dari Word/Google Docs**: Tebal, miring, warna, dan font dipertahankan; gambar `file:///` (yang hanya ada di komputer penulis) dan sampah format Word dibuang.
* **Tempel/drag gambar**: Screenshot yang ditempel atau file gambar yang di-drag langsung diunggah ke server (bukan disimpan sebagai base64).
* **Format Penyimpanan**: Konten disimpan sebagai HTML berpenanda `<!--wc:html-->`. Konten lama (Markdown) tetap tampil seperti biasa dan baru berubah ke HTML saat diedit.
* **Undo per Bahasa**: Riwayat Undo dikosongkan saat tab bahasa diganti, supaya teks satu bahasa tidak bisa masuk ke bahasa lain.
* **Tetap Didukung**: Embed YouTube/Instagram/X, blok kode bernomor baris dengan pemilih bahasa, rumus LaTeX (KaTeX), diagram TikZ, dan Mermaid.

### 🖼️ 10. Tata Letak Gambar Seperti Word
* **Wrap Text (6 mode)** lewat tombol **Layout Options** di samping gambar atau Picture Format → Wrap Text:
  * **In Line with Text**: gambar menjadi bagian dari baris, seperti satu huruf besar.
  * **Square**: teks mengalir di samping gambar (kiri/kanan).
  * **Tight**: teks mengikuti bentuk gambar (paling terasa pada PNG transparan).
  * **Top and Bottom**: gambar berdiri sendiri, rata kiri/tengah/kanan.
  * **In Front of Text** / **Behind Text**: posisi bebas di mana saja, di atas atau di belakang teks.
* **Drag untuk memindahkan**:
  * Mode Square/Tight/Top and Bottom: gambar ditambatkan ke paragraf tempat dilepas, dan sisinya (kiri/tengah/kanan) mengikuti posisi jatuh, dengan garis bantu.
  * Mode bebas: gambar mengikuti mouse, menempel (snap) ke tepi kiri/tengah/kanan kolom dengan garis hijau, dan bisa digeser 1px dengan tombol panah (Shift+panah = 10px).
* **8 titik resize** dengan rasio terkunci; satu tarikan = satu langkah Undo.
* **Picture Format**: Position, lebar (%), Reset Size, **Crop** (bebas atau 1:1/4:3/3:2/16:9), **Rotate/Flip** 90° (piksel ikut diputar, jadi kotak gambar tidak menutupi teks), Picture Styles (sudut bulat, bayangan, bingkai), **Alt Text**, dan **Caption** (keterangan di bawah gambar, ikut diterjemahkan).
* **Responsif**: Posisi disimpan relatif terhadap paragraf dan lebar kolom, sehingga tetap proporsional di layar desktop mana pun. Di HP (≤ 640px) gambar mengambang/bebas otomatis menjadi lebar penuh di antara paragraf supaya teks tidak terjepit atau tertutup.
* **Embed YouTube / Instagram / X ikut ditata seperti gambar**: tempel link (atau Insert → Embed), lalu klik embed untuk membuka tab **Embed Format**: Wrap Text (semua mode kecuali Tight), Position, lebar, Reset Size, Styles, dan Caption — plus drag bebas, 8 titik resize, dan tombol Layout Options yang sama. Crop/Rotate/Alt Text tidak tersedia untuk embed. Embed lama (format `<div class="social-embed">`) otomatis dibaca ke model baru saat tulisan dibuka; rata kiri/kanan menjadi Square, selain itu Top and Bottom. Di halaman publik video diputar langsung (youtube-nocookie), dan post X dimuat otomatis lewat widget resmi X.

### 🔁 10b. Menulis Dua Bahasa Secara Manual
* **Panel "Other Language"** (Insert → Other Language): berisi semua gambar, embed, tabel, blok kode, rumus, dan link dari versi bahasa satunya, urut sesuai posisinya di tulisan. Panel tidak menutupi editor, jadi bisa tetap terbuka sambil menulis.
  * **Sisipkan** (di posisi kursor) atau **drag kartu** ke paragraf. Tata letak gambar (wrap, lebar, posisi, gaya, caption) ikut terbawa.
  * **Link**: blok kata di editor, lalu klik **Pakai di teks terpilih**. Cuplikan kalimat dari bahasa lain ditampilkan supaya mudah mencari padanannya.
  * **Salin semua ke posisi yang sama**: setiap aset yang belum dipakai ditaruh di paragraf dengan urutan yang sama (paragraf ke-3 ID → paragraf ke-3 EN). Bisa dibatalkan dengan Ctrl+Z.
  * Tanda **✓ dipakai** menunjukkan aset yang sudah ada di versi yang sedang ditulis.
* **Copy-paste antar bahasa**: pilih gambar/embed di tab Indonesia, Ctrl+C, pindah ke tab English, Ctrl+V. Semua pengaturan tata letaknya ikut.
* **Translate saat versi tujuan sudah berisi**: tombol Translate/Hybrid/Smart AI menanyakan dulu:
  * **Pertahankan tata letak gambarku**: teks diganti hasil terjemahan, tetapi gambar/embed yang sudah diatur di versi tujuan (dicocokkan lewat URL) memakai posisi, ukuran, wrap, dan caption lama, dan gambar yang hanya ada di versi tujuan tidak hilang.
  * **Ganti semua**: versi tujuan disamakan dengan versi sumber.
  * Setelah translate ada tombol **Kembalikan isi … sebelum terjemahan** untuk membatalkan.
* **Project Links per bahasa** (GitHub, Paper/Documentation, Live Demo): kotak isian mengikuti tab bahasa yang aktif, dan link versi bahasa lain ditampilkan kecil di bawahnya. Di web:
  * hanya diisi di satu bahasa → tampil di kedua bahasa;
  * diisi di dua bahasa dengan URL berbeda → keduanya tampil dengan label (ID) / (EN), bahasa halaman lebih dulu;
  * URL sama → tampil sekali; kosong → tidak tampil.
  * Link lama (sebelum fitur ini) tetap berlaku untuk kedua bahasa sampai diubah.

### 🌍 11. Tampilan Publik
* Konten HTML dibersihkan dengan **DOMPurify** sebelum ditampilkan (skrip dan atribut berbahaya dibuang), lalu rumus, kode, TikZ, Mermaid, dan embed dirender.
* Tampilan halaman publik = tampilan di editor (font, warna, perataan, indentasi, tabel, gambar), di mode terang maupun gelap.
* Di HP, tabel lebar digulir di dalam wadahnya sendiri sehingga halaman tidak ikut melebar.
* Kartu buku di Library dan pencarian memakai teks polos dari ulasan (tidak menampilkan HTML mentah).

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

**Tombol Translate/Hybrid gagal dengan pesan "Kuota Google Translate habis"?**
- Kuota API Google Translate (`GOOGLE_TRANSLATE_API_KEY`) sudah habis atau dibatasi. Cek di Google Cloud Console → APIs & Services → Quotas. Sementara itu, tombol **Smart AI** tetap bisa dipakai karena tidak memakai Google.

**Smart AI gagal dengan "All translation models failed" atau "Hasil AI tidak lengkap"?**
- Model AI gratis di OpenRouter sedang tidak tersedia, atau mengembalikan terjemahan yang tidak lengkap. Tidak ada data yang diubah; coba lagi beberapa saat kemudian.

**Muncul dialog "Draft Ditemukan"?**
- Artinya ada perubahan di browser yang belum sampai ke server (mis. tab tertutup saat menyimpan). Pilih **Pulihkan Draft** untuk melanjutkan perubahan itu, atau **Mulai Baru** untuk memakai versi server.

**Gambar PNG transparan berlatar hitam?**
- Gambar yang diunggah sebelum perbaikan ini sudah tersimpan sebagai JPEG. Unggah ulang gambarnya.

**Server lokal menulis ke database produksi?**
- Jalankan backend dengan `cms/.env.dev` (lihat Langkah 1), bukan `cms/.env`.

---

## 📁 Struktur Project

```
├── src/                          # Kode frontend (React)
│   ├── pages/
│   │   ├── admin/                # Halaman CMS (WritingEditor, ProjectEditor, BookEditor, …)
│   │   └── ...                   # Halaman publik
│   ├── components/
│   │   ├── RichTextEditor.tsx    # Editor bergaya Word (Tiptap)
│   │   ├── ImageNodeView.tsx     # Gambar: resize, drag bebas, Layout Options, caption
│   │   └── ribbon/               # Ribbon (tab, tombol, Picture Format, crop, tata letak gambar)
│   ├── hooks/useAdminAutosave.ts # Autosave (antrean, retry, draf lokal)
│   ├── lib/
│   │   ├── api.ts                # Client API
│   │   ├── richContent.ts        # Format konten HTML (<!--wc:html-->) vs Markdown lama
│   │   ├── indent.ts             # Tab/indentasi paragraf seperti Word
│   │   └── searchReplace.ts      # Find & Replace
│   └── utils/richRenderer.ts     # Render konten HTML untuk halaman publik & preview
├── cms/                          # Backend CMS
│   ├── server/
│   │   ├── routes/               # API routes (translation.js, media.js, …)
│   │   └── utils/richHtml.js     # Terjemahan konten HTML per potongan teks
│   ├── scripts/                  # backup.mjs / restore.mjs
│   ├── .env.example              # Template environment variables
│   └── package.json
└── package.json                  # Frontend dependencies & scripts
```
