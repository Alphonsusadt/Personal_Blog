/**
 * Error Classification Utility
 * Detects error type from exception and context
 */

import { ERROR_TYPES } from '../config/modelRegistry.js';

/**
 * Classify error based on message, status code, and context
 * @returns {string} One of: rate_limited, timeout, token_limit, quality_poor, model_error
 */
export function classifyError(error, context = {}) {
  if (!error) return ERROR_TYPES.MODEL_ERROR;

  const message = (error.message || error.toString()).toLowerCase();
  const status = error.status || error.statusCode || 0;

  // Rate Limit Detection (status 429 or message contains 'rate')
  if (status === 429 || message.includes('rate limit') || message.includes('rate limited')) {
    return ERROR_TYPES.RATE_LIMITED;
  }

  // Timeout Detection (status 504, timeout in message, or AbortError)
  if (
    status === 504 ||
    message.includes('timeout') ||
    message.includes('aborted') ||
    error.name === 'AbortError'
  ) {
    return ERROR_TYPES.TIMEOUT;
  }

  // Token Limit Detection (message contains 'token' or 'length' or 'exceeded')
  if (message.includes('token') || message.includes('max_tokens') || message.includes('exceeded')) {
    return ERROR_TYPES.TOKEN_LIMIT;
  }

  // Model/API Error (status 400-499 typically validation errors)
  if ((status >= 400 && status < 500) || message.includes('invalid')) {
    return ERROR_TYPES.MODEL_ERROR;
  }

  // Quality Detection (if result is suspiciously short)
  if (context.contentLength && context.resultLength) {
    // If original was substantial but result is tiny, quality is poor
    if (context.contentLength > 100 && context.resultLength < 20) {
      return ERROR_TYPES.QUALITY_POOR;
    }
  }

  // Server Error
  if (status >= 500) {
    return ERROR_TYPES.MODEL_ERROR;
  }

  return ERROR_TYPES.MODEL_ERROR;
}

/**
 * Format error for logging
 */
export function formatErrorLog(errorType, model, button, error) {
  return `[${new Date().toISOString()}] ${button}:${model} - ${errorType}: ${error.message}`;
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(errorType) {
  const retryableErrors = [
    ERROR_TYPES.RATE_LIMITED,
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.TOKEN_LIMIT,
  ];
  return retryableErrors.includes(errorType);
}

/**
 * Determine if we should try next model in chain
 */
export function shouldFallbackToNextModel(errorType) {
  const fallbackErrors = [
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.MODEL_ERROR,
    ERROR_TYPES.TOKEN_LIMIT,
  ];
  return fallbackErrors.includes(errorType);
}
