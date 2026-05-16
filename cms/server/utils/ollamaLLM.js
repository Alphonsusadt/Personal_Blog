/**
 * Ollama Local LLM Wrapper
 * Handles LLM calls to locally running Ollama instance
 * Used as free fallback when APIs are unavailable
 */

/**
 * Check if Ollama is available
 * @returns {Promise<boolean>}
 */
export async function isOllamaAvailable() {
  if (process.env.USE_OLLAMA_FALLBACK !== 'true') {
    return false;
  }

  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${baseURL}/api/tags`, {
      method: 'GET',
      timeout: 2000,
    });
    return response.ok;
  } catch (error) {
    console.warn('[Ollama] Not available:', error.message);
    return false;
  }
}

/**
 * Call Ollama LLM
 * @param {string} text - content to process
 * @param {string} systemPrompt - system instruction
 * @param {string} model - model name (default: 'llama2:7b')
 * @returns {Promise<string>} - LLM response
 */
export async function callOllamaLLM(text, systemPrompt, model = 'llama2:7b') {
  if (!text || text.trim().length === 0) {
    return '';
  }

  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  // First check if Ollama is running
  const available = await isOllamaAvailable();
  if (!available) {
    const error = new Error('Ollama is not available or not running');
    error.code = 'OLLAMA_UNAVAILABLE';
    throw error;
  }

  try {
    const fullPrompt = `${systemPrompt}\n\nContent to process:\n${text}`;

    const response = await fetch(`${baseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        temperature: 0.7,
        top_p: 0.95,
      }),
      timeout: 60000, // Ollama can be slow locally
    });

    if (!response.ok) {
      const error = new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
      error.code = 'OLLAMA_ERROR';
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const content = data.response?.trim();

    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    return content;
  } catch (error) {
    // Handle specific error cases
    if (error.code === 'OLLAMA_UNAVAILABLE') {
      throw error;
    }

    console.error('[Ollama] Call failed:', error.message);
    throw {
      message: `Ollama request failed: ${error.message}`,
      code: error.code || 'OLLAMA_ERROR',
      originalError: error,
    };
  }
}

/**
 * Get available models from local Ollama
 * @returns {Promise<Array>}
 */
export async function getOllamaModels() {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${baseURL}/api/tags`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch models');

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.warn('[Ollama] Failed to fetch models:', error.message);
    return [];
  }
}

/**
 * Pull a model from Ollama registry (download if not present)
 * @param {string} model - model name (e.g., 'llama2:7b')
 * @returns {Promise<boolean>} - true if successful
 */
export async function pullOllamaModel(model) {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${baseURL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
      timeout: 300000, // 5 min timeout for download
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error(`[Ollama] Failed to pull model ${model}:`, error.message);
    return false;
  }
}

/**
 * Health check for Ollama
 * @returns {Promise<{status: string, model?: string}>}
 */
export async function checkOllamaHealth() {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${baseURL}/api/tags`, {
      method: 'GET',
      timeout: 3000,
    });

    if (!response.ok) {
      return { status: 'error', error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const modelCount = data.models?.length || 0;

    return {
      status: 'healthy',
      modelCount,
      models: data.models?.map((m) => m.name) || [],
    };
  } catch (error) {
    return {
      status: 'unavailable',
      error: error.message,
    };
  }
}
