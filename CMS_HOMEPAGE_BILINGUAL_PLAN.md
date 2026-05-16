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

## Fitur Tambahan
Berikut adalah **Master Pseudocode** lengkap yang menggabungkan semua logika yang kita racik sebelumnya. Ini mencakup deteksi bahasa otomatis, pemrosesan 3 tombol (Translate, Hybrid, AI), dan fitur spesifik **Unifikasi Karakter** untuk teks campuran.

Simpan logika ini sebagai referensi utama saat kamu mulai coding.

// =======================================================
// TEMPLATE ALUR KERJA CMS BILINGUAL (ID - EN)
// Versi: Master (Include Hybrid & Character Unification)
// =======================================================

// --- DEPENDENCIES ---
// GoogleTranslateAPI
// OpenRouterAPI
// DatabaseConnection

// =======================================================
// HELPER FUNCTIONS (FUNGSI PENDUKUNG)
// =======================================================

// 1. Mendeteksi bahasa teks
// Return: 'id', 'en', atau 'mixed'
FUNCTION detectLanguage(text):
    result = CALL GoogleTranslateAPI.detect(text)
    
    // Threshold keyakinan (Jika < 70%, dianggap campuran)
    IF result.confidence < 0.7:
        RETURN 'mixed'
    ELSE:
        RETURN result.language

// 2. Menentukan bahasa tujuan
// Return: Kebalikan dari sourceLang
FUNCTION getTargetLanguage(sourceLang):
    IF sourceLang == 'id': RETURN 'en'
    IF sourceLang == 'en': RETURN 'id'
    IF sourceLang == 'mixed': RETURN 'en' // Default ke English

// 3. Parsing hasil AI (Asumsi baris 1 = Title, sisanya = Content)
FUNCTION parseAIResponse(fullText):
    lines = SPLIT_TEXT_BY_NEWLINE(fullText)
    title = TRIM(lines[0])
    content = JOIN(lines[1 TO END], "\n")
    RETURN { title, content }

// 4. Menyimpan ke Database
FUNCTION saveToDB(postId, title, content, targetLang, isRefined):
    data = {}

    IF targetLang == 'en':
        data.title_en = title
        data.content_en = content
        data.is_ai_refined = isRefined
    ELSE:
        // Jika target ID, kita timpa konten asli (sesuai kebutuhan)
        data.title = title
        data.content = content

    data.translation_status = 'completed'
    
    DB.UPDATE('posts', postId, data)

// =======================================================
// MAIN LOGIC (LOGIKA UTAMA PER TOMBOL)
// =======================================================

// -------------------------------------------------------
// BUTTON 1: TRANSLATE (Google Only)
// -------------------------------------------------------
FUNCTION process_TranslateOnly(postId):
    post = DB.FIND(postId)
    text = post.title + " " + post.content

    srcLang = detectLanguage(text)
    tgtLang = getTargetLanguage(srcLang)

    // Proses Terjemahan
    translated = CALL GoogleTranslateAPI.translate(text, tgtLang)
    
    // Simpan
    parsed = parseAIResponse(translated) // Gunakan parser yang sama untuk konsistensi
    saveToDB(postId, parsed.title, parsed.content, tgtLang, isRefined=FALSE)


// -------------------------------------------------------
// BUTTON 2: HYBRID (Google + AI Polish)
// -------------------------------------------------------
FUNCTION process_Hybrid(postId):
    post = DB.FIND(postId)
    text = post.title + " " + post.content
    srcLang = detectLanguage(text)
    tgtLang = getTargetLanguage(srcLang)

    // Jika teks campuran, Hybrid tidak efektif. Delegasi ke Smart AI.
    IF srcLang == 'mixed':
        RETURN process_SmartAI(postId)

    // Step 1: Terjemahan Kasar (Google)
    rawTrans = CALL GoogleTranslateAPI.translate(text, tgtLang)

    // Step 2: Polesan Gaya (AI)
    systemPrompt = "You are an editor. Polish this {tgtLang} text for grammar and natural flow. Do not change meaning."
    
    polishedText = CALL OpenRouterAPI.chat(
        model="mistral-7b",
        system=systemPrompt,
        user=rawTrans
    )

    // Simpan
    parsed = parseAIResponse(polishedText)
    saveToDB(postId, parsed.title, parsed.content, tgtLang, isRefined=TRUE)


