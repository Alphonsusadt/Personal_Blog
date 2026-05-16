# 🤖 Smart AI Translation Setup Guide

## ❌ Kenapa Smart AI Tidak Bekerja?

Smart AI membutuhkan **LLM (Language Model)** untuk berfungsi. Saat ini sistem gagal karena:

1. **OpenRouter API Key tidak dikonfigurasi** (main method)
2. **Ollama tidak tersedia** (fallback method)

Dalam log backend, kamu bisa lihat:
```
[Queue] Attempting with mistral-7b (1/3)
[TranslationError] mistral-7b failed (1x) - model_error for button-smartai
```

---

## ✅ Solusi: 2 Pilihan Setup

### **PILIHAN 1: Gunakan OpenRouter (RECOMMENDED - Paling Mudah)**

OpenRouter adalah proxy untuk berbagai LLM (Mistral, Llama, GPT, dll) tanpa harus setup lokal.

#### Step 1: Daftar & Dapatkan API Key

1. Buka https://openrouter.ai
2. Click **Sign Up** (bisa pakai email atau GitHub)
3. Setelah login, buka **Settings** atau **API Keys**
4. Copy API key yang diberikan
5. Save di tempat aman (kamu akan butuhnya di step berikutnya)

#### Step 2: Update `.env` File

Buka file: `cms/.env`

Cari baris ini:
```bash
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
```

Ganti dengan API key kamu:
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
```

Contoh lengkap:
```bash
# Translation Configuration
GOOGLE_TRANSLATE_API_KEY=YOUR_GOOGLE_TRANSLATE_API_KEY_HERE
OPENROUTER_API_KEY=sk-or-v1-1234567890abcdefghijklmnopqrstuvwx
USE_OLLAMA_FALLBACK=false

# Translation Settings
TRANSLATION_RATE_LIMIT=10
TRANSLATION_TIMEOUT=30000
```

#### Step 3: Restart Backend

```bash
# Stop existing backend
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Start backend lagi
cd d:\alphonsus-portfolio-website-design\cms
node server/index.js
```

Tunggu sampai lihat:
```
✅ Translation system is ready!
CMS API server running on http://localhost:5001
```

#### Step 4: Isi Credit OpenRouter (PENTING!)

⚠️ **OpenRouter memerlukan credit untuk digunakan!**

1. Login ke https://openrouter.ai
2. Buka **Billing** atau **Credits**
3. Top-up dengan kartu kredit (Visa/Mastercard) minimal $5
4. Atau bisa gunakan promo credits jika ada

---

### **PILIHAN 2: Gunakan Ollama (FREE - Tapi Perlu Setup)**

Ollama adalah LLM lokal yang berjalan di komputer kamu tanpa butuh internet API.

#### Step 1: Install Ollama

1. Download dari https://ollama.ai
2. Install dan jalankan aplikasi
3. Buka terminal dan cek:
   ```bash
   ollama --version
   ```

#### Step 2: Pull Model

Jalankan di terminal:
```bash
# Download Mistral model (~5GB, ambil waktu)
ollama pull mistral

# Atau Llama (lebih kecil ~4GB)
ollama pull llama2
```

Tunggu sampai selesai. Akan keluar output:
```
pulling manifest
pulling 8546217...
verifying sha256 digest
writing manifest
success
```

#### Step 3: Jalankan Ollama Server

Ollama akan otomatis run di background di `http://localhost:11434`

Cek apakah running:
```bash
curl http://localhost:11434/api/tags
```

Harusnya return list models.

#### Step 4: Update Backend Config

Buka `cms/.env` dan ubah:
```bash
USE_OLLAMA_FALLBACK=true
```

Dari:
```bash
USE_OLLAMA_FALLBACK=false
```

#### Step 5: Restart Backend

```bash
cd d:\alphonsus-portfolio-website-design\cms
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
node server/index.js
```

Harusnya terlihat:
```
✅ Translation system is ready!
Ollama Fallback:     ✅ (enabled)
```

---

## 🧪 Testing Smart AI

### Test 1: Via API (Terminal)

```bash
# Ganti YOUR_TOKEN dengan JWT token dari login
# Ganti POST_ID dengan ID writing yang ada

curl -X POST http://localhost:5001/api/translate-smartai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "postId": "percobaan-kelima",
    "contentType": "writing"
  }'
```

Expected response:
```json
{
  "success": true,
  "title": "Percobaan Kelima (Translated)",
  "content": "Lorem ipsum...",
  "method": "smartai",
  "model": "mistral-7b",
  "characterUnified": true,
  "duration": 2500
}
```

### Test 2: Via UI (Browser)

1. Buka admin panel: `http://localhost:5173/admin/writings`
2. Edit sebuah writing
3. Scroll ke sidebar kanan → **Translation** section
4. Click tombol **Smart AI** (warna pink)
5. Tunggu sampai selesai

Should show:
- Loading spinner dengan text "Processing..."
- Hasil translation di title + content fields
- Status badge dengan "✓ completed"

---

## 🔍 Debugging: Jika Masih Error

### Check 1: Lihat Backend Logs

Di terminal backend, cari:
```
[Queue] Attempting with mistral-7b (1/3)
[TranslationError] mistral-7b failed
```

Jika ada, masalahnya di:
- API key salah
- Credit OpenRouter habis
- Ollama tidak running

### Check 2: Test API Key

Untuk OpenRouter:
```bash
curl -X GET https://api.openrouter.ai/api/auth/key \
  -H "Authorization: Bearer sk-or-v1-YOUR_KEY_HERE"
```

Harusnya return info tentang key kamu.

### Check 3: Monitor Backend Startup

Cari di log:
```
--- Translation System Startup Validation ---
Google Translate:    ✅
OpenRouter/LLM:      ✅
Ollama Fallback:     ⚠️  (disabled)
```

Jika OpenRouter showing ❌, berarti API key missing/invalid.

---

## 📋 Checklist Setup Smart AI

### OpenRouter Path:
- [ ] Daftar di https://openrouter.ai
- [ ] Copy API key
- [ ] Update `cms/.env` dengan API key
- [ ] Top-up credit minimal $5
- [ ] Restart backend
- [ ] Test translate button

### Ollama Path:
- [ ] Install Ollama dari https://ollama.ai
- [ ] Run `ollama pull mistral` (atau llama2)
- [ ] Update `cms/.env`: `USE_OLLAMA_FALLBACK=true`
- [ ] Restart backend
- [ ] Test translate button

---

## 💡 Pro Tips

1. **Hybrid button juga butuh LLM**: Untuk polish hasil Google Translate, butuh LLM juga
2. **Smart AI terbaik untuk mixed-language**: Gunakan ketika ada campur bahasa Indonesia + English
3. **Rate limit**: Default 10 translasi per menit per user
4. **Timeout**: 30 detik per translasi (bisa disesuaikan di env)

---

## 🆘 Masih Error?

Cek file ini untuk debug lebih lanjut:
- Backend logs: Terminal yang menjalankan `node server/index.js`
- Browser console: DevTools (F12) → Console tab
- Config file: `cms/.env`

Atau buat issue dengan output:
1. Backend log terakhir
2. Error message di UI
3. Output dari curl test
