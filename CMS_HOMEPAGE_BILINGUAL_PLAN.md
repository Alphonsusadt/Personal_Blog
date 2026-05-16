# CMS Homepage Bilingual Split Plan

## Tujuan
- Pisahkan konten homepage CMS agar English dan Indonesia terlihat sebagai dua versi yang berbeda, bukan dicampur dalam satu input tunggal.
- Pertahankan kompatibilitas dengan data lama yang masih berupa string tunggal.
- Biarkan public homepage tetap merender sesuai bahasa aktif.

## Langkah
1. Audit `HomeManager` untuk bagian yang masih memakai toggle satu bahasa.
2. Ubah editor homepage supaya field bilingual ditampilkan berdampingan untuk EN dan ID.
3. Pastikan helper normalisasi tetap menerima data lama dan menyimpan object bilingual.
4. Validasi autosave dan load/save homepage agar tidak merusak data yang sudah ada.
5. Jalankan build dan cek error yang tersisa hanya jika memang berasal dari kode lama yang tidak terkait.

## Catatan
- Fokus awal hanya pada homepage CMS dan tampilan public homepage.
- Kalau hasilnya sudah stabil, baru lanjut ke linkage translation untuk konten lain.


