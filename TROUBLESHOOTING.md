# 🔧 Panduan Troubleshooting - Halaman Putih

## ❗ Masalah: Halaman Browser Putih Kosong

Ketika Anda mengakses `http://localhost:5173/writings/tetetetetet`, halaman menampilkan putih kosong tanpa konten apapun.

---

## 🔍 Penyebab Masalah

### 1. **Server Tidak Berjalan**
   - CMS Backend (port 5001) tidak aktif
   - Frontend Dev Server (port 5173) tidak aktif
   - Atau keduanya

### 2. **Data Tidak Tersedia**
   - URL `/writings/tetetetetet` adalah slug yang tidak ada di database
   - API call gagal tapi error handling tidak memadai

### 3. **MongoDB Tidak Berjalan**
   - CMS memerlukan MongoDB untuk menyimpan data
   - Jika MongoDB mati, CMS akan crash

---

## ✅ Solusi Step-by-Step

### **CARA 1: Quick Start (TERMUDAH)** ⭐

1. **Dobel-klik file `QUICK_START.bat`** di folder project Anda
   ```
   d:\alphonsus-portfolio-website-design\QUICK_START.bat
   ```

2. **Dua terminal window akan terbuka:**
   - Window 1: CMS Backend (port 5001)
   - Window 2: Frontend (port 5173)

3. **Tunggu sampai kedua server ready** (biasanya 10-30 detik)

4. **Buka browser:** `http://localhost:5173`

---

### **CARA 2: Manual Start**

#### **Terminal 1 - CMS Backend:**
```cmd
cd d:\alphonsus-portfolio-website-design\cms
npm run dev
```
Tunggu sampai muncul: `✓ CMS Backend running on port 5001`

#### **Terminal 2 - Frontend:**
```cmd
cd d:\alphonsus-portfolio-website-design
npm run dev
```
Tunggu sampai muncul: `➜ Local: http://localhost:5173`

---

### **CARA 3: Cek Status Server**

Jalankan file `CHECK_SERVERS.bat` untuk melihat status:
```
d:\alphonsus-portfolio-website-design\CHECK_SERVERS.bat
```

Output akan menunjukkan:
- ✓ Server yang sudah jalan
- ✗ Server yang belum jalan
- ⚠ Warning jika MongoDB tidak aktif

---

## 🐛 Debugging Browser Console

1. **Buka Developer Tools** di browser (F12 atau Ctrl+Shift+I)

2. **Buka tab Console** - cari error messages seperti:
   ```
   Failed to fetch
   ERR_CONNECTION_REFUSED
   404 Not Found
   ```

3. **Buka tab Network** - cek request ke API:
   - Request ke `http://localhost:5001/api/...`
   - Status: 200 (OK), 404 (Not Found), atau Failed

---

## 📋 Checklist Troubleshooting

**Sebelum melaporkan bug, pastikan:**

- [ ] MongoDB berjalan di port 27017
- [ ] CMS Backend berjalan di port 5001
- [ ] Frontend berjalan di port 5173
- [ ] File `.env.local` ada di root folder
- [ ] File `cms/.env` ada di folder cms
- [ ] Browser console tidak menunjukkan error
- [ ] Tidak ada aplikasi lain yang menggunakan port 5001 atau 5173

---

## 🔨 Solusi Error Umum

### **Error: MongoDB Connection Failed**
```
MongoServerError: connect ECONNREFUSED
```

**Solusi:**
1. Install MongoDB Community Server dari: https://www.mongodb.com/try/download/community
2. Start MongoDB service:
   ```cmd
   net start MongoDB
   ```
   Atau buka MongoDB Compass dan start service dari sana

---

### **Error: Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::5001
```

**Solusi:**
1. Cari proses yang menggunakan port:
   ```cmd
   netstat -ano | findstr :5001
   ```
2. Matikan proses tersebut dengan Task Manager

---

### **Error: Module Not Found**
```
Cannot find module 'express'
```

**Solusi:**
1. Install dependencies di root folder:
   ```cmd
   npm install
   ```
2. Install dependencies di CMS folder:
   ```cmd
   cd cms
   npm install
   ```

---

### **Halaman Putih Tapi Server Jalan**

Jika server sudah jalan tapi halaman tetap putih:

1. **Cek browser console** (F12) untuk error React
2. **Hard refresh browser:** Ctrl+Shift+R atau Ctrl+F5
3. **Clear browser cache** dan reload
4. **Coba akses homepage dulu:** `http://localhost:5173`
5. **Cek apakah ada data:** Akses `http://localhost:5001/api/writings/public` di browser

---

## 🎯 Testing Koneksi API

### **Test CMS Backend:**
Buka di browser: `http://localhost:5001/api/writings/public`

**Expected:** JSON dengan list writings atau array kosong `[]`

### **Test Frontend:**
Buka di browser: `http://localhost:5173`

**Expected:** Homepage muncul dengan navigasi

---

## 📞 Masih Bermasalah?

Jika masih error setelah mengikuti semua langkah:

1. **Screenshot error message** di console
2. **Jalankan `CHECK_SERVERS.bat`** dan screenshot hasilnya
3. **Copy error dari terminal** CMS Backend dan Frontend
4. **Tanyakan ke saya** dengan informasi lengkap di atas

---

## 🚀 Quick Commands Reference

| Perintah | Fungsi |
|----------|--------|
| `QUICK_START.bat` | Start kedua server sekaligus |
| `CHECK_SERVERS.bat` | Cek status server |
| `npm run dev` | Start frontend dev server |
| `cd cms && npm run dev` | Start CMS backend |
| `npm run seed` | Seed data ke database (jika kosong) |
| `netstat -ano \| findstr :5173` | Cek port 5173 |

---

**Good luck! 🎉**
