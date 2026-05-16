/**
 * Model Selector Service
 * Intelligently selects which model to use based on error history and context
 */

import {
  FALLBACK_CHAINS,
  ERROR_TYPES,
  MODELS,
  getModel,
  getRecoveryStrategy,
} from '../config/modelRegistry.js';
import { isRetryableError, shouldFallbackToNextModel } from '../utils/errorClassifier.js';

export class ModelSelector {
  constructor() {
    // Track failures per model: Map<modelId, {count, lastError, timestamp}>
    this.failureHistory = new Map();
    // Track retry delays: Map<modelId, {retryAfter}>
    this.retryDelays = new Map();
  }

  /**
   * Select next model based on error type and current model
   * @param {string} buttonKey - e.g., 'button-translate', 'button-hybrid', 'button-smartai'
   * @param {string} currentModel - model ID
   * @param {string} errorType - error classification from errorClassifier
   * @returns {string} Next model ID to try, or null if no fallback available
   */
  selectNextModel(buttonKey, currentModel, errorType) {
    const chain = FALLBACK_CHAINS[buttonKey];
    if (!chain || chain.length === 0) {
      return null;
    }

    const currentIndex = chain.indexOf(currentModel);
    if (currentIndex === -1) {
      // Current model not in chain, start from beginning
      return chain[0];
    }

    // Special handling based on error type
    if (errorType === ERROR_TYPES.TIMEOUT) {
      // Timeout: prefer faster model
      const fasterModel = chain.find((modelId) => {
        const model = getModel(modelId);
        return model && model.speedRating === 'fast';
      });
      if (fasterModel && fasterModel !== currentModel) {
        return fasterModel;
      }
    }

    if (errorType === ERROR_TYPES.QUALITY_POOR) {
      // Poor quality: prefer smarter model
      const smarterModel = chain.find((modelId) => {
        const model = getModel(modelId);
        return model && model.qualityRating === 'high';
      });
      if (smarterModel && smarterModel !== currentModel) {
        return smarterModel;
      }
    }

    // Default: move to next in chain
    if (currentIndex < chain.length - 1) {
      return chain[currentIndex + 1];
    }

    return null; // No more fallbacks
  }

  /**
   * Record a failed attempt
   * @param {string} buttonKey - button identifier
   * @param {string} modelId - model that failed
   * @param {string} errorType - classified error type
   */
  recordFailure(buttonKey, modelId, errorType) {
    const key = `${buttonKey}:${modelId}`;
    const now = Date.now();

    if (!this.failureHistory.has(key)) {
      this.failureHistory.set(key, { count: 0, lastError: null, firstFailure: now });
    }

    const history = this.failureHistory.get(key);
    history.count += 1;
    history.lastError = errorType;
    history.lastFailureTime = now;

    // Log failures
    console.warn(
      `[TranslationError] ${modelId} failed (${history.count}x) - ${errorType} for ${buttonKey}`
    );

    // If rate limited, set retry delay
    if (errorType === ERROR_TYPES.RATE_LIMITED) {
      const recovery = getRecoveryStrategy(errorType);
      this.retryDelays.set(modelId, {
        retryAfter: now + recovery.delay,
        reason: 'rate_limited',
      });
    }

    // Mark as unreliable if failed 3+ times
    if (history.count >= 3) {
      console.error(
        `[TranslationWarning] Model ${modelId} marked as unreliable for ${buttonKey} (failed ${history.count} times)`
      );
    }
  }

  /**
   * Check if model is currently in retry delay
   */
  isModelInRetryDelay(modelId) {
    const delay = this.retryDelays.get(modelId);
    if (!delay) return false;

    if (Date.now() < delay.retryAfter) {
      return true;
    }

    // Retry window has passed, clear it
    this.retryDelays.delete(modelId);
    return false;
  }

  /**
   * Get remaining retry delay in ms
   */
  getRemainingRetryDelay(modelId) {
    const delay = this.retryDelays.get(modelId);
    if (!delay) return 0;

    const remaining = delay.retryAfter - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Check if model has too many recent failures
   */
  isModelUnreliable(buttonKey, modelId) {
    const key = `${buttonKey}:${modelId}`;
    const history = this.failureHistory.get(key);
    return history && history.count >= 3;
  }

  /**
   * Get next model in chain, skipping unreliable ones
   */
  selectBestNextModel(buttonKey, currentModel, errorType) {
    const chain = FALLBACK_CHAINS[buttonKey];
    if (!chain || chain.length === 0) return null;

    // First try error-type specific selection
    let nextModel = this.selectNextModel(buttonKey, currentModel, errorType);

    // Skip models that are in retry delay or unreliable
    while (nextModel) {
      if (
        !this.isModelInRetryDelay(nextModel) &&
        !this.isModelUnreliable(buttonKey, nextModel)
      ) {
        return nextModel;
      }

      // Try next in chain
      const currentIndex = chain.indexOf(nextModel);
      if (currentIndex < chain.length - 1) {
        nextModel = chain[currentIndex + 1];
      } else {
        break;
      }
    }

    return null;
  }

  /**
   * Reset failure history (useful for testing or manual reset)
   */
  clearHistory(buttonKey = null) {
    if (buttonKey) {
      // Clear only for specific button
      for (const key of this.failureHistory.keys()) {
        if (key.startsWith(buttonKey)) {
          this.failureHistory.delete(key);
        }
      }
    } else {
      // Clear all
      this.failureHistory.clear();
      this.retryDelays.clear();
    }
  }

  /**
   * Get status report
   */
  getStatus() {
    const failures = Array.from(this.failureHistory.entries()).map(([key, history]) => ({
      model: key,
      failureCount: history.count,
      lastError: history.lastError,
    }));

    return {
      totalModelsWithFailures: failures.length,
      failures,
    };
  }
}

// Singleton instance
export const modelSelector = new ModelSelector();
