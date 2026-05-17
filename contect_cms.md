Berikut adalah draf **README.md** yang komprehensif khusus untuk fitur **Section Kontak Bilingual** dengan logika validasi dan routing yang kamu inginkan.

File ini menjelaskan bagaimana menangani pemisahan pesan "Balas" (With Email) dan "Baca Saja" (Without Email), serta logika default Subjek.

---

# Bilingual Contact System Implementation

Dokumentasi ini menjelaskan implementasi Section Kontak pada website yang mendukung **Bahasa Indonesia** dan **Bahasa Inggris**, dengan logika pemisahan pesan berdasarkan ketersediaan alamat email pengirim dan validasi ketat pada isi pesan.

## 🌟 Fitur & Logika Utama

Sistem ini dirancang dengan logika cerdas untuk memisahkan pesan yang bisa ditindaklanjuti (Replyable) dan pesan sekadar log (Read-Only).

### 1. Mode Pengiriman Berdasarkan Email

*   **Mode Balas (With Email):**
    *   Pengunjung mengisi alamat **Email**.
    *   Pesan dikategorikan sebagai `Replyable` (Bisa Dibalas).
    *   Admin dapat membalas pesan langsung melalui sistem balasan (via Resend/Gmail).
    *   Disimpan dengan status `pending_reply`.

*   **Mode Baca Saja (Without Email / Tanpa Email):**
    *   Pengunjung **tidak** mengisi alamat email (Opsional).
    *   Pesan dikategorikan sebagai `Read-Only` (Hanya Dibaca).
    *   Pesan ini hanya berfungsi sebagai log atau feedback anonim. Admin tidak wajib membalas.
    *   Disimpan dengan status `read_only`.

### 2. Logika Subjek (Subject Logic)

Sistem mengenali dua skenario untuk kolom Subject:

*   **Skenario 1: Ada Subjek**
    *   Pengunjung mengetik Subjek sendiri.
    *   Sistem menggunakan subjek yang diketik pengunjung tersebut dalam pengiriman email dan penyimpanan database.

*   **Skenario 2: Tanpa Subjek**
    *   Pengunjung mengosongkan kolom Subject.
    *   Sistem otomatis mengisi dengan **Subjek Default Seragam**.
    *   Contoh Default: `"Pesan dari Website"` atau `"Web Inquiry"`.
    *   Subjek default ini dikirim bersama isi pesan untuk konsistensi.

### 3. Prioritas Validasi

Untuk menjaga kualitas pesan, validasi dibuat bertingkat:

1.  **Field Wajib (Mandatory):** **Isi Pesan (Body/Message)**.
    *   Pesan **TIDAK BOLEH** dikirim jika kolom ini kosong, meskipun Email, Nama, dan Subject sudah diisi.
2.  **Field Opsional (Optional):** **Email, Nama, Subject**.
    *   Bisa kosong, pengisian tidak diwajibkan.

---

## 🏗️ Arsitektur Data

### Struktur JSON Data Dikirim

Berikut adalah representasi struktur JSON yang dikirim dari Frontend ke Backend (Supabase):

```json
{
  "name": "Nama Pengunjung",          // Opsional
  "email": "email@example.com",      // Opsional (Penentu Mode)
  "subject": "Subjek Asli",          // Opsional (Ada: Pakai ini / Kosong: Pakai Default)
  "body": "Isi pesan wajib...",      // WAJIB
  "language": "id"                   // Bisa 'id' atau 'en'
}
```

---

## 💻 Frontend Implementation (JavaScript)

### 1. Logika Validasi & Default Subject

Berikut adalah implementasi logika JavaScript untuk menangani validasi wajib dan logika default subject.

```javascript
// Konfigurasi
const DEFAULT_SUBJECT_ID = "Pesan dari Website";
const DEFAULT_SUBJECT_EN = "Message from Website";

// Fungsi Validasi & Proses Submit
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Ambil nilai form
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    let subject = document.getElementById('subject').value;
    const body = document.getElementById('message').value; // Field Wajib
    
    // Deteksi Bahasa (Misal: berdasarkan toggle bahasa UI)
    const currentLang = document.documentElement.lang || 'id'; 

    // --- VALIDASI UTAMA: ISI PESAN ---
    if (!body || body.trim() === "") {
        alert("Mohon isi pesan terlebih dahulu.");
        return; // HENTIKAN PENGIRIMAN
    }

    // --- LOGIKA SUBJEK DEFAULT ---
    // Jika subject kosong, beri nilai default sesuai bahasa
    if (!subject || subject.trim() === "") {
        subject = (currentLang === 'id') ? DEFAULT_SUBJECT_ID : DEFAULT_SUBJECT_EN;
    }

    // --- LOGIKA MODE (BALAS vs BACA SAJA) ---
    // Jika email kosong, tandai sebagai 'read_only'
    const status = (email && email.includes("@")) ? 'pending_reply' : 'read_only';

    // --- PERSIAPAN DATA ---
    const payload = {
        name: name || "Anonim", // Jika nama kosong, beri label Anonim
        email: email || null,   // Jika email kosong, kirim null
        subject: subject,
        body: body,
        status: status,
        created_at: new Date().toISOString()
    };

    // --- KIRIM KE DATABASE (Supabase) ---
    try {
        const { error } = await supabase.from('messages').insert([payload]);

        if (error) throw error;

        alert("Pesan terkirim!");
        document.getElementById('contactForm').reset();

        // Opsional: Jika ada email, kirim notifikasi via Resend (Logic terpisah)
        if (email) {
            // Panggil fungsi sendNotificationEmail(payload);
        }

    } catch (err) {
        console.error("Error:", err);
        alert("Gagal mengirim pesan.");
    }
});
```

