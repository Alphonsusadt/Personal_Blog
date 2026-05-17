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
   * Helper: Save translation result
   */
  async function saveTranslation(contentType, postId, title, content, language, method) {
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

    // Re-fetch current doc to get existing localized text base
    const doc = await getContent(contentType, postId);

    // Prepare updates based on content type
    let titleUpdate = {};
    let contentFieldUpdate = {};

    // Helper to safely parse stringified JSON from Supabase
    const safeParse = (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return { en: val };
        }
      }
      return val || {};
    };

    titleUpdate = safeParse(doc.title);
    titleUpdate[language] = title;

    if (contentType === 'writing') {
      contentFieldUpdate = safeParse(doc.content);
    } else if (contentType === 'project') {
      contentFieldUpdate = safeParse(doc.description);
    } else if (contentType === 'book') {
      contentFieldUpdate = safeParse(doc.review);
    }
    contentFieldUpdate[language] = content;

    const setObj = {
      title: titleUpdate,
      translationStatus: 'completed',
      translationMetadata: {
        method,
        language,
        timestamp: now.toISOString(),
      },
      updatedAt: now.toISOString(),
    };
    if (contentType === 'writing') setObj.content = contentFieldUpdate;
    else if (contentType === 'project') setObj.description = contentFieldUpdate;
    else if (contentType === 'book') setObj.review = contentFieldUpdate;

    await trySupabase(
      async () => {
        // Strip fields that are not in the Supabase schema
        const supabaseUpdate = { ...setObj };
        delete supabaseUpdate.translationStatus;
        delete supabaseUpdate.translationMetadata;
        
        const { error } = await supabase
          .from(table)
          .update(supabaseUpdate)
          .eq('_id', doc._id); // use the actual resolved _id
        if (error) throw error;
      },
      async () => {
        // Ensure dates are actual Date objects for MongoDB
        setObj.translationMetadata.timestamp = now;
        setObj.updatedAt = now;
        const orConditions = [{ id: postId }, { _id: postId }];
        try {
          orConditions.push({ _id: new ObjectId(postId) });
        } catch {}
        await db.collection(collection).updateOne(
          { $or: orConditions },
          { $set: setObj }
        );
      }
    );
  }

  /**
   * POST /api/translate
   * Button 1: Fast translation using Google Translate only
   */
  router.post('/translate', authMiddleware, async (req, res) => {
    const startTime = Date.now();
    const requestKey = `${req.body.postId}:translate`;

    try {
      const { postId, contentType } = req.body;

      // Validate input
      if (!postId || !contentType) {
        return res.status(400).json({ error: 'postId and contentType required' });
      }

      // Check rate limit
      if (!translationQueue.checkRateLimit(req.userId)) {
        const status = translationQueue.getRateLimitStatus(req.userId);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: status.resetIn,
          details: `${status.used}/${status.limit} requests in last minute`,
        });
      }

      // Get content
      const doc = await getContent(contentType, postId);
      const sourceTitle = resolveText(doc.title);
      const sourceContent = resolveText(doc.content || doc.review || doc.description);

      if (!sourceTitle && !sourceContent) {
        return res.status(400).json({ error: 'No content to translate' });
      }

      // Detect language from title + content
      const combinedText = `${sourceTitle} ${sourceContent}`.trim();
      const detection = await detectLanguageGoogle(combinedText);
      const srcLang = detection.language;
      
      // Force target language to English (user requirement) to avoid detection failures
      const tgtLang = 'en';

      // Translate title and content SEPARATELY to avoid newline parsing issues
      const translatedTitle = sourceTitle ? await translateGoogle(sourceTitle, tgtLang) : '';
      const translatedContent = sourceContent ? await translateGoogle(sourceContent, tgtLang) : '';

      // Validate
      const validation = validateTranslationResult(translatedTitle, translatedContent);
      if (!validation.valid) {
        logTranslationEvent({
          action: 'translate',
          postId,
          model: 'google',
          status: 'validation_failed',
          error: validation.error,
          duration: Date.now() - startTime,
        });
        return res.status(400).json({ error: validation.error });
      }

      // Save
      await saveTranslation(contentType, postId, translatedTitle, translatedContent, tgtLang, 'google_translate');

      logTranslationEvent({
        action: 'translate',
        postId,
        model: 'google',
        status: 'success',
        duration: Date.now() - startTime,
      });

      res.json({
        success: true,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        title: translatedTitle,
        content: translatedContent,
        method: 'google_translate',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      logTranslationEvent({
        action: 'translate',
        postId: req.body.postId,
        model: 'google',
        status: 'error',
        error: error.message,
        duration,
      });

      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limited by translation service' });
      }

      res.status(500).json({
        error: error.message || 'Translation failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  });

  /**
   * POST /api/translate-hybrid
   * Button 2: Google Translate + AI Polish
   * Delegates to SmartAI if mixed language detected
   */
  router.post('/translate-hybrid', authMiddleware, async (req, res) => {
    const startTime = Date.now();

    try {
      const { postId, contentType } = req.body;

      // Validate input
      if (!postId || !contentType) {
        return res.status(400).json({ error: 'postId and contentType required' });
      }

      // Check rate limit
      if (!translationQueue.checkRateLimit(req.userId)) {
        const status = translationQueue.getRateLimitStatus(req.userId);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: status.resetIn,
        });
      }

      // Get content
      const doc = await getContent(contentType, postId);
      const sourceTitle = resolveText(doc.title);
      const sourceContent = resolveText(doc.content || doc.review || doc.description);

      if (!sourceTitle && !sourceContent) {
        return res.status(400).json({ error: 'No content to translate' });
      }

      // Detect language from title + content
      const combinedText = `${sourceTitle} ${sourceContent}`.trim();
      const detection = await detectLanguageGoogle(combinedText);
      const srcLang = detection.language;
      const tgtLang = getTargetLanguage(srcLang);

      // If mixed language, delegate to SmartAI
      if (isMixedLanguageContent(combinedText)) {
        console.log('[Hybrid] Mixed language detected, delegating to SmartAI...');
        return handleSmartAI(req, res);
      }

      // Step 1: Google Translate title and content SEPARATELY
      const rawTranslatedTitle = sourceTitle ? await translateGoogle(sourceTitle, tgtLang) : '';
      const rawTranslatedContent = sourceContent ? await translateGoogle(sourceContent, tgtLang) : '';

      // Step 2: AI Polish each part with fallback
      let polishedTitle = rawTranslatedTitle;
      let polishedContent = rawTranslatedContent;

      // Polish title with AI
      if (rawTranslatedTitle) {
        const titleResult = await translationQueue.executeWithFallback(
          `${postId}:hybrid:polish-title`,
          'button-hybrid',
          async (modelId) => {
            const systemPrompt = getSystemPrompt('polish', tgtLang);
            if (modelId.includes('ollama')) {
              return await callOllamaLLM(rawTranslatedTitle, systemPrompt, modelId);
            } else {
              return await callOpenRouterLLM(rawTranslatedTitle, systemPrompt, modelId);
            }
          }
        );
        if (titleResult.success) {
          polishedTitle = titleResult.data;
        }
      }

      // Polish content with AI
      if (rawTranslatedContent) {
        const contentResult = await translationQueue.executeWithFallback(
          `${postId}:hybrid:polish-content`,
          'button-hybrid',
          async (modelId) => {
            const systemPrompt = getSystemPrompt('polish', tgtLang);
            if (modelId.includes('ollama')) {
              return await callOllamaLLM(rawTranslatedContent, systemPrompt, modelId);
            } else {
              return await callOpenRouterLLM(rawTranslatedContent, systemPrompt, modelId);
            }
          }
        );
        if (contentResult.success) {
          polishedContent = contentResult.data;
        }
      }

      // Validate
      const validation = validateTranslationResult(polishedTitle, polishedContent);
      if (!validation.valid) {
        logTranslationEvent({
          action: 'translate-hybrid',
          postId,
          model: 'google+ai',
          status: 'validation_failed',
          error: validation.error,
          duration: Date.now() - startTime,
        });
        return res.status(400).json({ error: validation.error });
      }

      // Save
      await saveTranslation(contentType, postId, polishedTitle, polishedContent, tgtLang, 'hybrid_google_ai');

      logTranslationEvent({
        action: 'translate-hybrid',
        postId,
        model: 'google+ai',
        status: 'success',
        duration: Date.now() - startTime,
      });

      res.json({
        success: true,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        title: polishedTitle,
        content: polishedContent,
        method: 'hybrid_google_ai',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logTranslationEvent({
        action: 'translate-hybrid',
        postId: req.body.postId,
        model: 'google+ai',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
      });

      res.status(500).json({
        error: error.message || 'Hybrid translation failed',
      });
    }
  });

  /**
   * POST /api/translate-smartai
   * Button 3: Full AI with character unification for mixed content
   */
  async function handleSmartAI(req, res) {
    const startTime = Date.now();

    try {
      const { postId, contentType } = req.body;

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
      const sourceTitle = resolveText(doc.title);
      const sourceContent = resolveText(doc.content || doc.review || doc.description);
      // Join with double newline so parseAIResponse can split title and content
      const text = `${sourceTitle}\n\n${sourceContent}`.trim();

      if (!text) {
        return res.status(400).json({ error: 'No content to translate' });
      }

      const detection = await detectLanguageGoogle(text);
      const srcLang = detection.language;
      const isMixed = isMixedLanguageContent(text);
      
      // Force target language to English
      const tgtLang = 'en';

      // Determine system prompt
      let systemPrompt;
      if (isMixed) {
        systemPrompt = getSystemPrompt('smartai_mixed', tgtLang);
      } else {
        systemPrompt = getSystemPrompt('smartai_bilingual', tgtLang);
      }

      // Execute with fallback
      const result = await translationQueue.executeWithFallback(
        `${postId}:smartai`,
        'button-smartai',
        async (modelId) => {
          if (modelId.includes('ollama')) {
            return await callOllamaLLM(text, systemPrompt, modelId);
          } else {
            return await callOpenRouterLLM(text, systemPrompt, modelId);
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

      const { title, content } = parseAIResponse(result.result);
      const validation = validateTranslationResult(title, content);

      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      await saveTranslation(
        contentType,
        postId,
        title,
        content,
        tgtLang,
        'smartai'
      );

      logTranslationEvent({
        action: 'translate_smartai',
        postId,
        model: result.model,
        status: 'success',
        duration: Date.now() - startTime,
      });

      res.json({
        success: true,
        title,
        content,
        method: 'smartai',
        model: result.model,
        characterUnified: isMixed,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logTranslationEvent({
        action: 'translate_smartai',
        postId: req.body.postId,
        model: 'unknown',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
      });

      res.status(500).json({
        error: error.message || 'Smart AI translation failed',
      });
    }
  }

  // Attach SmartAI handler as route
  router.post('/translate-smartai', authMiddleware, handleSmartAI);

  return router;
}
