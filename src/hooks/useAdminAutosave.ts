/**
 * useAdminAutosave — Robust autosave hook
 *
 * Implements 6 production-grade autosave principles:
 * 1. DEBOUNCE           → Avoid excessive saves (local: 800ms, server: 3s)
 * 2. DIRTY FLAG         → Only save when data actually changed
 * 3. PERIODIC INTERVAL  → Safety net every 30s even if debounce was missed
 * 4. ATOMIC WRITE       → Data carries a `version` counter; server uses $set
 *                         so partial writes never corrupt a document
 * 5. QUEUE + RETRY      → Failed saves go into a retry queue (max 3 attempts,
 *                         exponential back-off: 2s → 4s → 8s)
 * 6. PREPARED STMT      → saveToServer callback accepts a stable, pre-built
 *                         payload; the hook freezes the exact snapshot that
 *                         was dirty so in-flight mutations don't corrupt saves
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'retrying';

interface SaveJob<T> {
  payload: T;       // frozen snapshot — like a prepared statement parameter
  version: number;  // monotonically increasing — for dirty tracking
  attempt: number;  // retry counter
}

interface UseAdminAutosaveOptions<T> {
  /** localStorage key for local draft persistence */
  storageKey: string;
  /** Live data reference (changes trigger dirty detection) */
  data: T;
  /** Whether autosave is active (e.g. disabled while loading) */
  enabled: boolean;
  /** Async function that persists data to the server, returning updated document */
  saveToServer: (data: T) => Promise<T | void>;
  /** Optional guard — skip save if data is considered empty */
  hasMeaningfulData?: (data: T) => boolean;
  /** Local draft debounce in ms (default: 800) */
  localDebounceMs?: number;
  /** Server save debounce in ms (default: 3000) */
  serverDebounceMs?: number;
  /** Periodic interval fallback in ms (default: 30000) */
  periodicIntervalMs?: number;
  /** How long to show "saved" badge (default: 1500) */
  resetStatusMs?: number;
  /** Max retry attempts on failure (default: 3) */
  maxRetries?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Stable JSON fingerprint used for dirty detection */
function fingerprint<T>(data: T): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

