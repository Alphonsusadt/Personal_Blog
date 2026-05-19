/**
 * Translation API Routes
 * Endpoints: POST /translate, /translate-hybrid, /translate-smartai
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { translationQueue } from '../services/translationQueue.js';
import { detectLanguageGoogle, translateGoogle } from '../utils/googleTranslate.js';
import { callOpenRouterLLM, getSystemPrompt } from '../utils/openRouterLLM.js';
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
import { ObjectId } from 'mongodb';

// Heuristics-based language detector for plain strings
function detectPlainStringLanguage(str) {
  if (!str || typeof str !== 'string') return 'id'; // default to id
  
  const text = str.toLowerCase();
  
  // English common words
  const enWords = ['the', 'and', 'of', 'in', 'to', 'for', 'with', 'is', 'it', 'this', 'that', 'my', 'project', 'writing', 'book', 'about', 'biomedical', 'engineering', 'student', 'hello', 'world', 'with'];
  // Indonesian common words
  const idWords = ['yang', 'dan', 'di', 'ke', 'untuk', 'pada', 'dengan', 'saya', 'adalah', 'ini', 'itu', 'proyek', 'tulisan', 'buku', 'tentang', 'teknik', 'mahasiswa', 'halo', 'dunia'];
  
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

// Helper: try supabase, fall back to mongo on any error
async function trySupabase(supabaseFn, mongoFn) {
  if (supabase) {
    try {
      return await supabaseFn();
    } catch (err) {
      const status = err?.status || err?.code || 'unknown';
      const msg = err?.message || String(err);
      console.warn(
        `[translation] Supabase failed (${status}): ${msg}. Falling back to MongoDB.`
      );
      // In development, include the full stack for debugging
      if (process.env.NODE_ENV === 'development' && err?.stack) {
        console.debug('[translation] Supabase error stack:', err.stack);
      }
    }
  }
  return mongoFn();
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
    
    const supabaseTableMap = {
      writing: 'artikel',
      project: 'projects',
      book: 'books', // assuming same names for these in Supabase
    };

    const collection = mongoCollectionMap[contentType];
    const table = supabaseTableMap[contentType];
    if (!collection) throw new Error(`Invalid content type: ${contentType}`);

    if (contentType !== 'writing') {
      const orConditions = [{ id: postId }, { _id: postId }];
      try {
        orConditions.push({ _id: new ObjectId(postId) });
      } catch {}
      const data = await db.collection(collection).findOne({ $or: orConditions });
      if (!data) throw new Error('Not found in MongoDB');
      return data;
    }

    const doc = await trySupabase(
      async () => {
        // Try exact match on _id
        let { data, error } = await supabase.from(table).select('*').eq('_id', postId).single();
        if (error || !data) {
          // Fallback to id (slug)
          const res = await supabase.from(table).select('*').eq('id', postId).limit(1).single();
          if (res.error) throw res.error;
          data = res.data;
        }
        if (!data) throw new Error('Not found in Supabase');
        return data;
      },
      async () => {
        const orConditions = [{ id: postId }, { _id: postId }];
        try {
          orConditions.push({ _id: new ObjectId(postId) });
        } catch {}
        const data = await db.collection(collection).findOne({ $or: orConditions });
        if (!data) throw new Error('Not found in MongoDB');
        return data;
      }
    );

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
  function determineTranslationDirection(doc, contentType, currentLanguage) {
    if (currentLanguage === 'en') {
      return {
        srcLang: 'en',
        tgtLang: 'id',
      };
    } else if (currentLanguage === 'id') {
      return {
        srcLang: 'id',
        tgtLang: 'en',
      };
    }

    const safeParse = (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          const detected = detectPlainStringLanguage(val);
          return { [detected]: val };
        }
      }
      return val || {};
    };

    const titleObj = safeParse(doc.title);
    let contentObj = {};
    if (contentType === 'writing') {
      contentObj = safeParse(doc.content);
    } else if (contentType === 'project') {
      contentObj = safeParse(doc.content || doc.description);
    } else if (contentType === 'book') {
      contentObj = safeParse(doc.review);
    }

    const hasEnglish = (titleObj.en && titleObj.en.trim()) || (contentObj.en && contentObj.en.trim());
    const hasIndonesian = (titleObj.id && titleObj.id.trim()) || (contentObj.id && contentObj.id.trim());

    if (hasEnglish && !hasIndonesian) {
      // English -> Indonesian translation
      return {
        srcLang: 'en',
        tgtLang: 'id',
        sourceTitle: titleObj.en || '',
        sourceContent: contentObj.en || '',
      };
    } else {
      // Indonesian -> English translation (Default)
      return {
        srcLang: 'id',
        tgtLang: 'en',
        sourceTitle: resolveText(doc.title, 'id'),
        sourceContent: resolveText(doc.content || doc.review || doc.description, 'id'),
      };
    }
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
      const { srcLang, tgtLang } = determineTranslationDirection(doc, contentType, currentLanguage);
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
          const { text: protectedText, placeholders } = extractPlaceholders(sourceText);
          const rawTranslated = await translateGoogle(protectedText, tgtLang);
          const sanitizedText = sanitizeTranslatedMarkdown(rawTranslated);
          const translatedText = restorePlaceholders(sanitizedText, placeholders);
          
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
      const { srcLang, tgtLang } = determineTranslationDirection(doc, contentType, currentLanguage);
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
          const { text: protectedText, placeholders } = extractPlaceholders(sourceText);
          const rawTranslated = await translateGoogle(protectedText, tgtLang);
          const rawSanitized = sanitizeTranslatedMarkdown(rawTranslated);
          let polishedText = rawSanitized;

          if (rawSanitized.trim().length > 0) {
            const polishResult = await translationQueue.executeWithFallback(
              `${postId}:hybrid:polish-${field}`,
              'button-hybrid',
              async (modelId) => {
                const systemPrompt = getSystemPrompt('polish', tgtLang);
                if (modelId.includes('ollama')) {
                  return await callOllamaLLM(rawSanitized, systemPrompt, modelId);
                } else {
                  return await callOpenRouterLLM(rawSanitized, systemPrompt, modelId);
                }
              }
            );
            if (polishResult.success) {
              polishedText = polishResult.data;
            }
          }

          const translatedText = restorePlaceholders(polishedText, placeholders);
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
      const { srcLang, tgtLang } = determineTranslationDirection(doc, contentType, currentLanguage);
      const fields = getTranslatableFields(contentType);

      // Build JSON to translate and extract placeholders
      const sourceJson = {};
      const allPlaceholders = {};
      for (const field of fields.localized) {
        const textVal = resolveText(doc[field], srcLang);
        if (textVal && textVal.trim()) {
          const { text: protectedText, placeholders } = extractPlaceholders(textVal);
          sourceJson[field] = protectedText;
          allPlaceholders[field] = placeholders;
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
4. Return ONLY the final translated JSON. Do not wrap in markdown blocks like \`\`\`json. Do not include intro or explanations.`;

      const userPrompt = JSON.stringify(sourceJson);

      const result = await translationQueue.executeWithFallback(
        `${postId}:smartai`,
        'button-smartai',
        async (modelId) => {
          if (modelId.includes('ollama')) {
            return await callOllamaLLM(userPrompt, systemPrompt, modelId);
          } else {
            return await callOpenRouterLLM(userPrompt, systemPrompt, modelId);
          }
        }
      );

      if (!result.success) {
        return res.status(503).json({
          error: 'All translation models failed',
          message: 'Please try again later',
          details: result.error,
        });
      }

      // Parse JSON from LLM response resiliently
      let translatedFields = {};
      try {
        let cleaned = result.result.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        }
        translatedFields = JSON.parse(cleaned);
      } catch (e) {
        console.warn('[SmartAI] Failed to parse JSON response, falling back to split parsing:', e);
        const parsed = parseAIResponse(result.result);
        if (parsed.title) translatedFields.title = parsed.title;
        if (parsed.content) {
          if (contentType === 'writing') translatedFields.content = parsed.content;
          else if (contentType === 'project') translatedFields.description = parsed.content;
          else if (contentType === 'book') translatedFields.review = parsed.content;
        }
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
        if (translatedFields[field]) {
          const restoredText = restorePlaceholders(translatedFields[field], allPlaceholders[field] || []);
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
