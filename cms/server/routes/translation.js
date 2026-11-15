/**
 * Translation API Routes
 * Endpoints: POST /translate, /translate-hybrid, /translate-smartai
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { translationQueue } from '../services/translationQueue.js';
import { detectLanguageGoogle, translateGoogle } from '../utils/googleTranslate.js';
import { callOpenRouterLLM, getSystemPrompt, cleanLLMResponse } from '../utils/openRouterLLM.js';
import { callOllamaLLM, isOllamaAvailable } from '../utils/ollamaLLM.js';
import {
  parseAIResponse,
  validateTranslationResult,
  sanitizeTranslationContent,
  getTargetLanguage,
  isMixedLanguageContent,
  logTranslationEvent,
} from '../utils/translationHelpers.js';
import { supabase } from '../config/supabase.js';
import {
  RICH_HTML_MARKER, isRichHtml, protectRichHtml, restoreRichHtml, segmentRichHtml, rebuildRichHtml,
  isValidSegmentArray, parseJsonArray, SEGMENT_RULE,
} from '../utils/richHtml.js';
import { ObjectId } from 'mongodb';

// Heuristics-based language detector for plain strings
function detectPlainStringLanguage(str) {
  if (!str || typeof str !== 'string') return 'id'; // default to id
  
  const text = str.toLowerCase();
  
  // English common words (expanded list including common technical, academic, and personal terms)
  const enWords = [
    'the', 'and', 'of', 'in', 'to', 'for', 'with', 'is', 'it', 'this', 'that', 'my', 
    'project', 'writing', 'book', 'about', 'biomedical', 'engineering', 'student', 
    'hello', 'world', 'are', 'be', 'at', 'by', 'an', 'have', 'from', 'or', 'but', 
    'not', 'your', 'first', 'which', 'would', 'there', 'their', 'who', 'more', 
    'will', 'can', 'one', 'all', 'been', 'has', 'use', 'using', 'system', 'research',
    'medical', 'science', 'patient', 'life', 'heart', 'signals', 'clinical', 'device',
    'experience', 'reflection', 'reflections', 'faith', 'prayer', 'silence', 'god',
    'laboratory', 'lab', 'imaging', 'processing', 'analysis', 'data', 'design', 'development'
  ];
  
  // Indonesian common words (expanded list including common technical, academic, and personal terms)
  const idWords = [
    'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'saya', 'adalah', 
    'ini', 'itu', 'proyek', 'tulisan', 'buku', 'tentang', 'teknik', 'mahasiswa', 
    'halo', 'dunia', 'kami', 'mereka', 'kita', 'anda', 'tidak', 'bisa', 'ada', 
    'akan', 'bukan', 'sebagai', 'oleh', 'atau', 'tetapi', 'juga', 'telah', 'sudah', 
    'dalam', 'sistem', 'menggunakan', 'penelitian', 'medis', 'pasien', 'hidup', 
    'jantung', 'sinyal', 'alat', 'perangkat', 'pengalaman', 'refleksi', 'iman', 
    'doa', 'keheningan', 'tuhan', 'laboratorium', 'pencitraan', 'pemrosesan', 
    'analisis', 'data', 'desain', 'pengembangan'
  ];
  
  let enCount = 0;
  let idCount = 0;
  
  // Tokenize
  const tokens = text.match(/\b\w+\b/g) || [];
  for (const token of tokens) {
    if (enWords.includes(token)) enCount++;
    if (idWords.includes(token)) idCount++;
  }
  
  if (enCount > idCount) return 'en';
  if (idCount > enCount) return 'id';
  
  return 'id'; // Default to Indonesian
}

// Extract fenced code blocks and markdown images into unique placeholders
function extractPlaceholders(text) {
  if (!text || typeof text !== 'string') return { text, placeholders: [] };

  const placeholders = [];
  let index = 0;
  let processedText = text;

  // 1. Extract fenced code blocks: ```...```
  const codeBlockRegex = /```[\s\S]*?```/g;
  processedText = processedText.replace(codeBlockRegex, (match) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${index}__`;
    placeholders.push({ placeholder, original: match });
    index++;
    return placeholder;
  });

  // 2. Extract markdown images: ![alt](url)
  const imageRegex = /!\[.*?\]\(.*?\)/g;
  processedText = processedText.replace(imageRegex, (match) => {
    const placeholder = `__IMAGE_PLACEHOLDER_${index}__`;
    placeholders.push({ placeholder, original: match });
    index++;
    return placeholder;
  });

  return { text: processedText, placeholders };
}

// ---------------------------------------------------------------------------
// Konten rich (HTML dari editor ribbon) — lihat utils/richHtml.js.
// Struktur HTML tidak pernah diserahkan ke AI; hanya potongan teksnya.
// ---------------------------------------------------------------------------

/** Google Translate mode html: tag dijaga Google, blok terlindungi dikembalikan utuh. */
async function translateRichWithGoogle(sourceText, tgtLang) {
  const { html, keeps } = protectRichHtml(sourceText);
  const translated = await translateGoogle(html, tgtLang, '', 'html');
  const restored = restoreRichHtml(translated, keeps);
  if (restored.missing.length) {
    throw new Error('Google Translate mengubah struktur konten (blok kode/rumus/gambar hilang); terjemahan dibatalkan agar konten tidak rusak');
  }
  return RICH_HTML_MARKER + restored.html;
}

