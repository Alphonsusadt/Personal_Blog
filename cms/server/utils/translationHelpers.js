/**
 * Translation Helper Utilities
 * Common functions used across translation services
 */

/**
 * Parse AI response to extract title and content
 * Smart parsing: tries to detect title vs content intelligently
 * @param {string} fullText - full response from AI
 * @returns {{title: string, content: string}}
 */
export function parseAIResponse(fullText) {
  if (!fullText || typeof fullText !== 'string') {
    return { title: '', content: '' };
  }

  const fullTextTrimmed = fullText.trim();
  
  // Try to split by double newline first (common format)
  if (fullTextTrimmed.includes('\n\n')) {
    const parts = fullTextTrimmed.split('\n\n');
    const title = (parts[0] || '').trim();
    const content = parts.slice(1).join('\n\n').trim();
    
    // Validate: title should be shorter, content should exist
    if (title && content && title.length < 500 && content.length > title.length) {
      return { title, content };
    }
  }

  // If no double newline, try single newline
  const lines = fullTextTrimmed.split('\n');
  if (lines.length > 1) {
    const firstLine = (lines[0] || '').trim();
    const rest = lines.slice(1).join('\n').trim();
    
    // If first line looks like a title (< 200 chars) and rest looks like content
    if (firstLine.length < 200 && firstLine.length > 0 && rest.length > firstLine.length) {
      return { 
        title: firstLine, 
        content: rest 
      };
    }
  }

  // Fallback: treat entire text as content if no clear separator found
  // Try to extract a title from first sentence
  if (fullTextTrimmed.length > 0) {
    const sentences = fullTextTrimmed.split(/[.!?]\s+/);
    const firstSentence = (sentences[0] || '').trim();
    
    // If first sentence is reasonable length (< 150 chars), use as title
    if (firstSentence.length > 0 && firstSentence.length < 150 && sentences.length > 1) {
      const remainingText = sentences.slice(1).join('. ').trim();
      return {
        title: firstSentence,
        content: remainingText
      };
    }
  }

  // Ultimate fallback: put everything in content
  return { 
    title: '', 
    content: fullTextTrimmed 
  };
}

/**
 * Validate translation result
 * @param {string} title - translated title
 * @param {string} content - translated content
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTranslationResult(title, content) {
  // At least one must be non-empty
  if (!title?.trim() && !content?.trim()) {
    return {
      valid: false,
      error: 'Translation result is empty',
    };
  }

  // Check minimum length (avoid partial translations)
  if (content?.trim().length < 10 && !title?.trim().length) {
    return {
      valid: false,
      error: 'Translation result too short',
    };
  }

  return { valid: true };
}

/**
 * Sanitize content for storage
 * @param {string} content - raw content
 * @returns {string} - sanitized content
 */
export function sanitizeTranslationContent(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\r\n/g, '\n'); // Normalize line endings
}

/**
 * Get target language from source
 * @param {string} sourceLang - source language code
 * @returns {string} - target language code
 */
export function getTargetLanguage(sourceLang) {
  // The user explicitly expects translated content to appear in the English flag
  // unless the source content is strictly detected as English.
  if (sourceLang === 'en') return 'id';
  return 'en';
}

/**
 * Format LocalizedText structure
 * @param {string|object} current - current value
 * @param {string} lang - language
 * @param {string} value - new value
 * @returns {object} - formatted LocalizedText
 */
export function formatLocalizedText(current, lang, value) {
  let base = {};

  if (typeof current === 'string') {
    // Legacy string format - treat as en
    base = { en: current };
  } else if (current && typeof current === 'object') {
    base = { ...current };
  }

  return {
    ...base,
    [lang]: value,
  };
}

/**
 * Detect if language is mixed (contains multiple languages)
 * Simple heuristic based on language markers
 * @param {string} text - text to check
 * @returns {boolean}
 */
export function isMixedLanguageContent(text) {
  if (!text || typeof text !== 'string') return false;

  // Indonesian markers
  const idMarkers = /\b(yang|dan|atau|di|ke|untuk|adalah|menjadi)\b/gi;
  // English markers
  const enMarkers = /\b(the|and|or|to|is|be|for|with|from)\b/gi;

  const idMatches = (text.match(idMarkers) || []).length;
  const enMatches = (text.match(enMarkers) || []).length;

  // If both languages have significant markers, it's mixed
  return idMatches > 2 && enMatches > 2;
}

/**
 * Create request key for deduplication
 * @param {string} postId - post ID
 * @param {string} contentType - content type
 * @param {string} button - button type
 * @returns {string}
 */
export function createRequestKey(postId, contentType, button) {
  return `${contentType}:${postId}:${button}:${Date.now()}`;
}

/**
 * Log translation event
 * @param {object} event - event details
 */
export function logTranslationEvent(event) {
  const timestamp = new Date().toISOString();
  const {
    action,
    postId,
    model,
    status,
    duration,
    error,
  } = event;

  const message = `[${timestamp}] [Translation] ${action} - ${postId} (${model}) - ${status}`;
  if (duration) {
    console.log(`${message} (${duration}ms)`);
  } else {
    console.log(message);
  }

  if (error) {
    console.error(`  Error: ${error}`);
  }
}
