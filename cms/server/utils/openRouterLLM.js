/**
 * OpenRouter API Wrapper
 * Handles LLM calls via OpenRouter (proxy for multiple models)
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Call OpenRouter LLM
 * @param {string} text - content to process
 * @param {string} systemPrompt - system instruction
 * @param {string} model - model ID (e.g., 'mistral-7b', 'llama-2-70b-chat')
 * @param {object} options - additional options
 * @returns {Promise<string>} - LLM response
 */
export async function callOpenRouterLLM(text, systemPrompt, model, options = {}) {
  if (!text || text.trim().length === 0) {
    return '';
  }

  if (!process.env.OPENROUTER_API_KEY) {
    const error = new Error('OpenRouter API key not configured');
    error.code = 'NO_API_KEY';
    throw error;
  }

  const controller = new AbortController();
  const timeout = parseInt(process.env.TRANSLATION_TIMEOUT || '30000');
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://alphonsus-portfolio.com', // Required by OpenRouter
        'X-Title': 'Alphonsus CMS', // Optional
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.95,
        ...options,
      }),
      signal: controller.signal,
    });

    // Handle rate limiting
    if (response.status === 429) {
      const error = new Error('Rate limited by OpenRouter');
      error.code = 'RATE_LIMITED';
      error.status = 429;
      throw error;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      const error = new Error(`OpenRouter error: ${errorMsg}`);
      error.status = response.status;
      error.code = 'API_ERROR';
      throw error;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenRouter');
    }

    return content;
  } catch (error) {
    clearTimeout(timeoutHandle);

    // Handle abort/timeout
    if (error.name === 'AbortError' || error.message.includes('abort')) {
      const timeoutError = new Error(`OpenRouter request timeout (${timeout}ms)`);
      timeoutError.code = 'TIMEOUT';
      timeoutError.status = 504;
      throw timeoutError;
    }

    // Re-throw with additional context
    if (error.code && ['RATE_LIMITED', 'TIMEOUT', 'API_ERROR'].includes(error.code)) {
      throw error;
    }

    console.error('[OpenRouter] Call failed:', error.message);
    throw {
      message: `OpenRouter request failed: ${error.message}`,
      code: error.code || 'UNKNOWN_ERROR',
      originalError: error,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Get available models from OpenRouter (for reference)
 */
export async function getAvailableModels() {
  if (!process.env.OPENROUTER_API_KEY) {
    return [];
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch models');

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[OpenRouter] Failed to fetch models:', error.message);
    return [];
  }
}

/**
 * Format system prompt for different tasks
 */
export function getSystemPrompt(task, targetLanguage = 'en') {
  const prompts = {
    polish: `You are a professional editor. Polish the following ${targetLanguage} text for:
- Natural flow and readability
- Correct grammar and punctuation
- Clear and concise language
Do NOT change the meaning or add new information.
Return only the polished text.`,

    translate: `Translate the provided text to ${targetLanguage}.
Maintain the original tone, voice, and meaning.
Make it sound like a native speaker wrote it.
Return only the translation.`,

    smartai_mixed: `You are an expert translator and editor working with mixed-language content.

TASK:
1. Analyze the tone and voice of any English text present
2. Translate any Indonesian parts to English
3. Rewrite the translation to match the English voice/tone exactly
4. Complete any unfinished sentences logically
5. Polish grammar and flow
6. Ensure consistency in style

OUTPUT: Return ONLY the final polished English text.`,

    smartai_bilingual: `You are an expert translator.
Translate to ${targetLanguage} while maintaining:
- The original persona and tone
- Writing style and voice
- Natural expression for native speakers
Return only the translation.`,
  };

  return prompts[task] || prompts.translate;
}
