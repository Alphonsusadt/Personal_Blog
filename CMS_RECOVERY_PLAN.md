# CMS Recovery Plan - Panduan Login & Recovery

> Dokumen ini berisi kredensial default, metode recovery, dan rencana implementasi fitur forgot password menggunakan random verification code.

---

## 1. Kredensial Default (Template)

Kredensial berikut **WAJIB diganti** sebelum deploy ke production.

| Field | Default (Dev) | Cara Ganti |
|---|---|---|
| **Username** | `admin` | Edit `ADMIN_USERNAME` di `cms/.env` |
| **Password** | `admin123` | Edit `ADMIN_PASSWORD` di `cms/.env` |
| **JWT Secret** | *(auto-generated)* | Edit `JWT_SECRET` di `cms/.env` |

> **Catatan:** Kredensial hanya dipakai saat user admin pertama kali dibuat. Jika user sudah ada di MongoDB, mengubah `.env` tidak akan mengubah password yang sudah tersimpan. Untuk mengubah password yang sudah ada, gunakan metode recovery di bawah.

---

## 2. Quick Recovery - Jika Lupa Password (Tanpa Fitur OTP)

### Metode A: Reset via Environment Variable

Jika kamu lupa password dan masih punya akses ke server/file:

1. **Hapus user admin dari MongoDB:**
   ```bash
   # Masuk ke MongoDB shell
   mongosh

   # Hapus user admin
   use alphonsus-portfolio
   db.users.deleteOne({ username: "admin" })
   ```

2. **Ganti password di `.env`:**
   ```env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=password_baru_kamu
   ```

3. **Restart CMS server:**
   ```bash
   cd cms
   node server/index.js
   ```

   Server akan otomatis membuat ulang user admin dengan password baru dari `.env`.

### Metode B: Reset via Script MongoDB (Tanpa Restart)

```bash
mongosh --eval '
  use alphonsus-portfolio;
  const bcrypt = require("bcryptjs");
  const newHash = bcrypt.hashSync("password_baru_kamu", 10);
  db.users.updateOne(
    { username: "admin" },
    { $set: { password: newHash } }
  );
'
```

### Metode C: Buat Script Reset Khusus

Buat file `cms/reset-password.js`:

```javascript
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'alphonsus-portfolio';

async function resetPassword() {
  const args = process.argv.slice(2);
  const username = args[0];
  const newPassword = args[1];

  if (!username || !newPassword) {
    console.log('Usage: node reset-password.js <username> <new_password>');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('Password minimal 6 karakter');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const user = await db.collection('users').findOne({ username });
  if (!user) {
    console.error(`User "${username}" tidak ditemukan`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.collection('users').updateOne(
    { username },
    { $set: { password: hashed, updatedAt: new Date() } }
  );

  console.log(`Password untuk "${username}" berhasil diubah`);
  await client.close();
}

resetPassword().catch(console.error);
```

Jalankan dengan:
```bash
node cms/reset-password.js admin password_baru_kamu
```

---

## 3. Quick Recovery - Jika Lupa Username

### Metode A: Cek MongoDB Langsung

```bash
mongosh --eval 'use alphonsus-portfolio; db.users.find({}, { username: 1, createdAt: 1 })'
```

### Metode B: Cek File `.env`

Username default selalu tersimpan di:
```env
# cms/.env
ADMIN_USERNAME=admin
```

### Metode C: Lihat Log Server

Saat server pertama kali dijalankan, log akan menampilkan:
```
Default admin user created (username: admin)
```

---

## 4. Rencana Implementasi: Forgot Password dengan Random Verification Code

### 4.1 Arsitektur Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User klik   │────>│  Server      │────>│  Email       │────>│  User cek    │
│  "Lupa PW"   │     │  generate    │     │  dikirim via │     │  inbox email │
│              │     │  6-digit OTP │     │  Resend.com  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                                      v
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Password    │<────│  Server      │<────│  User input  │<────│  User baca   │
│  berhasil    │     │  verify OTP  │     │  OTP + newPW │     │  kode OTP    │
│  diubah      │     │  + update DB │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 4.2 Alur Lengkap

#### Step 1: User Meminta Reset

```
POST /api/auth/forgot-password
Body: { "email": "user@email.com" }
```

