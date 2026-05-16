/**
 * Translation Request Queue
 * Manages concurrent requests, rate limiting, and retry logic
 */

import { FALLBACK_CHAINS, ERROR_TYPES } from '../config/modelRegistry.js';
import { classifyError, shouldFallbackToNextModel } from '../utils/errorClassifier.js';
import { modelSelector } from './modelSelector.js';

export class TranslationQueue {
  constructor(options = {}) {
    // Prevent duplicate concurrent requests for same content
    this.activeRequests = new Map(); // Map<requestKey, Promise>

    // Rate limiter: Map<userId, timestamps[]>
    this.rateLimiter = new Map();
    this.rateLimitPerMinute = options.rateLimitPerMinute || 10;
    this.rateLimitWindow = 60000; // 1 minute in ms

    // Request timeout
    this.defaultTimeout = options.defaultTimeout || 30000; // 30s
  }

  /**
   * Execute translation with automatic fallback between models
   * @param {string} requestKey - unique key to prevent duplicates
   * @param {string} buttonKey - which button was clicked
   * @param {function} translationFn - async function that takes (modelId) and returns result
   * @returns {Promise<{success: boolean, result: string, model: string, error?: string}>}
   */
  async executeWithFallback(requestKey, buttonKey, translationFn) {
    // Check for duplicate in-flight request
    if (this.activeRequests.has(requestKey)) {
      console.log(`[Queue] Returning existing promise for ${requestKey}`);
      return this.activeRequests.get(requestKey);
    }

    const promise = this._executeInternal(buttonKey, translationFn);
    this.activeRequests.set(requestKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  /**
   * Internal execution with fallback chain
   */
  async _executeInternal(buttonKey, translationFn) {
    const chain = FALLBACK_CHAINS[buttonKey] || [];
    if (chain.length === 0) {
      return {
        success: false,
        error: `No models configured for ${buttonKey}`,
        result: null,
        model: null,
      };
    }

    let lastError = null;
    let lastErrorType = null;

    // Try each model in the chain
    for (let i = 0; i < chain.length; i++) {
      const modelId = chain[i];

      // Skip if in retry delay
      if (modelSelector.isModelInRetryDelay(modelId)) {
        const delay = modelSelector.getRemainingRetryDelay(modelId);
        console.warn(
          `[Queue] Skipping ${modelId} (rate limited, retry in ${Math.round(delay / 1000)}s)`
        );
        continue;
      }

      // Skip if marked unreliable
      if (modelSelector.isModelUnreliable(buttonKey, modelId)) {
        console.warn(`[Queue] Skipping ${modelId} (marked unreliable)`);
        continue;
      }

      try {
        console.log(`[Queue] Attempting with ${modelId} (${i + 1}/${chain.length})`);

        // Execute with timeout
        const result = await this._executeWithTimeout(modelId, translationFn);

        console.log(`[Queue] Success with ${modelId}`);
        return {
          success: true,
          result,
          model: modelId,
        };
      } catch (error) {
        lastError = error;
        lastErrorType = classifyError(error, { model: modelId, action: buttonKey });

        // Record the failure
        modelSelector.recordFailure(buttonKey, modelId, lastErrorType);

        // Log with error detail
        console.error(`[Queue] ${modelId} failed - ${lastErrorType}:`, error.message);

        // Check if this error type means we should try next model
        if (shouldFallbackToNextModel(lastErrorType)) {
          console.warn(
            `[Queue] ${modelId} failed with ${lastErrorType}, trying fallback...`
          );

          // If rate limited with delay, wait before trying next
          if (lastErrorType === ERROR_TYPES.RATE_LIMITED && i < chain.length - 1) {
            // Proceed to next model immediately (delay will be applied on retry)
            continue;
          }

          continue;
        }

        // Non-fallback error, return immediately
        return {
          success: false,
          error: error.message,
          result: null,
          model: modelId,
          errorType: lastErrorType,
        };
      }
    }

    // All models exhausted
    return {
      success: false,
      error: lastError?.message || 'All translation models failed',
      result: null,
      model: null,
      errorType: lastErrorType,
    };
  }

  /**
   * Execute with timeout
   */
  _executeWithTimeout(modelId, translationFn) {
    return Promise.race([
      translationFn(modelId),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout for ${modelId} (${this.defaultTimeout}ms)`)),
          this.defaultTimeout
        )
      ),
    ]);
  }

  /**
   * Rate limit check per user
   * @param {string} userId - user ID
   * @returns {boolean} true if within limit, false if exceeded
   */
  checkRateLimit(userId) {
    if (!userId) userId = 'anonymous';

    const now = Date.now();

    if (!this.rateLimiter.has(userId)) {
      this.rateLimiter.set(userId, [now]);
      return true;
    }

    // Clean old timestamps outside window
    let timestamps = this.rateLimiter.get(userId);
    timestamps = timestamps.filter((t) => now - t < this.rateLimitWindow);
    timestamps.push(now);

    this.rateLimiter.set(userId, timestamps);

    // Check limit
    if (timestamps.length > this.rateLimitPerMinute) {
      console.warn(
        `[RateLimit] User ${userId} exceeded limit (${timestamps.length}/${this.rateLimitPerMinute} in ${this.rateLimitWindow}ms)`
      );
      return false;
    }

    return true;
  }

  /**
   * Get rate limit status for user
   */
  getRateLimitStatus(userId) {
    if (!userId) userId = 'anonymous';

    const now = Date.now();
    let timestamps = this.rateLimiter.get(userId) || [];
    timestamps = timestamps.filter((t) => now - t < this.rateLimitWindow);

    return {
      used: timestamps.length,
      limit: this.rateLimitPerMinute,
      remaining: Math.max(0, this.rateLimitPerMinute - timestamps.length),
      resetIn: timestamps.length > 0 ? Math.round((timestamps[0] + this.rateLimitWindow - now) / 1000) : 0,
    };
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      activeRequests: this.activeRequests.size,
      modelStatus: modelSelector.getStatus(),
    };
  }
}

// Singleton instance with default rate limiting
export const translationQueue = new TranslationQueue({
  rateLimitPerMinute: parseInt(process.env.TRANSLATION_RATE_LIMIT || '10'),
  defaultTimeout: parseInt(process.env.TRANSLATION_TIMEOUT || '30000'),
});
