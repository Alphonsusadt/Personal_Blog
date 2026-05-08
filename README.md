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
ADMIN_PASSWORD=ganti_dengan_password_aman_anda

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
- **Password:** nilai `ADMIN_PASSWORD` yang kamu set

---

## 📋 Fitur CMS

Setelah login, kamu bisa mengelola:

| Menu | Fungsi |
|------|--------|
| **Dashboard** | Ringkasan statistik konten |
| **Projects** | Kelola proyek engineering |
| **Writings** | Kelola artikel/tulisan |
| **Books** | Kelola ulasan buku |
| **About Page** | Edit halaman tentang saya |
| **Home Page** | Edit konten halaman utama |
| **Settings** | Pengaturan umum website |

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
