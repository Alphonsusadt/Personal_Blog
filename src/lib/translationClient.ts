/**
 * Translation API Client
 * Frontend wrapper for translation endpoints
 * Handles retry logic and error recovery
 */

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:5001/api';

interface TranslationRequest {
  postId: string;
  contentType: 'writing' | 'project' | 'book';
}

interface TranslationResponse {
  success: boolean;
  title?: string;
  content?: string;
  method?: string;
  model?: string;
  duration?: number;
  error?: string;
  warning?: string;
}

/**
 * Translate content using Google Translate
 */
export async function translateContent(
  postId: string,
  contentType: 'writing' | 'project' | 'book'
): Promise<TranslationResponse> {
  return fetchWithRetry('/translate', { postId, contentType });
}

/**
 * Translate and polish using Hybrid mode
 */
export async function translateHybrid(
  postId: string,
  contentType: 'writing' | 'project' | 'book'
): Promise<TranslationResponse> {
  return fetchWithRetry('/translate-hybrid', { postId, contentType });
}

/**
 * Translate using Smart AI with character unification
 */
export async function translateSmartAI(
  postId: string,
  contentType: 'writing' | 'project' | 'book'
): Promise<TranslationResponse> {
  return fetchWithRetry('/translate-smartai', { postId, contentType });
}

/**
 * Fetch with automatic retry on timeout
 * Retries up to 3 times with exponential backoff
 */
async function fetchWithRetry(
  endpoint: string,
  body: TranslationRequest,
  maxAttempts = 3
): Promise<TranslationResponse> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cms_token') || ''}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      lastError = error;

      // Check if retryable
      const isTimeout = error.message?.includes('timeout') || error.name === 'AbortError';
      const isServerError = error instanceof TypeError && error.message.includes('Failed to fetch');

      if ((isTimeout || isServerError) && attempt < maxAttempts) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[Translation] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Not retryable or max attempts reached
      throw error;
    }
  }

  throw new Error(lastError?.message || 'Translation failed after all attempts');
}

/**
 * Get translation status for content
 */
export async function getTranslationStatus(
  postId: string,
  contentType: 'writing' | 'project' | 'book'
): Promise<{
  status?: string;
  method?: string;
  language?: string;
  timestamp?: string;
}> {
  try {
    // This would be a GET endpoint that returns current translation status
    // For now, status is embedded in the content object from the editor
    return {};
  } catch (error) {
    console.error('Failed to get translation status:', error);
    return {};
  }
}

/**
 * Check if translation service is available
 */
export async function checkTranslationAvailability(): Promise<{
  available: boolean;
  google?: boolean;
  openrouter?: boolean;
  ollama?: boolean;
}> {
  try {
    // This would be a GET /api/translation/health endpoint
    // For now, we can only know if it's available by trying to translate
    return { available: true };
  } catch {
    return { available: false };
  }
}

/**
 * Format error message for display
 */
export function formatTranslationError(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'Translation failed. Please try again.';
}

/**
 * Get retry delay in milliseconds
 */
export function getRetryDelay(attempt: number): number {
  return Math.pow(2, attempt) * 1000;
}