// -------------------------------------------------------
// BUTTON 3: SMART AI (Unify Character & Complete)
// -------------------------------------------------------
FUNCTION process_SmartAI(postId):
    post = DB.FIND(postId)
    text = post.title + " " + post.content
    srcLang = detectLanguage(text)
    tgtLang = getTargetLanguage(srcLang)

    systemPrompt = ""

    // LOGIKA KHUSUS UNTUK TEKS CAMPURAN / TIDAK SELESAI
    IF srcLang == 'mixed':
        systemPrompt = """
            CONTEXT: User wrote a draft mixing Indonesian and English. Some sentences might be unfinished.
            
            TASK:
            1. Analyze the 'Voice/Character' of the English part (Tone, Vocabulary, Sentence Structure).
            2. Translate the Indonesian parts into English.
            3. REWRITE the translated parts to MATCH the 'Voice' of the English part exactly (Unification).
            4. COMPLETE any unfinished sentences logically based on context.
            5. Polish grammar for the entire text.
            
            OUTPUT: Final English text only.
        """
        tgtLang = 'en' // Paksa output Inggris
    ELSE:
        // LOGIKA NORMAL (TERJEMAHAN DENGAN PERSONA)
        systemPrompt = """
            Translate this text from {srcLang} to {tgtLang}.
            Maintain the original persona, tone, and writing style.
            Make it sound like a native speaker.
        """

    // Eksekusi AI
    finalText = CALL OpenRouterAPI.chat(
        model="llama-3-8b",
        system=systemPrompt,
        user=text
    )

    // Simpan
    parsed = parseAIResponse(finalText)
    saveToDB(postId, parsed.title, parsed.content, tgtLang, isRefined=TRUE)


// =======================================================
// ROUTER / CONTROLLER ENTRY POINT
// =======================================================
// Fungsi ini dipanggil oleh Frontend saat tombol diklik
FUNCTION handleTranslationRequest(postId, actionType):
    
    TRY:
        SWITCH actionType:
            CASE 'translate':
                process_TranslateOnly(postId)
            
            CASE 'hybrid':
                process_Hybrid(postId)
            
            CASE 'smart_ai':
                process_SmartAI(postId)
            
            DEFAULT:
                THROW ERROR("Invalid Action Type")

        RETURN { status: 'success', message: 'Translation processed successfully' }

    CATCH error:
        RETURN { status: 'error', message: error.toString() }
// =======================================================
// TEMPLATE ALUR KERJA CMS BILINGUAL (ID - EN)
// Versi: Master (Include Hybrid & Character Unification)
// =======================================================

// --- DEPENDENCIES ---
// GoogleTranslateAPI
// OpenRouterAPI
// DatabaseConnection

// =======================================================
// HELPER FUNCTIONS (FUNGSI PENDUKUNG)
// =======================================================

// 1. Mendeteksi bahasa teks
// Return: 'id', 'en', atau 'mixed'
FUNCTION detectLanguage(text):
    result = CALL GoogleTranslateAPI.detect(text)
    
    // Threshold keyakinan (Jika < 70%, dianggap campuran)
    IF result.confidence < 0.7:
        RETURN 'mixed'
    ELSE:
        RETURN result.language

// 2. Menentukan bahasa tujuan
// Return: Kebalikan dari sourceLang
FUNCTION getTargetLanguage(sourceLang):
    IF sourceLang == 'id': RETURN 'en'
    IF sourceLang == 'en': RETURN 'id'
    IF sourceLang == 'mixed': RETURN 'en' // Default ke English

// 3. Parsing hasil AI (Asumsi baris 1 = Title, sisanya = Content)
FUNCTION parseAIResponse(fullText):
    lines = SPLIT_TEXT_BY_NEWLINE(fullText)
    title = TRIM(lines[0])
    content = JOIN(lines[1 TO END], "\n")
    RETURN { title, content }

// 4. Menyimpan ke Database
FUNCTION saveToDB(postId, title, content, targetLang, isRefined):
    data = {}

    IF targetLang == 'en':
        data.title_en = title
        data.content_en = content
        data.is_ai_refined = isRefined
    ELSE:
        // Jika target ID, kita timpa konten asli (sesuai kebutuhan)
        data.title = title
        data.content = content

    data.translation_status = 'completed'
    
    DB.UPDATE('posts', postId, data)

// =======================================================
// MAIN LOGIC (LOGIKA UTAMA PER TOMBOL)
// =======================================================

// -------------------------------------------------------
// BUTTON 1: TRANSLATE (Google Only)
// -------------------------------------------------------
FUNCTION process_TranslateOnly(postId):
    post = DB.FIND(postId)
    text = post.title + " " + post.content

    srcLang = detectLanguage(text)
    tgtLang = getTargetLanguage(srcLang)

    // Proses Terjemahan
    translated = CALL GoogleTranslateAPI.translate(text, tgtLang)
    
    // Simpan
    parsed = parseAIResponse(translated) // Gunakan parser yang sama untuk konsistensi
    saveToDB(postId, parsed.title, parsed.content, tgtLang, isRefined=FALSE)