Server melakukan:
- Cari user berdasarkan email di collection `users`
- Generate 6-digit random code (OTP)
- Simpan OTP ke collection `password_resets` dengan expiry 15 menit
- Kirim email berisi OTP via Resend.com
- Return: `{ message: "Kode verifikasi dikirim ke email" }`

#### Step 2: User Memasukkan OTP + Password Baru

```
POST /api/auth/reset-password
Body: {
  "email": "user@email.com",
  "code": "482916",
  "newPassword": "passwordBaru123"
}
```

Server melakukan:
- Cari OTP yang valid (belum expired, belum dipakai)
- Verifikasi code cocok
- Hash password baru dengan bcrypt
- Update password di collection `users`
- Tandai OTP sebagai sudah dipakai
- Kirim email konfirmasi bahwa password telah diubah
- Return: `{ message: "Password berhasil diubah" }`

### 4.3 Database Schema Baru

```javascript
// Collection: password_resets
{
  email: "user@email.com",        // Email tujuan
  code: "482916",                  // 6-digit OTP
  hashedCode: "$2a$10$...",       // bcrypt hash dari code (opsional, untuk keamanan extra)
  expiresAt: ISODate("..."),       // 15 menit dari sekarang
  used: false,                     // Flag sudah dipakai atau belum
  createdAt: ISODate("..."),       // Waktu dibuat
  verifiedAt: null                 // Waktu diverifikasi (diisi setelah dipakai)
}
```

### 4.4 File yang Perlu Dibuat/Dimodifikasi

#### File Baru

| File | Fungsi |
|---|---|
| `cms/server/routes/auth.js` | Tambah endpoint `forgot-password` dan `reset-password` |
| `cms/server/utils/emailService.js` | Service untuk kirim email via Resend.com |
| `cms/server/utils/otpGenerator.js` | Generate & hash OTP |

#### File yang Dimodifikasi

| File | Perubahan |
|---|---|
| `cms/server/index.js` | Tambah index pada collection `password_resets` |
| `cms/.env` | Tambah `ADMIN_EMAIL` dan `RESEND_API_KEY` |
| `cms/.env.example` | Dokumentasikan variable baru |

### 4.5 Implementasi Detail

#### A. `cms/server/utils/otpGenerator.js`

```javascript
import crypto from 'crypto';

/**
 * Generate 6-digit OTP code
 */
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash OTP for secure storage
 */
export async function hashOTP(otp) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.hash(otp, 10);
}

/**
 * Verify OTP against hash
 */
export async function verifyOTP(otp, hashedOTP) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.compare(otp, hashedOTP);
}
```

#### B. `cms/server/utils/emailService.js`

```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'CMS Portfolio <noreply@yourdomain.com>';

/**
 * Kirim email berisi kode OTP reset password
 */
export async function sendOTPEmail(toEmail, code, expiresInMinutes = 15) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: 'Kode Reset Password - CMS Portfolio',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px;">Reset Password</h2>
        <p style="font-size: 16px; color: #333;">
          Anda meminta untuk mereset password CMS Portfolio.
          Berikut kode verifikasi Anda:
        </p>
        <div style="
          background: #f7f7f5;
          border-radius: 8px;
          padding: 16px 24px;
          text-align: center;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 8px;
          margin: 16px 0;
        ">${code}</div>
        <p style="font-size: 14px; color: #666;">
          Kode ini berlaku selama ${expiresInMinutes} menit.
          Jika Anda tidak meminta reset password, abaikan email ini.
        </p>
      </div>
    `,
  });

  if (error) throw error;
  return data;
}

/**
 * Kirim email konfirmasi bahwa password berhasil diubah
 */
export async function sendPasswordChangedEmail(toEmail) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: 'Password Berhasil Diubah - CMS Portfolio',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px;">Password Berhasil Diubah</h2>
        <p style="font-size: 16px; color: #333;">
          Password akun CMS Portfolio Anda telah berhasil diubah.
        </p>
        <p style="font-size: 14px; color: #666;">
          Jika Anda tidak melakukan perubahan ini, segera hubungi administrator.
        </p>
      </div>
    `,
  });

  if (error) throw error;
  return data;
}
```

#### C. Endpoint Baru di `cms/server/routes/auth.js`

