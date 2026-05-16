import React, { useState } from 'react';
import { Loader, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { API_BASE } from '../lib/api';

/**
 * TranslationButtonGroup Component
 * Displays 3 translation buttons: Translate, Hybrid, SmartAI
 * Handles click events, loading states, and error display
 */
export function TranslationButtonGroup({
  postId,
  contentType,
  onTranslationStart,
  onTranslationComplete,
  onError,
  disabled = false,
  className = '',
}) {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState(null); // 'translate', 'hybrid', 'smartai'
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleTranslation = async (action) => {
    if (loading || disabled || !postId) return;

    setLoading(true);
    setCurrentAction(action);
    setError(null);
    setResult(null);

    if (onTranslationStart) {
      onTranslationStart(action);
    }

    try {
      const endpoint = {
        translate: `${API_BASE}/api/translate`,
        hybrid: `${API_BASE}/api/translate-hybrid`,
        smartai: `${API_BASE}/api/translate-smartai`,
      }[action];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cms_token')}`,
        },
        body: JSON.stringify({ postId, contentType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      if (onTranslationComplete) {
        onTranslationComplete(data);
      }
    } catch (err) {
      const errorMsg = err.message || 'Translation failed';
      setError(errorMsg);

      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  // Guard: writing must be saved first before translation can run
  const notSaved = !postId;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Warning: must save first */}
      {notSaved && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <span className="text-xs text-yellow-300">Simpan tulisan terlebih dahulu sebelum menerjemahkan.</span>
        </div>
      )}

      {/* Button Group */}
      <div className="flex gap-2">
        {/* Button 1: Translate (Google) */}
        <button
          onClick={() => handleTranslation('translate')}
          disabled={loading || disabled || notSaved}
          title={notSaved ? 'Simpan tulisan dulu sebelum menerjemahkan' : 'Fast translation using Google Translate'}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            loading && currentAction === 'translate'
              ? 'bg-blue-500/30 text-blue-300 cursor-wait'
              : disabled || loading || notSaved
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {loading && currentAction === 'translate' ? (
            <>
              <Loader className="inline w-3 h-3 mr-1 animate-spin" />
              Translating...
            </>
          ) : (
            'Translate'
          )}
        </button>

        {/* Button 2: Hybrid (Google + Polish) */}
        <button
          onClick={() => handleTranslation('hybrid')}
          disabled={loading || disabled || notSaved}
          title={notSaved ? 'Simpan tulisan dulu sebelum menerjemahkan' : 'Google Translate + AI polish for better quality'}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            loading && currentAction === 'hybrid'
              ? 'bg-purple-500/30 text-purple-300 cursor-wait'
              : disabled || loading || notSaved
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
              : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
          }`}
        >
          {loading && currentAction === 'hybrid' ? (
            <>
              <Loader className="inline w-3 h-3 mr-1 animate-spin" />
              Refining...
            </>
          ) : (
            'Hybrid'
          )}
        </button>

        {/* Button 3: SmartAI (Full AI) */}
        <button
          onClick={() => handleTranslation('smartai')}
          disabled={loading || disabled || notSaved}
          title={notSaved ? 'Simpan tulisan dulu sebelum menerjemahkan' : 'Full AI translation with character unification'}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            loading && currentAction === 'smartai'
              ? 'bg-pink-500/30 text-pink-300 cursor-wait'
              : disabled || loading || notSaved
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
              : 'bg-pink-600 text-white hover:bg-pink-700 active:bg-pink-800'
          }`}
        >
          {loading && currentAction === 'smartai' ? (
            <>
              <Loader className="inline w-3 h-3 mr-1 animate-spin" />
              Processing...
            </>
          ) : (
            'Smart AI'
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {result && result.success && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <div className="text-sm text-green-300">
            <p>Translation complete!</p>
            {result.model && <p className="text-xs opacity-75">Model: {result.model}</p>}
            {result.duration && (
              <p className="text-xs opacity-75">Time: {Math.round(result.duration / 1000)}s</p>
            )}
          </div>
        </div>
      )}

      {/* Info Text */}
      <div className="text-xs text-slate-400 space-y-1">
        <p>• <span className="text-blue-400">Translate</span>: Fast (Google only)</p>
        <p>• <span className="text-purple-400">Hybrid</span>: Better quality (Google + AI)</p>
        <p>• <span className="text-pink-400">Smart AI</span>: Best for mixed-language content</p>
      </div>
    </div>
  );
}