// -------------------------------------------------------
// BUTTON 2: HYBRID (Google + AI Polish)
// -------------------------------------------------------
FUNCTION process_Hybrid(postId):
    post = DB.FIND(postId)
    text = post.title + " " + post.content
    srcLang = detectLanguage(text)
    tgtLang = getTargetLanguage(srcLang)

    // Jika teks campuran, Hybrid tidak efektif. Delegasi ke Smart AI.
    IF srcLang == 'mixed':
        RETURN process_SmartAI(postId)

    // Step 1: Terjemahan Kasar (Google)
    rawTrans = CALL GoogleTranslateAPI.translate(text, tgtLang)

    // Step 2: Polesan Gaya (AI)
    systemPrompt = "You are an editor. Polish this {tgtLang} text for grammar and natural flow. Do not change meaning."
    
    polishedText = CALL OpenRouterAPI.chat(
        model="mistral-7b",
        system=systemPrompt,
        user=rawTrans
    )

    // Simpan
    parsed = parseAIResponse(polishedText)
    saveToDB(postId, parsed.title, parsed.content, tgtLang, isRefined=TRUE)


// -------------------------------------------------------
// BUTTON 3: SMART AI (Unify Character & Complete)
// -------------------------------------------------------
FUNCTION process_SmartAI(postId):
    post = DB.FIND(postId)
    text = post.title + " " + post.content
    srcLang = detectLanguage(text)
    tgtLang = getTargetLanguage(srcLang)

    systemPrompt = ""

    // LOGIKA KHUSUS UNTUK TEKS CAMPURAN / TIDAK SELESAI
    IF srcLang == 'mixed':
        systemPrompt = """
            CONTEXT: User wrote a draft mixing Indonesian and English. Some sentences might be unfinished.
            
            TASK:
            1. Analyze the 'Voice/Character' of the English part (Tone, Vocabulary, Sentence Structure).
            2. Translate the Indonesian parts into English.
            3. REWRITE the translated parts to MATCH the 'Voice' of the English part exactly (Unification).
            4. COMPLETE any unfinished sentences logically based on context.
            5. Polish grammar for the entire text.
            
            OUTPUT: Final English text only.
        """
        tgtLang = 'en' // Paksa output Inggris
    ELSE:
        // LOGIKA NORMAL (TERJEMAHAN DENGAN PERSONA)
        systemPrompt = """
            Translate this text from {srcLang} to {tgtLang}.
            Maintain the original persona, tone, and writing style.
            Make it sound like a native speaker.
        """

    // Eksekusi AI
    finalText = CALL OpenRouterAPI.chat(
        model="llama-3-8b",
        system=systemPrompt,
        user=text
    )

    // Simpan
    parsed = parseAIResponse(finalText)
    saveToDB(postId, parsed.title, parsed.content, tgtLang, isRefined=TRUE)


// =======================================================
// ROUTER / CONTROLLER ENTRY POINT
// =======================================================
// Fungsi ini dipanggil oleh Frontend saat tombol diklik
FUNCTION handleTranslationRequest(postId, actionType):
    
    TRY:
        SWITCH actionType:
            CASE 'translate':
                process_TranslateOnly(postId)
            
            CASE 'hybrid':
                process_Hybrid(postId)
            
            CASE 'smart_ai':
                process_SmartAI(postId)
            
            DEFAULT:
                THROW ERROR("Invalid Action Type")

        RETURN { status: 'success', message: 'Translation processed successfully' }

    CATCH error:
        RETURN { status: 'error', message: error.toString() }
2

### Ringkasan Alur Kerja Master Ini:

1.  **User menulis apa saja** (ID, EN, Campur, Setengah Jalan).
2.  **User klik salah satu tombol:**
    *   **Translate:** Cepat pakai Google. Jika campur, hasilnya agak acak tapi cepat.
    *   **Hybrid:** Jika teks bersih -> Google + AI Polish. Jika teks campur -> Otomatis jalanin logika **Smart AI**.
    *   **Smart AI:** Selalu pakai AI. Jika teks campur -> AI menganalisis gaya bahasa Inggrismu, lalu menyesuaikan terjemahan bahasa Indonesia supaya **sama karakternya** dan melanjutkan kalimat yang terputus.

terus api key dari openrouter dan google translaaate akan aku berikan git ignore ketika semuannya sudah selesai
