/**
 * Google Translate API Wrapper
 * Handles language detection and translation via Google Translate
 */

import axios from 'axios';

const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';
const GOOGLE_DETECT_API_URL = 'https://translation.googleapis.com/language/translate/v2/detect';

/**
 * Detect language of text
 * @param {string} text - text to detect
 * @returns {Promise<{language: string, confidence: number}>}
 */
export async function detectLanguageGoogle(text) {
  if (!text || text.trim().length === 0) {
    return { language: 'unknown', confidence: 0 };
  }

  if (!process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY === 'YOUR_GOOGLE_TRANSLATE_API_KEY_HERE') {
    console.warn('[Google] API key not configured, using fallback detection');
    return { language: 'unknown', confidence: 0 };
  }

  try {
    const response = await axios.post(
      GOOGLE_DETECT_API_URL,
      {},
      {
        params: {
          q: text,
          key: process.env.GOOGLE_TRANSLATE_API_KEY,
        },
        timeout: 5000,
      }
    );

    const detection = response.data.detections?.[0]?.[0];
    if (!detection) {
      return { language: 'unknown', confidence: 0 };
    }

    return {
      language: detection.language,
      confidence: detection.confidence || 0.8,
    };
  } catch (error) {
    console.error('[Google] Detection failed:', error.message);
    throw {
      message: `Google Translate detection failed: ${error.message}`,
      originalError: error,
    };
  }
}

/**
 * Translate text using Google Translate
 * @param {string} text - text to translate
 * @param {string} targetLanguage - target language code (e.g., 'en', 'id')
 * @param {string} sourceLanguage - source language code (optional)
 * @returns {Promise<string>} - translated text
 */
export async function translateGoogle(text, targetLanguage, sourceLanguage = '') {
  if (!text || text.trim().length === 0) {
    return '';
  }

  if (!process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY === 'YOUR_GOOGLE_TRANSLATE_API_KEY_HERE') {
    const error = new Error('Google Translate API key not configured');
    error.code = 'NO_API_KEY';
    throw error;
  }

  try {
    const response = await axios.post(
      GOOGLE_TRANSLATE_API_URL,
      {},
      {
        params: {
          q: text,
          target: targetLanguage,
          source: sourceLanguage || undefined,
          key: process.env.GOOGLE_TRANSLATE_API_KEY,
        },
        timeout: 10000,
      }
    );

    const translation = response.data.data?.translations?.[0]?.translatedText;
    if (!translation) {
      throw new Error('Empty translation response from Google');
    }

    return translation;
  } catch (error) {
    // Check for rate limiting
    if (error.response?.status === 429) {
      const rateLimitError = new Error('Rate limited by Google Translate');
      rateLimitError.code = 'RATE_LIMITED';
      rateLimitError.status = 429;
      throw rateLimitError;
    }

    // Check for timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      const timeoutError = new Error('Google Translate request timeout');
      timeoutError.code = 'TIMEOUT';
      timeoutError.status = 504;
      throw timeoutError;
    }

    console.error('[Google] Translation failed:', error.message);
    throw {
      message: `Google Translate failed: ${error.message}`,
      status: error.response?.status || 500,
      code: error.code,
      originalError: error,
    };
  }
}

/**
 * Get available languages (for reference)
 */
export async function getAvailableLanguages() {
  // Google supports ~100+ languages, but for our purposes we mainly care about:
  return {
    id: { code: 'id', name: 'Indonesian' },
    en: { code: 'en', name: 'English' },
  };
}