/** Jalankan satu permintaan teks ke model (OpenRouter / Ollama) lewat antrean fallback. */
function runLLM(key, button, userPrompt, systemPrompt) {
  return translationQueue.executeWithFallback(key, button, async (modelId) => (
    modelId.includes('ollama')
      ? callOllamaLLM(userPrompt, systemPrompt, modelId)
      : callOpenRouterLLM(userPrompt, systemPrompt, modelId)
  ));
}

/**
 * Hybrid: haluskan hasil Google per potongan teks. Bila model gagal atau jumlah
 * potongannya tidak cocok, hasil Google dipakai apa adanya (tetap utuh & benar).
 */
async function polishRichSegments(richTranslated, tgtLang, key) {
  const { html, keeps } = protectRichHtml(richTranslated);
  const seg = segmentRichHtml(html);
  if (!seg.texts.length) return richTranslated;
  const language = tgtLang === 'id' ? 'Indonesian' : 'English';
  const systemPrompt = `You polish machine-translated ${language} text written by Alphonsus, a biomedical engineering student, so it reads naturally and keeps his warm, personal voice.
The input is a JSON array of text segments taken, in order, from one formatted document.
Return ONLY a JSON array with EXACTLY ${seg.texts.length} strings, in the same order. Never merge, split, drop, or add elements. Do not add HTML or Markdown. Keep the meaning and technical terms.`;
  const result = await runLLM(key, 'button-hybrid', JSON.stringify(seg.texts), systemPrompt);
  if (!result.success) return richTranslated;
  const arr = parseJsonArray(result.result);
  if (!isValidSegmentArray(arr, seg.texts.length)) {
    console.warn(`[translation] Polish rich dilewati: model mengembalikan ${Array.isArray(arr) ? arr.length : 'bukan array'} dari ${seg.texts.length} potongan`);
    return richTranslated;
  }
  const restored = restoreRichHtml(rebuildRichHtml(seg, arr), keeps);
  return restored.missing.length ? richTranslated : RICH_HTML_MARKER + restored.html;
}

// Restore placeholders in text
function restorePlaceholders(text, placeholders) {
  if (!text || typeof text !== 'string') return text;

  let restoredText = text;
  
  // Restore placeholders by replacement
  for (const { placeholder, original } of placeholders) {
    // Escape string for RegExp pattern
    const escapedPlaceholder = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Also support variations that Google Translate might introduce (like spaces inside underscores or casing differences)
    const cleanPattern = escapedPlaceholder.replace(/_/g, '\\s*_*\\s*');
    const regex = new RegExp(cleanPattern, 'gi');
    restoredText = restoredText.replace(regex, original);
  }

  // Fallback direct string replacement to ensure no placeholders are missed
  for (const { placeholder, original } of placeholders) {
    if (restoredText.includes(placeholder)) {
      restoredText = restoredText.replaceAll(placeholder, original);
    }
  }

  return restoredText;
}