Tambahkan route berikut ke file auth.js yang sudah ada:

```javascript
import { generateOTP, hashOTP, verifyOTP } from '../utils/otpGenerator.js';
import { sendOTPEmail, sendPasswordChangedEmail } from '../utils/emailService.js';

const OTP_EXPIRY_MINUTES = 15;
const OTP_MAX_ATTEMPTS_PER_HOUR = 3;

// ... (route login dan change-password yang sudah ada)

// ==========================================
// POST /api/auth/forgot-password
// Step 1: Request OTP code via email
// ==========================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email wajib diisi' });
    }

    // Cek apakah user dengan email ini ada
    const user = await db.collection('users').findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email }  // fallback: bisa input username juga
      ]
    });

    // Selalu return sukses untuk mencegah email enumeration attack
    if (!user || !user.email) {
      return res.json({
        message: 'Jika email terdaftar, kode verifikasi akan dikirim'
      });
    }

    // Rate limit: max 3 request per jam
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await db.collection('password_resets').countDocuments({
      email: user.email,
      createdAt: { $gte: oneHourAgo }
    });

    if (recentRequests >= OTP_MAX_ATTEMPTS_PER_HOUR) {
      return res.status(429).json({
        error: 'Terlalu banyak request. Coba lagi dalam 1 jam.'
      });
    }

    // Generate dan hash OTP
    const code = generateOTP();
    const hashedCode = await hashOTP(code);

    // Simpan ke database
    await db.collection('password_resets').insertOne({
      email: user.email,
      hashedCode,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      used: false,
      createdAt: new Date(),
      verifiedAt: null,
    });

    // Kirim email
    await sendOTPEmail(user.email, code, OTP_EXPIRY_MINUTES);

    res.json({
      message: 'Kode verifikasi dikirim ke email',
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email
    });
  } catch (err) {
    console.error('[Forgot Password] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// POST /api/auth/reset-password
// Step 2: Verify OTP + set new password
// ==========================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        error: 'Email, kode verifikasi, dan password baru wajib diisi'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password baru minimal 6 karakter'
      });
    }

    // Cari OTP yang valid (belum expired, belum dipakai)
    const resetDoc = await db.collection('password_resets').findOne({
      email: email.toLowerCase(),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetDoc) {
      return res.status(400).json({
        error: 'Kode verifikasi tidak valid atau sudah kadaluarsa'
      });
    }

    // Verifikasi OTP
    const isValid = await verifyOTP(code, resetDoc.hashedCode);
    if (!isValid) {
      return res.status(400).json({ error: 'Kode verifikasi salah' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    // Tandai OTP sebagai sudah dipakai
    await db.collection('password_resets').updateOne(
      { _id: resetDoc._id },
      { $set: { used: true, verifiedAt: new Date() } }
    );

    // Kirim email konfirmasi
    try {
      await sendPasswordChangedEmail(email.toLowerCase());
    } catch (emailErr) {
      console.error('[Reset Password] Gagal kirim email konfirmasi:', emailErr);
      // Tidak gagalkan reset jika email konfirmasi gagal
    }

    res.json({ message: 'Password berhasil diubah' });
  } catch (err) {
    console.error('[Reset Password] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// POST /api/auth/verify-reset-code
// (Opsional) Step 1.5: Verifikasi kode dulu sebelum input password baru
// ==========================================
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email dan kode verifikasi wajib diisi' });
    }

    const resetDoc = await db.collection('password_resets').findOne({
      email: email.toLowerCase(),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetDoc) {
      return res.status(400).json({
        error: 'Kode verifikasi tidak valid atau sudah kadaluarsa'
      });
    }

    const isValid = await verifyOTP(code, resetDoc.hashedCode);
    if (!isValid) {
      return res.status(400).json({ error: 'Kode verifikasi salah' });
    }

    res.json({ message: 'Kode verifikasi valid', valid: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

#### D. Index Baru di `cms/server/index.js`

Tambahkan di bagian pembuatan index:

```javascript
await db.collection('password_resets').createIndex({ email: 1, used: 1, expiresAt: 1 });
await db.collection('password_resets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired
```

#### E. Variable `.env` Baru

```env
# --- PASSWORD RECOVERY ---
ADMIN_EMAIL=your-email@gmail.com          # Email admin untuk menerima OTP
RESEND_API_KEY=re_xxxxxxxxxxxx            # API key dari resend.com
FROM_EMAIL=CMS Portfolio <noreply@yourdomain.com>
```

#### F. Tambah Field `email` di Collection `users`

```javascript
// Update user admin yang sudah ada
db.users.updateOne(
  { username: "admin" },
  { $set: { email: "your-email@gmail.com" } }
)
```

### 4.6 Diagram Alur Lengkap

```
                 LUPA PASSWORD
                      │
                      v
            ┌─────────────────────┐
            │  Klik "Lupa Password"│
            │  Input email/username│
            └─────────┬───────────┘
                      │
                      v
            ┌─────────────────────┐
            │  POST /forgot-password│
            │  Server generate OTP │
            └─────────┬───────────┘
                      │
                      v
            ┌─────────────────────┐
            │  Email OTP dikirim   │
            │  via Resend.com      │
            └─────────┬───────────┘
                      │
                      v
            ┌─────────────────────┐
            │  User cek inbox      │
            │  Baca 6-digit kode   │
            └─────────┬───────────┘
                      │
            ┌─────────┴───────────┐
            │                     │
            v                     v
   ┌────────────────┐   ┌──────────────────┐
   │ Langsung reset  │   │ Verifikasi dulu   │
   │ (One-step)      │   │ (Two-step)        │
   │ POST /reset-    │   │ POST /verify-     │
   │ password        │   │ reset-code        │
   │ (code + newPW)  │   │ lalu POST /reset- │
   └────────┬───────┘   │ password           │
            │           └────────┬───────────┘
            │                    │
            v                    v
   ┌─────────────────────────────────┐
   │  Server verifikasi OTP           │
   │  Update password di MongoDB      │
   │  Kirim email konfirmasi          │
   │  Tandai OTP sebagai used         │
   └────────────────┬────────────────┘
                    │
                    v
   ┌─────────────────────────────────┐
   │  Login dengan password baru      │
   └─────────────────────────────────┘
```

### 4.7 Checklist Implementasi

- [ ] Install `resend` package: `npm install resend`
- [ ] Tambah field `email` ke collection `users` (dan ke seed/admin creation)
- [ ] Buat file `cms/server/utils/otpGenerator.js`
- [ ] Buat file `cms/server/utils/emailService.js`
- [ ] Tambah 3 endpoint baru di `cms/server/routes/auth.js`:
  - `POST /forgot-password` - Kirim OTP
  - `POST /verify-reset-code` - Verifikasi OTP saja (opsional)
  - `POST /reset-password` - Verifikasi OTP + ganti password
- [ ] Tambah index `password_resets` di `cms/server/index.js`
- [ ] Tambah variable env baru di `.env` dan `.env.example`
- [ ] Update admin user creation di `index.js` supaya include `email` field
- [ ] Test alur end-to-end
- [ ] Buat halaman frontend "Lupa Password" (opsional - bisa pakai API langsung)

### 4.8 Keamanan

| Aspek | Proteksi |
|---|---|
| **OTP brute-force** | OTP 6 digit + expiry 15 menit + rate limit 3x/jam |
| **Email enumeration** | Response selalu sama baik email ada atau tidak |
| **OTP reuse** | Flag `used: true` setelah dipakai |
| **Expired OTP** | TTL index MongoDB auto-delete + pengecekan `expiresAt` |
| **Password hashing** | bcrypt dengan salt rounds 10 |
| **Notification** | Email konfirmasi dikirim setelah password berhasil diubah |

---

## 5. Langkah Darurat - Jika Semua Cara Gagal

Jika kamu benar-benar tidak bisa akses apapun:

1. **Akses server/file system** langsung
2. **Edit `cms/.env`:**
   ```env
   ADMIN_USERNAME=admin_baru
   ADMIN_PASSWORD=password_baru_banget
   ```
3. **Hapus user lama di MongoDB:**
   ```bash
   mongosh --eval 'use alphonsus-portfolio; db.users.deleteMany({})'
   ```
4. **Restart server:**
   ```bash
   cd cms
   node server/index.js
   ```
5. Server akan membuat user baru dari `.env`
