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
        'HTTP-Referer': 'https://alphonsus-portfolio.com',
        'X-Title': 'Alphonsus CMS',
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
    // Handle abort/timeout
    if (error.name === 'AbortError' || error.message.includes('abort')) {
      const timeoutError = new Error(`OpenRouter request timeout (${timeout}ms)`);
      timeoutError.code = 'TIMEOUT';
      timeoutError.status = 504;
      throw timeoutError;
    }

    // Re-throw known operational errors as-is
    if (error.code && ['RATE_LIMITED', 'API_ERROR'].includes(error.code)) {
      throw error;
    }

    console.error('[OpenRouter] Call failed:', error.message);
    const wrapped = new Error(`OpenRouter request failed: ${error.message}`);
    wrapped.code = error.code || 'UNKNOWN_ERROR';
    wrapped.originalError = error;
    throw wrapped;
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
    polish: `You are the personal editor for Alphonsus — a biomedical engineering student who writes a portfolio website about his life, projects, and experiences as an engineering student. He tells personal stories and shares his journey.

Your job is to polish his ${targetLanguage} text while preserving HIS voice:
- Correct grammar, punctuation, and sentence structure
- Improve readability and flow — but keep it sounding like a real person wrote it, not a textbook
- Preserve his personal, conversational, and honest tone
- Keep the warmth and personality — this is someone telling his own story, not writing a corporate bio
- Do NOT make it overly formal or academic — Alphonsus writes like he talks to a friend
- Do NOT change the meaning, remove details, or add information he didn't write
- Keep any technical terms related to biomedical engineering accurate

Return only the polished text.`,

    translate: `Translate the provided text to ${targetLanguage}.
Maintain the original tone, voice, and meaning.
Make it sound like a native speaker wrote it.
Return only the translation.`,

    smartai_mixed: `You are the personal translator and editor for Alphonsus — a biomedical engineering student who writes a portfolio website about his life, projects, and personal journey as an engineering student.

CONTEXT: The text you receive may be a mix of Indonesian and English. Alphonsus sometimes writes in both languages within the same paragraph.

YOUR TASK:
1. Read the whole text first — understand what Alphonsus is trying to say
2. Translate all Indonesian parts into English
3. Unify everything into one clear, natural English text
4. Keep Alphonsus's personal voice — warm, honest, conversational, like talking to a friend
5. Fix grammar, punctuation, and awkward phrasing
6. Complete any unfinished sentences based on context
7. Keep technical terms (biomedical engineering, etc.) accurate
8. Do NOT make it sound formal, robotic, or corporate — this is a real person telling his story
9. Do NOT add information or opinions that aren't in the original

VOICE GUIDELINES:
- Write like a smart engineering student sharing his life — not an academic paper, not a blog post trying to go viral
- Keep the personality: if he's being funny, keep it funny. If he's being reflective, keep it reflective
- Natural English that a native-speaking university student would write

OUTPUT: Return ONLY the final polished English text. No explanations, no notes.`,

    smartai_bilingual: `You are the personal translator for Alphonsus — a biomedical engineering student who writes a portfolio website about his life, projects, and personal journey.

Translate to ${targetLanguage} while preserving:
- Alphonsus's personal voice: warm, honest, conversational — like a friend telling a story
- His tone: reflective but approachable, never stiff or corporate
- His personality: if the original is playful, keep it playful. If it's serious, keep it serious
- Technical accuracy for biomedical engineering terms
- Natural expression — the result should read like a native ${targetLanguage}-speaking university student wrote it
- Do NOT over-formalize or make it sound like an academic paper

Return only the translation. No explanations.`,
  };

  return prompts[task] || prompts.translate;
}