export default function createTranslationRoutes(db) {
  const router = express.Router();

  /**
   * Helper: Get content from database
   */
  async function getContent(contentType, postId) {
    const mongoCollectionMap = {
      writing: 'writings',
      project: 'projects',
      book: 'books',
    };

    const collection = mongoCollectionMap[contentType];
    if (!collection) throw new Error(`Invalid content type: ${contentType}`);

    // SUMBER KEBENARAN: MongoDB, untuk SEMUA jenis konten (writings juga).
    // Dulu writings dibaca dari Supabase lebih dulu. Hasil terjemahan disimpan sebagai
    // objek utuh { <bahasa sumber>, <bahasa target> } yang dibangun dari dokumen yang dibaca,
    // jadi salinan Supabase yang tertinggal sedikit saja akan MENIMPA teks sumber terbaru
    // di Mongo. Supabase hanya cadangan tulis (lihat utils/dataSync.js), tidak pernah dibaca.
    const orConditions = [{ id: postId }, { _id: postId }];
    try {
      orConditions.push({ _id: new ObjectId(postId) });
    } catch {}
    const doc = await db.collection(collection).findOne({ $or: orConditions });
    if (!doc) throw new Error(`Content not found: ${contentType}/${postId}`);
    return doc;
  }

  /**
   * Helper: Resolve LocalizedText to plain string
   * Handles both plain strings and { en: '...', id: '...' } objects
   */
  function resolveText(field, preferLang = 'id') {
    if (!field) return '';
    
    let parsedField = field;
    if (typeof field === 'string') {
      try {
        parsedField = JSON.parse(field);
      } catch (e) {
        return field; // Return as plain string if it's not valid JSON
      }
    }
    
    if (typeof parsedField === 'object' && parsedField !== null) {
      return parsedField[preferLang] || parsedField.en || parsedField.id || Object.values(parsedField).find(Boolean) || '';
    }
    
    return String(parsedField);
  }

  /**
   * Helper: Get translatable fields map for content type
   */
  function getTranslatableFields(contentType) {
    if (contentType === 'writing') {
      return {
        localized: ['title', 'content', 'excerpt'],
        plain: ['metaTitle', 'metaDescription', 'keywords'],
      };
    } else if (contentType === 'project') {
      return {
        localized: ['title', 'description', 'content'],
        plain: ['metaTitle', 'metaDescription', 'keywords'],
      };
    } else if (contentType === 'book') {
      return {
        localized: ['title', 'author', 'review'],
        plain: ['metaTitle', 'metaDescription', 'keywords'],
      };
    }
    return { localized: [], plain: [] };
  }

  /**
   * Helper: Determine Translation Direction and Select Source Texts
   * Automatically detects EN -> ID scenario, otherwise defaults to ID -> EN
   */
  async function determineTranslationDirection(doc, contentType, currentLanguage) {
    // 1. Helper to detect the language of a text block (runs Google API detection, falls back to heuristic)
    async function detectTextLanguage(text) {
      if (!text || text.trim().length === 0) {
        return 'en'; // default fallback
      }
      try {
        const res = await detectLanguageGoogle(text);
        if (res && (res.language === 'en' || res.language === 'id')) {
          return res.language;
        }
      } catch (err) {
        // Fall back to heuristic
      }
      return detectPlainStringLanguage(text);
    }

    // 2. Safe field parser that performs language detection for plain strings (legacy/untranslated data)
    const parseField = async (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          const detected = await detectTextLanguage(val);
          return { [detected]: val };
        }
      }
      return val || {};
    };

    // Parse localized fields from database dynamically
    const titleObj = await parseField(doc.title);
    let contentObj = {};
    if (contentType === 'writing') {
      contentObj = await parseField(doc.content);
    } else if (contentType === 'project') {
      contentObj = await parseField(doc.content || doc.description);
    } else if (contentType === 'book') {
      contentObj = await parseField(doc.review);
    }

    const titleEn = (titleObj.en || '').trim();
    const titleId = (titleObj.id || '').trim();
    const contentEn = (contentObj.en || '').trim();
    const contentId = (contentObj.id || '').trim();

    const hasEn = !!(titleEn || contentEn);
    const hasId = !!(titleId || contentId);

    // Check if the content is duplicated (indicating legacy/duplicate fallback state)
    const isTitleDuplicate = titleEn && titleId && titleEn === titleId;
    const isContentDuplicate = contentEn && contentId && contentEn === contentId;
    const isDuplicate = (isTitleDuplicate && (!contentEn || !contentId || isContentDuplicate)) ||
                        (isContentDuplicate && (!titleEn || !titleId || isTitleDuplicate));

    // Default fallback based on active editor tab if we can't decide otherwise
    let tgtLang = currentLanguage === 'en' ? 'en' : 'id';
    let srcLang = tgtLang === 'en' ? 'id' : 'en';

    if (hasId && !hasEn) {
      // Only Indonesian has content -> Translate to English (overrides any lock)
      srcLang = 'id';
      tgtLang = 'en';
    } else if (hasEn && !hasId) {
      // Only English has content -> Translate to Indonesian (overrides any lock)
      srcLang = 'en';
      tgtLang = 'id';
    } else if (isDuplicate) {
      // Both tabs are identical -> Detect language of content, translate to the opposite language
      const sampleText = titleEn || contentEn || '';
      const detected = await detectTextLanguage(sampleText);
      srcLang = detected;
      tgtLang = detected === 'en' ? 'id' : 'en';
    } else if (doc.translationMetadata && doc.translationMetadata.language) {
      // Both tabs contain content, but we have a lock/record of the target language from a past translation!
      tgtLang = doc.translationMetadata.language;
      srcLang = tgtLang === 'en' ? 'id' : 'en';
    }

    return {
      srcLang,
      tgtLang,
      sourceTitle: resolveText(doc.title, srcLang),
      sourceContent: resolveText(doc.content || doc.review || doc.description, srcLang),
    };
  }

  /**
   * Helper: Save translation result
   */
  async function saveTranslationDirect(contentType, postId, doc, setObj) {
    const mongoCollectionMap = {
      writing: 'writings',
      project: 'projects',
      book: 'books',
    };
    const supabaseTableMap = {
      writing: 'artikel',
      project: 'projects',
      book: 'books',
    };

    const collection = mongoCollectionMap[contentType];
    const table = supabaseTableMap[contentType];
    const now = new Date();

    // 1. Update MongoDB (always safe because we use $set to only update translated/meta fields)
    const mongoSetObj = { ...setObj };
    if (mongoSetObj.translationMetadata) {
      mongoSetObj.translationMetadata = {
        ...mongoSetObj.translationMetadata,
        timestamp: now,
      };
    }
    mongoSetObj.updatedAt = now;

    // Hanya tulis bahasa TARGET (mis. content.en), jangan seluruh objek { id, en }.
    // Terjemahan LLM bisa makan belasan detik; kalau selama itu pengguna terus mengetik
    // dan autosave menyimpan, menulis objek utuh akan menimpa ketikan terbaru di bahasa
    // sumber dengan salinan lama. Field yang masih berupa string (data lama) tidak bisa
    // diberi path bertitik, jadi untuk itu tetap ditulis utuh.
    const tgtLang = setObj.translationMetadata?.language;
    if (tgtLang === 'en' || tgtLang === 'id') {
      for (const field of ['title', 'excerpt', 'content', 'description', 'review', 'author']) {
        const value = mongoSetObj[field];
        const stored = doc[field];
        if (value && typeof value === 'object' && stored && typeof stored === 'object' && !Array.isArray(stored)) {
          mongoSetObj[`${field}.${tgtLang}`] = value[tgtLang];
          delete mongoSetObj[field];
        }
      }
    }

    const orConditions = [{ id: doc.id || postId }, { _id: postId }];
    try {
      orConditions.push({ _id: new ObjectId(postId) });
    } catch {}
    
    await db.collection(collection).updateOne(
      { $or: orConditions },
      { $set: mongoSetObj }
    );

    // 2. Synchronize to Supabase if configured (for ALL content types: writing, project, and book)
    if (supabase) {
      try {
        // Construct the full updated document to prevent partial upsert overwriting other columns
        const fullUpdatedDoc = { ...doc, ...setObj };
        
        fullUpdatedDoc.updatedAt = now.toISOString();

        const cleaned = { ...fullUpdatedDoc };
        
        // Strip MongoDB internal _id and other unsynced fields
        delete cleaned._id;
        delete cleaned.translationOfId;
        delete cleaned.contentLanguage;
        
        // Strip metadata fields that are not part of the Supabase schema
        delete cleaned.translationStatus;
        delete cleaned.translationMetadata;

        // Ensure bilingual fields are stringified JSON before upserting if necessary
        const jsonFields = ['title', 'excerpt', 'content', 'description', 'review'];
        for (const field of jsonFields) {
          if (cleaned[field] && typeof cleaned[field] === 'object') {
            cleaned[field] = JSON.stringify(cleaned[field]);
          }
        }

        // Upsert to Supabase with conflict resolution on 'id' (slug field)
        const { error } = await supabase
          .from(table)
          .upsert(cleaned, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (error) throw error;
        console.log(`[translation] Supabase translation sync success for ${contentType}/${postId}`);
      } catch (err) {
        console.warn(
          `[translation] Supabase translation sync failed for ${contentType}/${postId}: ${err.message}`
        );
      }
    }
  }

  /**
   * POST /api/translate
   * Button 1: Fast translation using Google Translate only
   */
  /**
   * Helper: Parse safe JSON
   */
  const safeParse = (val, tgtLang) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        const srcLang = tgtLang === 'en' ? 'id' : 'en';
        return { [srcLang]: val };
      }
    }
    return val || {};
  };

  /**
   * Helper: Clean Google Translate's scrambled markdown syntax
   */
  const sanitizeTranslatedMarkdown = (text) => {
    if (!text) return '';
    return text
      // Decode HTML entities that may be returned by Google Translate
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      // Fix spaces inside link syntax: [ text ] ( url ) -> [text](url)
      .replace(/\[\s*([^\]]+?)\s*\]\s*\(\s*([^)]+?)\s*\)/g, '[$1]($2)')
      // Fix scrambled URLs with spaces: http : / / -> http://
      .replace(/(https?)\s*:\s*\/\s*\/\s*/gi, '$1://')
      // Fix image syntax: ! [ alt ] ( url ) -> ![alt](url)
      .replace(/!\s*\[\s*([^\]]+?)\s*\]\s*\(\s*([^)]+?)\s*\)/g, '![$1]($2)')
      // Fix spaces around bold markdown: ** text ** -> **text**
      .replace(/\*\*\s*([^*]+?)\s*\*\*/g, '**$1**')
      // Fix spaces around italic markdown: * text * -> *text*
      .replace(/\*\s*([^*]+?)\s*\*/g, '*$1*')
      // Fix spaces around inline code: ` text ` -> `text`
      .replace(/`\s*([^`]+?)\s*`/g, '`$1`');
  };

  /**
   * POST /api/translate
   * Button 1: Fast translation using Google Translate only
   */
  router.post('/translate', authMiddleware, async (req, res) => {
    const startTime = Date.now();

    try {
      const { postId, contentType, currentLanguage } = req.body;

      if (!postId || !contentType) {
        return res.status(400).json({ error: 'postId and contentType required' });
      }

      if (!translationQueue.checkRateLimit(req.userId)) {
        const status = translationQueue.getRateLimitStatus(req.userId);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: status.resetIn,
        });
      }

      const doc = await getContent(contentType, postId);
      const { srcLang, tgtLang } = await determineTranslationDirection(doc, contentType, currentLanguage);
      const fields = getTranslatableFields(contentType);

      const responseData = {
        success: true,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        method: 'google_translate',
        translations: {},
      };

      const setObj = {
        translationStatus: 'completed',
        translationMetadata: {
          method: 'google_translate',
          language: tgtLang,
          timestamp: new Date().toISOString(),
        },
        contentLanguage: 'bilingual',
        updatedAt: new Date().toISOString(),
      };

      // Translate localized fields
      for (const field of fields.localized) {
        const sourceText = resolveText(doc[field], srcLang);
        if (sourceText && sourceText.trim()) {
          let translatedText;
          if (isRichHtml(sourceText)) {
            translatedText = await translateRichWithGoogle(sourceText, tgtLang);
          } else {
            const { text: protectedText, placeholders } = extractPlaceholders(sourceText);
            const rawTranslated = await translateGoogle(protectedText, tgtLang);
            translatedText = restorePlaceholders(sanitizeTranslatedMarkdown(rawTranslated), placeholders);
          }

          const currentObj = safeParse(doc[field], tgtLang);
          currentObj[tgtLang] = translatedText;
          setObj[field] = currentObj;
          responseData.translations[field] = translatedText;
        }
      }

      // Translate plain SEO fields
      for (const field of fields.plain) {
        const sourceText = doc[field];
        if (sourceText && typeof sourceText === 'string' && sourceText.trim()) {
          const rawTranslated = await translateGoogle(sourceText, tgtLang);
          const translatedText = sanitizeTranslatedMarkdown(rawTranslated);
          setObj[field] = translatedText;
          responseData.translations[field] = translatedText;
        }
      }

      // For backward compatibility mapping
      if (contentType === 'writing') {
        responseData.title = responseData.translations.title;
        responseData.content = responseData.translations.content;
      } else if (contentType === 'project') {
        responseData.title = responseData.translations.title;
        responseData.content = responseData.translations.description;
      } else if (contentType === 'book') {
        responseData.title = responseData.translations.title;
        responseData.content = responseData.translations.review;
      }

      await saveTranslationDirect(contentType, postId, doc, setObj);

      logTranslationEvent({
        action: 'translate',
        postId,
        model: 'google',
        status: 'success',
        duration: Date.now() - startTime,
      });

      responseData.duration = Date.now() - startTime;
      res.json(responseData);
    } catch (error) {
      logTranslationEvent({
        action: 'translate',
        postId: req.body.postId,
        model: 'google',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
      });
      res.status(500).json({ error: error.message || 'Translation failed' });
    }
  });

  /**
   * POST /api/translate-hybrid
   * Button 2: Google Translate + AI Polish
   */
  router.post('/translate-hybrid', authMiddleware, async (req, res) => {
    const startTime = Date.now();

    try {
      const { postId, contentType, currentLanguage } = req.body;

      if (!postId || !contentType) {
        return res.status(400).json({ error: 'postId and contentType required' });
      }

      if (!translationQueue.checkRateLimit(req.userId)) {
        const status = translationQueue.getRateLimitStatus(req.userId);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: status.resetIn,
        });
      }

      const doc = await getContent(contentType, postId);
      const { srcLang, tgtLang } = await determineTranslationDirection(doc, contentType, currentLanguage);
      const fields = getTranslatableFields(contentType);

      const responseData = {
        success: true,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        method: 'hybrid_google_ai',
        translations: {},
      };

      const setObj = {
        translationStatus: 'completed',
        translationMetadata: {
          method: 'hybrid_google_ai',
          language: tgtLang,
          timestamp: new Date().toISOString(),
        },
        contentLanguage: 'bilingual',
        updatedAt: new Date().toISOString(),
      };

      // Translate & AI polish localized fields
      for (const field of fields.localized) {
        const sourceText = resolveText(doc[field], srcLang);
        if (sourceText && sourceText.trim()) {
          let translatedText;
          if (isRichHtml(sourceText)) {
            // Google (struktur aman) → haluskan per potongan teks; tag tidak pernah ke AI.
            const googleRich = await translateRichWithGoogle(sourceText, tgtLang);
            translatedText = await polishRichSegments(googleRich, tgtLang, `${postId}:hybrid:polish-${field}`);
          } else {
            const { text: protectedText, placeholders } = extractPlaceholders(sourceText);
            const rawTranslated = await translateGoogle(protectedText, tgtLang);
            const rawSanitized = sanitizeTranslatedMarkdown(rawTranslated);
            let polishedText = rawSanitized;

            if (rawSanitized.trim().length > 0 && field !== 'title') {
              const promptText = `<text_to_polish>${rawSanitized}</text_to_polish>`;
              const polishResult = await runLLM(`${postId}:hybrid:polish-${field}`, 'button-hybrid', promptText, getSystemPrompt('polish', tgtLang));
              if (polishResult.success) {
                polishedText = cleanLLMResponse(polishResult.result);
              }
            }
            translatedText = restorePlaceholders(polishedText, placeholders);
          }

          const currentObj = safeParse(doc[field], tgtLang);
          currentObj[tgtLang] = translatedText;
          setObj[field] = currentObj;
          responseData.translations[field] = translatedText;
        }
      }

      // Translate plain SEO fields
      for (const field of fields.plain) {
        const sourceText = doc[field];
        if (sourceText && typeof sourceText === 'string' && sourceText.trim()) {
          const rawTranslated = await translateGoogle(sourceText, tgtLang);
          const rawSanitized = sanitizeTranslatedMarkdown(rawTranslated);
          setObj[field] = rawSanitized;
          responseData.translations[field] = rawSanitized;
        }
      }

      // Backward compatibility mapping
      if (contentType === 'writing') {
        responseData.title = responseData.translations.title;
        responseData.content = responseData.translations.content;
      } else if (contentType === 'project') {
        responseData.title = responseData.translations.title;
        responseData.content = responseData.translations.description;
      } else if (contentType === 'book') {
        responseData.title = responseData.translations.title;
        responseData.content = responseData.translations.review;
      }

      await saveTranslationDirect(contentType, postId, doc, setObj);

      logTranslationEvent({
        action: 'translate-hybrid',
        postId,
        model: 'google+ai',
        status: 'success',
        duration: Date.now() - startTime,
      });

      responseData.duration = Date.now() - startTime;
      res.json(responseData);
    } catch (error) {
      logTranslationEvent({
        action: 'translate-hybrid',
        postId: req.body.postId,
        model: 'google+ai',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
      });
      res.status(500).json({ error: error.message || 'Hybrid translation failed' });
    }
  });

  /**
   * POST /api/translate-smartai
   * Button 3: Full AI JSON Translation with 100% Context
   */
  async function handleSmartAI(req, res) {
    const startTime = Date.now();

    try {
      const { postId, contentType, currentLanguage } = req.body;

      if (!postId || !contentType) {
        return res.status(400).json({ error: 'postId and contentType required' });
      }

      if (!translationQueue.checkRateLimit(req.userId)) {
        const status = translationQueue.getRateLimitStatus(req.userId);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: status.resetIn,
        });
      }

      const doc = await getContent(contentType, postId);
      const { srcLang, tgtLang } = await determineTranslationDirection(doc, contentType, currentLanguage);
      const fields = getTranslatableFields(contentType);

      // Build JSON to translate and extract placeholders
      const sourceJson = {};
      const allPlaceholders = {};
      const richState = {}; // field → { seg, keeps } untuk konten rich (HTML)
      for (const field of fields.localized) {
        const textVal = resolveText(doc[field], srcLang);
        if (textVal && textVal.trim()) {
          if (isRichHtml(textVal)) {
            // Konten rich: kirim HANYA potongan teks (array), struktur HTML disimpan di sini.
            const { html, keeps } = protectRichHtml(textVal);
            const seg = segmentRichHtml(html);
            if (!seg.texts.length) continue;
            sourceJson[field] = seg.texts;
            richState[field] = { seg, keeps };
          } else {
            const { text: protectedText, placeholders } = extractPlaceholders(textVal);
            sourceJson[field] = protectedText;
            allPlaceholders[field] = placeholders;
          }
        }
      }
      for (const field of fields.plain) {
        const textVal = doc[field];
        if (textVal && typeof textVal === 'string' && textVal.trim()) {
          sourceJson[field] = textVal;
        }
      }

      if (Object.keys(sourceJson).length === 0) {
        return res.status(400).json({ error: 'No content to translate' });
      }

      const langMap = { en: 'English', id: 'Indonesian' };
      const resolvedLang = langMap[tgtLang] || tgtLang;

      const systemPrompt = `You are the personal translator for Alphonsus, a biomedical engineering student.
