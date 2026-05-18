/**
 * Translation Model Registry
 * Defines all available models, their tiers, pricing, and fallback chains
 */

export const MODEL_TIERS = {
  FREE: 'free',
  CHEAP: 'cheap',
  LOCAL: 'local',
};

export const ERROR_TYPES = {
  RATE_LIMITED: 'rate_limited',
  TIMEOUT: 'timeout',
  TOKEN_LIMIT: 'token_limit',
  QUALITY_POOR: 'quality_poor',
  MODEL_ERROR: 'model_error',
};

/**
 * Model Definitions
 * Tier: free (Google) → cheap (OpenRouter paid) → local (Ollama free)
 * Speed: fast < medium < slow
 * Quality: low < medium < high
 */
export const MODELS = {
  GOOGLE_TRANSLATE: {
    id: 'google-translate',
    provider: 'google',
    name: 'Google Translate',
    tier: 'free',
    inputPrice: 0,
    outputPrice: 0,
    maxTokens: 5000,
    speedRating: 'fast',
    qualityRating: 'medium',
    supportedFor: ['detect', 'translate'],
  },

  DEEPSEEK_V4_FREE: {
    id: 'deepseek/deepseek-v4-flash:free',
    provider: 'openrouter',
    name: 'DeepSeek V4 Flash Free',
    tier: 'free',
    inputPrice: 0,
    outputPrice: 0,
    maxTokens: 8192,
    speedRating: 'fast',
    qualityRating: 'high',
    supportedFor: ['translate', 'polish', 'smartai'],
  },

  OPENROUTER_FREE: {
    id: 'openrouter/free',
    provider: 'openrouter',
    name: 'OpenRouter Free Router',
    tier: 'free',
    inputPrice: 0,
    outputPrice: 0,
    maxTokens: 8192,
    speedRating: 'fast',
    qualityRating: 'medium',
    supportedFor: ['translate', 'polish', 'smartai'],
  },

  GEMMA_4_FREE: {
    id: 'google/gemma-4-31b-it:free',
    provider: 'openrouter',
    name: 'Gemma 4 31B Free',
    tier: 'free',
    inputPrice: 0,
    outputPrice: 0,
    maxTokens: 8192,
    speedRating: 'fast',
    qualityRating: 'high',
    supportedFor: ['translate', 'polish', 'smartai'],
  },

  MISTRAL_7B: {
    id: 'mistralai/mistral-7b-instruct',
    provider: 'openrouter',
    name: 'Mistral 7B Instruct',
    tier: 'cheap',
    inputPrice: 0.14, // $0.00014/1k tokens
    outputPrice: 0.42, // $0.00042/1k tokens
    maxTokens: 32768,
    speedRating: 'fast',
    qualityRating: 'medium',
    supportedFor: ['translate', 'polish'],
  },

  LLAMA_70B: {
    id: 'meta-llama/llama-2-70b-chat',
    provider: 'openrouter',
    name: 'Llama 2 Chat 70B',
    tier: 'cheap',
    inputPrice: 0.8, // $0.0008/1k tokens
    outputPrice: 1.2, // $0.0012/1k tokens
    maxTokens: 4096,
    speedRating: 'slow',
    qualityRating: 'high',
    supportedFor: ['translate', 'polish', 'smartai'],
  },

  OLLAMA_LLAMA2: {
    id: 'ollama/llama2:7b',
    provider: 'ollama',
    name: 'Llama 2 7B (Local)',
    tier: 'local',
    inputPrice: 0,
    outputPrice: 0,
    maxTokens: 4096,
    speedRating: 'slow',
    qualityRating: 'low',
    supportedFor: ['translate', 'smartai'],
  },
};

/**
 * Fallback Chains for Each Button
 * Order matters: tries first, then fallback if fails
 */
export const FALLBACK_CHAINS = {
  'button-translate': [
    'google-translate',
  ],

  'button-hybrid': [
    'deepseek/deepseek-v4-flash:free',
    'openrouter/free',
    'google/gemma-4-31b-it:free',
    'mistralai/mistral-7b-instruct',
    'baidu/cobuddy:free',
    'ollama/llama2:7b',
  ],

  'button-smartai': [
    'deepseek/deepseek-v4-flash:free',
    'openrouter/free',
    'google/gemma-4-31b-it:free',
    'mistralai/mistral-7b-instruct',
    'baidu/cobuddy:free',
    'ollama/llama2:7b',
  ],
};

/**
 * Error Recovery Strategies
 * How to handle each error type
 */
export const ERROR_RECOVERY = {
  [ERROR_TYPES.RATE_LIMITED]: {
    action: 'retry',
    delay: 60000, // 60s delay before retry
    fallback: 'next_model',
  },

  [ERROR_TYPES.TIMEOUT]: {
    action: 'fallback',
    nextModel: 'select_faster',
    delay: 0,
  },

  [ERROR_TYPES.TOKEN_LIMIT]: {
    action: 'chunk_and_retry',
    chunkSize: 500,
    fallback: 'next_model',
  },

  [ERROR_TYPES.QUALITY_POOR]: {
    action: 'retry',
    nextModel: 'smarter_model',
    delay: 0,
  },

  [ERROR_TYPES.MODEL_ERROR]: {
    action: 'fallback',
    nextModel: 'next_in_chain',
    delay: 1000,
  },
};

/**
 * Get model config by ID
 */
export function getModel(modelId) {
  for (const model of Object.values(MODELS)) {
    if (model.id === modelId) return model;
  }
  return null;
}

/**
 * Get fallback chain for button
 */
export function getFallbackChain(buttonKey) {
  return FALLBACK_CHAINS[buttonKey] || [];
}

/**
 * Get recovery strategy for error type
 */
export function getRecoveryStrategy(errorType) {
  return ERROR_RECOVERY[errorType] || ERROR_RECOVERY[ERROR_TYPES.MODEL_ERROR];
}