---

### 2. UI Bilingual (Indonesia & Inggris)

Terdapat dua pendekatan untuk menangani UI Bahasa. Pilih yang sesuai dengan struktur HTML kamu.

#### Pendekatan A: Satu Form dengan Toggle Bahasa (JavaScript)
HTML Form memiliki atribut `data-lang-id` dan `data-lang-en`.

```html
<!-- Toggle Bahasa -->
<button onclick="setLang('id')">Indonesia</button>
<button onclick="setLang('en')">English</button>

<!-- Form Input -->
<input type="text" id="name" 
       placeholder="Nama Anda" 
       data-placeholder-id="Nama Anda" 
       data-placeholder-en="Your Name">

<textarea id="message" 
          placeholder="Tulis pesan Anda..." 
          data-placeholder-id="Tulis pesan Anda..." 
          data-placeholder-en="Write your message..."></textarea>

<script>
function setLang(lang) {
    const elements = document.querySelectorAll('[data-placeholder-id]');
    elements.forEach(el => {
        el.placeholder = el.getAttribute(`data-placeholder-${lang}`);
    });
}
</script>
```

#### Pendekatan B: Dua Section Terpisah (HTML)
Kamu membuat dua div terpisah yang hanya satu yang ditampilkan.

```html
<!-- Section Bahasa Indonesia -->
<div id="contact-id" class="active">
    <h2>Hubungi Saya</h2>
    <input type="email" placeholder="Email Anda (Opsional)">
</div>

<!-- Section Bahasa Inggris -->
<div id="contact-en" style="display:none;">
    <h2>Contact Me</h2>
    <input type="email" placeholder="Your Email (Optional)">
</div>

<script>
// Logika toggle sederhana
function switchLanguage(lang) {
    if (lang === 'id') {
        document.getElementById('contact-id').style.display = 'block';
        document.getElementById('contact-en').style.display = 'none';
    } else {
        document.getElementById('contact-id').style.display = 'none';
        document.getElementById('contact-en').style.display = 'block';
    }
}
</script>
```

---

## 📊 Alur Data (Data Flow)

1.  **Pengunjung Isi Form:**
    *   Membuka halaman Kontak (bisa memilih bahasa ID/EN).
    *   Mengisi Nama (Opsional).
    *   Mengisi Email (Opsional).
    *   Mengisi Subject (Opsional).
    *   Mengisi **Isi Pesan** (Wajib).

2.  **Klik Kirim (Frontend Logic):**
    *   JS cek: Apakah `message` kosong? -> **Ya:** Tampilkan error "Isi pesan wajib".
    *   JS cek: Apakah `subject` kosong? -> **Ya:** Ganti menjadi Default Subject ("Pesan dari Website").
    *   JS cek: Apakah `email` kosong? -> **Ya:** Set status `read_only`. **Tidak:** Set status `pending_reply`.
    *   Data dikirim ke Supabase.

3.  **Di Database (Supabase):**
    *   Tabel `messages` menerima data.
    *   Jika `email` terisi: Admin nanti bisa balas via sistem Reply Tool.
    *   Jika `email` kosong: Admin hanya membaca pesan di Dashboard.

---

### 3. email tanp subject/ subject seragam 
// SET DEFAULT SUBJECT DISINI
const DEFAULT_SUBJECT_ID = "Pertanyaan Terkait Portofolio";
const DEFAULT_SUBJECT_EN = "Portfolio Inquiry";

// Atau kalau mau yang simpel:
// const DEFAULT_SUBJECT_ID = "Pesan dari Website";
// const DEFAULT_SUBJECT_EN = "Message from Website";'

### 4. SQL supabase yang telah dibuat 
-- Membuat tabel 'messages'
CREATE TABLE messages (
  id bigint generated by default as identity primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text not null,
  subject text,
  body text not null,
  status text default 'unread',
  original_message_id text, -- Penting untuk Email Threading (Resend)
  thread_id text
);

-- Komentar: Tabel ini akan menyimpan semua data dari form kontak nantinya.

## ✅ Checklist Validasi Akhir

Sebelum meng-deploy ke produksi, pastikan skenario berikut sudah berjalan:

- [ ] [Validasi] Form menolak pengiriman jika kolom "Isi Pesan" kosong, meskipun Nama/Email diisi.
-   [ ] [Subjek Default] Jika kolom Subject dikosongkan, di Supabase nilainya menjadi "Pesan dari Website".
-   [ ] [Subjek Custom] Jika kolom Subject diisi, di Supabase nilainya sesuai ketikan user.
-   [ ] [Mode Tanpa Email] User mengirim pesan tanpa email -> Status menjadi `read_only`.
-   [ ] [Mode Dengan Email] User mengirim pesan dengan email -> Status menjadi `pending_reply`.
-   [ ] [Bilingual] Placeholder form berubah sesuai tombol bahasa yang dipilih.


