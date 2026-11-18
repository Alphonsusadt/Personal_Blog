import React, { useState } from 'react';
import { Loader, AlertCircle, CheckCircle, Copy, Undo2 } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { getExactLocalizedText } from '../lib/localized';
import { hasMeaningfulContent, mergeTranslatedLayout } from '../lib/bilingualAssets';

const LOCALIZED_FIELDS = ['title', 'excerpt', 'content', 'description', 'review', 'author'];
const LANG_NAME = { id: 'Bahasa Indonesia', en: 'English' };

/** Isi setiap field terjemahan untuk satu bahasa (snapshot sebelum translate). */
function snapshotLanguage(item, lang) {
  const out = {};
  if (!item) return out;
  for (const f of LOCALIZED_FIELDS) {
    if (item[f] !== undefined) out[f] = getExactLocalizedText(item[f], lang);
  }
  return out;
}

/**
 * TranslationButtonGroup Component
 * Displays 3 translation buttons: Translate, Hybrid, SmartAI
 * Handles click events, loading states, and error display
 */
export function TranslationButtonGroup({
  postId,
  contentType,
  currentLanguage,
  onTranslationStart,
  onTranslationComplete,
  onError,
  onBeforeTranslate,
  /** Data tulisan/proyek/buku saat ini: dipakai untuk mode "pertahankan tata letak" & Undo. */
  item = null,
  disabled = false,
  className = '',
}) {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState(null); // 'translate', 'hybrid', 'smartai'
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  // Bahasa tujuan sudah berisi -> tanya dulu mau diganti semua atau tata letaknya dipertahankan.
  const [pending, setPending] = useState(null); // action yang menunggu pilihan mode
  const [undo, setUndo] = useState(null); // { targetLanguage, translations } sebelum translate

  // Tujuan saat kedua bahasa sudah berisi: kunci dari terjemahan terakhir, atau tab yang aktif.
  const predictedTarget = item?.translationMetadata?.language || (currentLanguage === 'en' ? 'en' : 'id');
  const bothFilled = () => {
    if (!item) return false;
    const filled = (lang) => Object.values(snapshotLanguage(item, lang)).some(v => hasMeaningfulContent(v as string));
    return filled('id') && filled('en');
  };

  const requestTranslation = (action) => {
    if (loading || disabled || !postId) return;
    if (bothFilled()) { setPending(action); return; }
    handleTranslation(action, 'replace');
  };

  const handleTranslation = async (action, mode = 'replace') => {
    if (loading || disabled || !postId) return;
    setPending(null);
    // Snapshot kedua bahasa SEBELUM server menimpa bahasa tujuan.
    const before = { id: snapshotLanguage(item, 'id'), en: snapshotLanguage(item, 'en') };

    setLoading(true);
    setCurrentAction(action);
    setError(null);
    setResult(null);

    try {
      if (onBeforeTranslate) {
        await onBeforeTranslate();
      }

      if (onTranslationStart) {
        onTranslationStart(action);
      }
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
        body: JSON.stringify({ postId, contentType, currentLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Server bisa mengirim judul (error) + penjelasan (message); tampilkan keduanya.
        const detail = errorData.message && errorData.message !== errorData.error ? ` ${errorData.message}` : '';
        throw new Error(`${errorData.error || `HTTP ${response.status}`}${detail ? '.' + detail : ''}`);
      }

      const data = await response.json();
      const target = data.targetLanguage === 'id' ? 'id' : 'en';
      const prev = before[target] || {};
      const translations = { ...(data.translations || {}) };

      // Mode "pertahankan": gambar/embed yang sudah diatur di bahasa tujuan memakai
      // tata letak lama (wrap, lebar, posisi, caption); gambar tambahanmu tidak hilang.
      if (mode === 'keepLayout') {
        for (const [field, text] of Object.entries(translations)) {
          if (typeof text === 'string' && prev[field]) translations[field] = mergeTranslatedLayout(text, prev[field]);
        }
      }
      data.translations = translations;
      // Nilai lama (kompatibilitas) dibuang supaya halaman memakai translations yang sudah digabung.
      delete data.title;
      delete data.content;

      const restorable = {};
      for (const field of Object.keys(translations)) if (field in prev) restorable[field] = prev[field];
      setUndo(Object.values(restorable).some(v => v && String(v).trim()) ? { targetLanguage: target, translations: restorable } : null);
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
          onClick={() => requestTranslation('translate')}
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
          onClick={() => requestTranslation('hybrid')}
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
          onClick={() => requestTranslation('smartai')}
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

      {/* Bahasa tujuan sudah berisi: pilih cara menerapkan terjemahan */}
      {pending && (
        <div className="p-3 rounded-lg bg-[#0F172A] border border-[#475569] space-y-2">
          <p className="text-xs text-[#F8FAFC] font-semibold">Versi {LANG_NAME[predictedTarget]} sudah berisi.</p>
          <p className="text-[11px] text-[#94A3B8] leading-snug">Teks akan diganti hasil terjemahan. Bagaimana dengan gambar &amp; embed yang sudah kamu atur di sana?</p>
          <button
            type="button"
            onClick={() => handleTranslation(pending, 'keepLayout')}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-left"
          >
            Pertahankan tata letak gambarku
            <span className="block font-normal opacity-80">Posisi, ukuran, wrap &amp; caption yang sudah diatur tetap; gambar tambahanmu tidak hilang.</span>
          </button>
          <button
            type="button"
            onClick={() => handleTranslation(pending, 'replace')}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold border border-[#475569] text-[#CBD5E1] hover:bg-[#1E293B] text-left"
          >
            Ganti semua
            <span className="block font-normal opacity-80">Isi disamakan dengan versi sumber, termasuk tata letak gambarnya.</span>
          </button>
          <button type="button" onClick={() => setPending(null)} className="w-full text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] py-1">
            Batal
          </button>
        </div>
      )}

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

      {/* Batalkan terjemahan: kembalikan isi bahasa tujuan seperti sebelum ditimpa */}
      {undo && !loading && (
        <button
          type="button"
          onClick={() => {
            onTranslationComplete?.({ success: true, method: 'restore', targetLanguage: undo.targetLanguage, translations: { ...undo.translations } });
            setUndo(null);
            setResult(null);
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs border border-[#475569] text-[#CBD5E1] hover:bg-[#1E293B]"
          title="Kembalikan isi versi ini seperti sebelum diterjemahkan"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Kembalikan isi {LANG_NAME[undo.targetLanguage]} sebelum terjemahan
        </button>
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