/** Exponential back-off: 2^attempt seconds, capped at 16s */
function retryDelay(attempt: number): number {
  return Math.min(2 ** attempt * 1000, 16_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminAutosave<T>({
  storageKey,
  data,
  enabled,
  saveToServer,
  hasMeaningfulData,
  localDebounceMs = 800,
  serverDebounceMs = 600,
  periodicIntervalMs = 30_000,
  resetStatusMs = 1500,
  maxRetries = 3,
}: UseAdminAutosaveOptions<T>) {

  // ── UI state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);
  const [hasCollision, setHasCollision] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [backupTimestamp, setBackupTimestamp] = useState<number | null>(null);

  // ── Internal refs (don't trigger re-renders) ──────────────────────────────
  const localDebounceRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const serverDebounceRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const statusResetRef      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryTimeoutRef     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const periodicIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // DIRTY FLAG: track last-saved fingerprint
  const lastSavedFingerprintRef = useRef<string>('');
  // Monotonic version counter for job ordering (ATOMIC WRITE support)
  const versionRef = useRef(0);
  // QUEUE: pending retry job
  const retryQueueRef = useRef<SaveJob<T> | null>(null);
  // In-flight guard — prevent concurrent server saves
  const isSavingRef = useRef(false);
  // Skip-first-render guard
  const initializedRef = useRef(false);
  // Safety flag to prevent saving a local draft on unmount/unload if we just saved to the server
  const skipUnloadSaveRef = useRef(false);

  // Stable ref to always-current data (avoid stale closure in callbacks)
  const dataRef = useRef(data);
  dataRef.current = data;

  // Seed initial fingerprint when enabled becomes true (data loaded from server)
  useEffect(() => {
    if (enabled && lastSavedFingerprintRef.current === '') {
      lastSavedFingerprintRef.current = fingerprint(dataRef.current);
    }
  }, [enabled]);

  // Stable ref to saveToServer (avoids re-subscribing effects on each render)
  const saveToServerRef = useRef(saveToServer);
  saveToServerRef.current = saveToServer;

  // ── Status helpers ────────────────────────────────────────────────────────

  const showSaved = useCallback(() => {
    clearTimeout(statusResetRef.current);
    setStatus('saved');
    statusResetRef.current = setTimeout(() => setStatus('idle'), resetStatusMs);
  }, [resetStatusMs]);

  // ── Draft management ──────────────────────────────────────────────────────

  // Stable ref to clearDraft so long-lived closures (executeServerSave) always
  // clear the CURRENT storageKey, not the one captured when they were first created.
  const clearDraftRef = useRef<(options?: { backup?: boolean }) => void>(() => {});
  const persistDraftRef = useRef<(snapshot: T) => void>(() => {});

  const clearDraft = useCallback((options?: { backup?: boolean }) => {
    try {
      if (options?.backup) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          localStorage.setItem(`${storageKey}_backup`, stored);
          setHasBackup(true);
          try {
            const parsed = JSON.parse(stored);
            setBackupTimestamp(parsed.timestamp ?? null);
          } catch {
            setBackupTimestamp(Date.now());
          }
        }
      }
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftTimestamp(null);
    } catch (err) {
      console.error('[autosave] clear draft failed:', err);
    }
  }, [storageKey]);

  clearDraftRef.current = clearDraft;

  // ── 1 + 4 + 5 + 6: Core server-save with Queue + Retry + Atomic ──────────

  const executeServerSave = useCallback(async (job: SaveJob<T>) => {
    if (isSavingRef.current) {
      // Queue this job for after the in-flight save finishes
      retryQueueRef.current = job;
      return;
    }

    // DIRTY FLAG: skip if nothing changed since last successful save
    const fp = fingerprint(job.payload);
    if (fp === lastSavedFingerprintRef.current && job.attempt === 0) {
      return;
    }

    isSavingRef.current = true;
    setErrorMessage('');
    setStatus(job.attempt > 0 ? 'retrying' : 'saving');

    // Tracks whether a retry was scheduled so `finally` below knows not to
    // release isSavingRef early — `finally` runs even after a `return` in the
    // catch block, so that used to undo "don't reset isSavingRef yet" every time.
    let retryScheduled = false;

    try {
      // PREPARED STMT: the payload snapshot was frozen at dirty-detection time,
      // so this call always uses a consistent, immutable data set — equivalent
      // to binding parameters in a prepared SQL statement.
      // ATOMIC WRITE: saveToServer must use $set on the server (not replace),
      // so only the changed fields are written — crash-safe.
      const result = await saveToServerRef.current(job.payload);

      // Success — update dirty flag baseline
      lastSavedFingerprintRef.current = result ? fingerprint(result) : fp;
      // JANGAN kosongkan antrean di sini: bila penulis terus mengetik selama request ini
      // berjalan, simpanan yang lebih baru sudah mengantre dan dijalankan di `finally`.
      // (Dulu antrean dibuang → ketikan terakhir tidak pernah sampai ke server.)
      if (fingerprint(dataRef.current) === lastSavedFingerprintRef.current) {
        clearDraftRef.current(); // server sudah persis sama dengan layar → draf lokal tak perlu
      } else {
        // Ada ketikan sesudah snapshot ini: draf lokal = satu-satunya salinan terbarunya.
        persistDraftRef.current(dataRef.current);
      }
      showSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (job.attempt < maxRetries) {
        // QUEUE + RETRY: exponential back-off. Bila sudah ada simpanan yang lebih baru di
        // antrean, coba ulang DENGAN data terbaru itu — bukan data lama yang barusan gagal,
        // yang kalau berhasil akan menimpa ketikan terbaru.
        const newer = retryQueueRef.current;
        const useNewer = !!newer && newer.version > job.version;
        const nextJob: SaveJob<T> = {
          payload: useNewer ? newer!.payload : job.payload,
          version: useNewer ? newer!.version : job.version,
          attempt: job.attempt + 1,
        };
        retryQueueRef.current = nextJob;
        setStatus('retrying');
        setErrorMessage(`Retry ${nextJob.attempt}/${maxRetries}…`);
        retryScheduled = true;

        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          const queued = retryQueueRef.current;
          if (queued) {
            isSavingRef.current = false;
            retryQueueRef.current = null;
            executeServerSave(queued);
          }
        }, retryDelay(job.attempt));
      } else {
        // Exhausted retries
        setStatus('error');
        setErrorMessage(msg);
        retryQueueRef.current = null;
      }
    } finally {
      if (!retryScheduled) {
        isSavingRef.current = false;

        // Drain queue if another save arrived while we were in-flight
        if (retryQueueRef.current && retryQueueRef.current.attempt === 0) {
          const queued = retryQueueRef.current;
          retryQueueRef.current = null;
          executeServerSave(queued);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxRetries, showSaved]);

  // ── Local draft persistence ───────────────────────────────────────────────

  const persistLocalDraft = useCallback((snapshot: T) => {
    try {
      const timestamp = Date.now();
      localStorage.setItem(storageKey, JSON.stringify({ data: snapshot, timestamp }));
      setHasDraft(true);
      setDraftTimestamp(timestamp);
    } catch (err) {
      console.error('[autosave] localStorage write failed:', err);
    }
  }, [storageKey]);

  // Ref supaya executeServerSave (dibuat sekali) selalu menulis ke storageKey TERKINI
  // (kunci berganti dari "*_new" ke slug setelah tulisan baru dibuat).
  persistDraftRef.current = persistLocalDraft;

  // ── Public: mark as saved (used by manual save to sync dirty flag) ────────
  
  const markAsSaved = useCallback((snapshot: T) => {
    skipUnloadSaveRef.current = true;
    dataRef.current = snapshot; // Synchronously update ref to avoid stale state on immediate unmount
    lastSavedFingerprintRef.current = fingerprint(snapshot);
    clearDraft();
  }, [clearDraft]);

  // ── Public: force-save now (used by Save button) ──────────────────────────

  const saveNow = useCallback(async () => {
    if (!enabled) return;
    const snapshot = dataRef.current;
    if (hasMeaningfulData && !hasMeaningfulData(snapshot)) return;

    // Cancel pending debounces — we're saving immediately
    clearTimeout(localDebounceRef.current);
    clearTimeout(serverDebounceRef.current);

    persistLocalDraft(snapshot);
    versionRef.current += 1;
    await executeServerSave({ payload: snapshot, version: versionRef.current, attempt: 0 });

    // Bila ada simpanan lain yang sedang berjalan, executeServerSave hanya mengantrekan
    // snapshot ini lalu langsung selesai. Pemanggil (mis. tombol Translate) butuh jaminan
    // server SUDAH punya isi terbaru, jadi tunggu sampai antrean benar-benar kosong.
    const deadline = Date.now() + 20_000;
    while ((isSavingRef.current || retryQueueRef.current) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [enabled, executeServerSave, hasMeaningfulData, persistLocalDraft]);

  const readDraft = useCallback((): { data: T; timestamp: number } | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (err) {
      console.error('[autosave] read draft failed:', err);
      return null;
    }
  }, [storageKey]);

  const readBackupDraft = useCallback((): { data: T; timestamp: number } | null => {
    try {
      const stored = localStorage.getItem(`${storageKey}_backup`);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (err) {
      console.error('[autosave] read backup draft failed:', err);
      return null;
    }
  }, [storageKey]);

  const clearBackupDraft = useCallback(() => {
    try {
      localStorage.removeItem(`${storageKey}_backup`);
      setHasBackup(false);
      setBackupTimestamp(null);
    } catch (err) {
      console.error('[autosave] clear backup draft failed:', err);
    }
  }, [storageKey]);

  // ── Effect: read draft & backup metadata on mount ──────────────────────────

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setHasDraft(true);
      setDraftTimestamp(draft.timestamp ?? null);
    }

    try {
      const storedBackup = localStorage.getItem(`${storageKey}_backup`);
      if (storedBackup) {
        setHasBackup(true);
        const parsed = JSON.parse(storedBackup);
        setBackupTimestamp(parsed.timestamp ?? null);
      }
    } catch (err) {
      // ignore
    }
  }, [readDraft, storageKey]);

  // ── Effect: 1 DEBOUNCE + 2 DIRTY FLAG → local draft ─────────────────────

  useEffect(() => {
    if (!enabled) return;
    if (!initializedRef.current) { initializedRef.current = true; return; }

    clearTimeout(localDebounceRef.current);
    localDebounceRef.current = setTimeout(() => {
      // DIRTY FLAG: skip if this snapshot is already what the server has —
      // otherwise a state update that merely reflects a just-completed save
      // (e.g. the server assigning an _id) re-writes a "phantom" local draft
      // moments after clearDraft() just removed it.
      if (fingerprint(data) === lastSavedFingerprintRef.current) return;
      persistLocalDraft(data);
    }, localDebounceMs);

    return () => clearTimeout(localDebounceRef.current);
  }, [data, enabled, localDebounceMs, persistLocalDraft]);

  // ── Effect: 1 DEBOUNCE + 2 DIRTY FLAG + 4 + 5 + 6 → server save ─────────

  useEffect(() => {
    if (!enabled) return;
    if (hasMeaningfulData && !hasMeaningfulData(data)) return;

    // DIRTY FLAG: skip if data hasn't changed
    const fp = fingerprint(data);
    if (fp === lastSavedFingerprintRef.current) return;

    // Reset safety flag since data has changed (user started typing again)
    skipUnloadSaveRef.current = false;

    // Freeze snapshot NOW (prepared statement binding)
    const snapshot: T = JSON.parse(fp) as T;
    versionRef.current += 1;
    const job: SaveJob<T> = { payload: snapshot, version: versionRef.current, attempt: 0 };

    clearTimeout(serverDebounceRef.current);
    serverDebounceRef.current = setTimeout(() => {
      executeServerSave(job);
    }, serverDebounceMs);

    return () => clearTimeout(serverDebounceRef.current);
  }, [data, enabled, executeServerSave, hasMeaningfulData, serverDebounceMs]);

  // ── Effect: 3 PERIODIC INTERVAL — safety net ─────────────────────────────

  useEffect(() => {
    if (!enabled) return;

    periodicIntervalRef.current = setInterval(() => {
      const snapshot = dataRef.current;
      if (hasMeaningfulData && !hasMeaningfulData(snapshot)) return;

      const fp = fingerprint(snapshot);
      if (fp === lastSavedFingerprintRef.current) return; // still clean

      // Force a local draft write as safety net (even if server fails)
      persistLocalDraft(snapshot);

      // If no in-flight save, also push to server
      if (!isSavingRef.current) {
        versionRef.current += 1;
        executeServerSave({ payload: snapshot, version: versionRef.current, attempt: 0 });
      }
    }, periodicIntervalMs);

    return () => clearInterval(periodicIntervalRef.current);
  }, [enabled, executeServerSave, hasMeaningfulData, periodicIntervalMs, persistLocalDraft]);

  // ── Effect: save to localStorage on page unload ───────────────────────────

  useEffect(() => {
    if (!enabled) return;
    const handleUnload = () => {
      if (skipUnloadSaveRef.current) {
        clearDraft();
        return;
      }
      const currentFp = fingerprint(dataRef.current);
      // Only save draft if there are unsaved changes compared to last server save
      if (currentFp !== lastSavedFingerprintRef.current) {
        persistLocalDraft(dataRef.current);
      } else {
        clearDraft(); // Clean up if no unsaved changes
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      handleUnload(); // also check/save on React unmount (navigation)
      window.removeEventListener('beforeunload', handleUnload);
      // Pindah halaman di dalam CMS (mis. Back) tepat setelah mengetik: simpanan yang masih
      // menunggu debounce akan dibatalkan. Kirim sekarang supaya ketikan terakhir langsung ada
      // di server (bukan hanya draf lokal). Hanya untuk dokumen yang sudah punya _id: membuat
      // dokumen baru dari sini akan menavigasi balik ke editor yang baru saja ditinggalkan.
      const snapshot = dataRef.current as unknown as Record<string, unknown> | null;
      const dirty = fingerprint(dataRef.current) !== lastSavedFingerprintRef.current;
      const meaningful = !hasMeaningfulData || hasMeaningfulData(dataRef.current);
      if (!skipUnloadSaveRef.current && dirty && meaningful && snapshot && snapshot._id) {
        clearTimeout(serverDebounceRef.current);
        versionRef.current += 1;
        void executeServerSave({ payload: dataRef.current, version: versionRef.current, attempt: 0 });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, persistLocalDraft, clearDraft]);

  // ── Cleanup all timers on unmount ─────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTimeout(localDebounceRef.current);
      clearTimeout(serverDebounceRef.current);
      clearTimeout(statusResetRef.current);
      clearTimeout(retryTimeoutRef.current);
      clearInterval(periodicIntervalRef.current);
    };
  }, []);

  // ── Effect: Multi-Tab Collision Prevention ───────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const sessionKey = `active_editor_${storageKey}`;
    // Unique session ID for this tab instance
    const mySessionId = Math.random().toString(36).substring(2, 10) + '_' + Date.now();

    // Claim the active editing session
    localStorage.setItem(sessionKey, mySessionId);
    setHasCollision(false);

    const handleStorageChange = (e: StorageEvent) => {
      // If session key changes and the new value is not ours, another tab has opened this same article!
      if (e.key === sessionKey && e.newValue && e.newValue !== mySessionId) {
        setHasCollision(true);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      // Clean up session if we were the active session owner
      try {
        if (localStorage.getItem(sessionKey) === mySessionId) {
          localStorage.removeItem(sessionKey);
        }
      } catch (err) {
        // Ignore potential cross-origin or incognito restrictions
      }
    };
  }, [enabled, storageKey]);

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    status,
    errorMessage,
    hasDraft,
    draftTimestamp,
    saveNow,
    markAsSaved,
    clearDraft,
    readDraft,
    persistLocalDraft,
    hasCollision,
    hasBackup,
    backupTimestamp,
    readBackupDraft,
    clearBackupDraft,
  };
}
/**
 * Hapus draf lokal sebuah kunci beserta cadangannya.
 * Dipakai setelah tulisan BARU berhasil dibuat: draf "*_new" itu milik tulisan yang kini
 * sudah tersimpan, dan bila dibiarkan akan ditawarkan ("Draft Ditemukan") ke tulisan baru
 * berikutnya — memulihkannya menyalin isi tulisan lama ke tulisan baru.
 */
export function clearLocalDraft(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}_backup`);
  } catch {
    /* localStorage tidak tersedia: abaikan */
  }
}

/**
 * Buang draf lokal yang sudah usang (default > 3 hari). Dialog pemulihan hanya menawarkan
 * draf < 24 jam, jadi draf yang lebih tua tidak berguna dan hanya memenuhi kuota
 * localStorage (~5 MB) — kuota penuh membuat autosave lokal gagal diam-diam.
 */
export function pruneStaleDrafts(maxAgeMs = 3 * 86_400_000): void {
  try {
    const now = Date.now();
    for (const key of Object.keys(localStorage)) {
      if (!/^(writing|project|book)_draft_/.test(key)) continue;
      const raw = localStorage.getItem(key);
      let ts = 0;
      try { ts = JSON.parse(raw || '{}').timestamp || 0; } catch { /* rusak → buang */ }
      if (!ts || now - ts > maxAgeMs) localStorage.removeItem(key);
    }
  } catch {
    /* abaikan */
  }
}