Your task is to translate the values of the provided JSON object to ${resolvedLang}.

RULES:
1. Translate only the JSON values into natural, fluid ${resolvedLang}. Do not change the JSON keys.
2. Preserve Alphonsus's warm, personal, conversational engineering student voice. Keep biomedical terms accurate.
3. Keep all Markdown formatting (headings, lists, bold, italics, links, and code blocks) exactly preserved.
4. Return ONLY the final translated JSON. Do not wrap in markdown blocks like \`\`\`json. Do not include intro or explanations.` + (Object.keys(richState).length ? SEGMENT_RULE : '');

      const userPrompt = JSON.stringify(sourceJson);

      // Parse JSON dari jawaban model secara toleran.
      const parseFields = (text) => {
        const fieldsOut = {};
        try {
          let cleaned = text.trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) cleaned = jsonMatch[0];
          else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
          return JSON.parse(cleaned);
        } catch (e) {
          console.warn('[SmartAI] Failed to parse JSON response, falling back to split parsing:', e.message);
          const parsed = parseAIResponse(text);
          if (parsed.title) fieldsOut.title = parsed.title;
          if (parsed.content) {
            if (contentType === 'writing') fieldsOut.content = parsed.content;
            else if (contentType === 'project') fieldsOut.description = parsed.content;
            else if (contentType === 'book') fieldsOut.review = parsed.content;
          }
          return fieldsOut;
        }
      };

      // Konten rich: rakit ulang dari potongan. Model gratis kadang memecah/menggabung
      // potongan (mis. 19 dari 18) — coba ulang dengan pengingat, maksimal 3 kali.
      // Bila tetap tidak valid, TIDAK ADA yang disimpan (lebih baik daripada konten rusak).
      const MAX_ATTEMPTS = Object.keys(richState).length ? 3 : 1;
      let result = null;
      let translatedFields = {};
      let richResults = {};
      let lastProblem = '';
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const reminder = attempt === 1 ? '' : `
IMPORTANT: your previous answer was rejected because ${lastProblem}. Return each array with EXACTLY the required number of elements: ${Object.entries(richState).map(([f, r]) => `"${f}" = ${r.seg.texts.length}`).join(', ')}.`;
        result = await runLLM(`${postId}:smartai`, 'button-smartai', userPrompt, systemPrompt + reminder);
        if (!result.success) {
          return res.status(503).json({
            error: 'All translation models failed',
            message: 'Please try again later',
            details: result.error,
          });
        }
        translatedFields = parseFields(result.result);
        richResults = {};
        lastProblem = '';
        for (const [field, { seg, keeps }] of Object.entries(richState)) {
          const arr = translatedFields[field];
          const restored = isValidSegmentArray(arr, seg.texts.length) ? restoreRichHtml(rebuildRichHtml(seg, arr), keeps) : null;
          if (!restored || restored.missing.length) {
            lastProblem = `"${field}" had ${Array.isArray(arr) ? `${arr.length} elements instead of ${seg.texts.length}` : 'no array'}`;
            break;
          }
          richResults[field] = RICH_HTML_MARKER + restored.html;
        }
        if (!lastProblem) break;
        console.warn(`[SmartAI] Percobaan ${attempt}/${MAX_ATTEMPTS} ditolak: ${lastProblem}`);
      }
      if (lastProblem) {
        return res.status(502).json({
          error: 'Hasil AI tidak lengkap',
          message: 'Model AI berulang kali mengembalikan terjemahan yang tidak lengkap, jadi tidak ada yang disimpan. Coba lagi, atau pakai tombol Translate.',
        });
      }

      const responseData = {
        success: true,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        method: 'smartai',
        model: result.model,
        translations: {},
      };

      const setObj = {
        translationStatus: 'completed',
        translationMetadata: {
          method: 'smartai',
          language: tgtLang,
          timestamp: new Date().toISOString(),
        },
        contentLanguage: 'bilingual',
        updatedAt: new Date().toISOString(),
      };

      // Apply and save localized fields
      for (const field of fields.localized) {
        if (richResults[field] || (translatedFields[field] && !richState[field])) {
          const restoredText = richResults[field] ?? restorePlaceholders(translatedFields[field], allPlaceholders[field] || []);
          const currentObj = safeParse(doc[field], tgtLang);
          currentObj[tgtLang] = restoredText;
          setObj[field] = currentObj;
          responseData.translations[field] = restoredText;
        }
      }

      // Apply and save plain SEO fields
      for (const field of fields.plain) {
        if (translatedFields[field]) {
          setObj[field] = translatedFields[field];
          responseData.translations[field] = translatedFields[field];
        }
      }

      // Backward compatibility mapping
      if (contentType === 'writing') {
        responseData.title = responseData.translations.title;
        responseData.content = responseData.translations.content;
      } else if (contentType === 'project') {
        responseData.title = responseData.translations.title;
        responseData.content = responseData.translations.description;
      } else if (contentType === 'book') {
        responseData.title = responseData.translations.title;
        responseData.content = responseData.translations.review;
      }

      await saveTranslationDirect(contentType, postId, doc, setObj);

      logTranslationEvent({
        action: 'translate_smartai',
        postId,
        model: result.model,
        status: 'success',
        duration: Date.now() - startTime,
      });

      responseData.duration = Date.now() - startTime;
      res.json(responseData);
    } catch (error) {
      logTranslationEvent({
        action: 'translate_smartai',
        postId: req.body.postId,
        model: 'unknown',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
      });
      res.status(500).json({ error: error.message || 'Smart AI translation failed' });
    }
  }

  // Attach SmartAI handler as route
  router.post('/translate-smartai', authMiddleware, handleSmartAI);

  return router;
}
