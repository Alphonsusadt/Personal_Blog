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
  /** Async function that persists data to the server */
  saveToServer: (data: T) => Promise<void>;
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
  serverDebounceMs = 3000,
  periodicIntervalMs = 30_000,
  resetStatusMs = 1500,
  maxRetries = 3,
}: UseAdminAutosaveOptions<T>) {

  // ── UI state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

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

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftTimestamp(null);
    } catch (err) {
      console.error('[autosave] clear draft failed:', err);
    }
  }, [storageKey]);

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

    try {
      // PREPARED STMT: the payload snapshot was frozen at dirty-detection time,
      // so this call always uses a consistent, immutable data set — equivalent
      // to binding parameters in a prepared SQL statement.
      // ATOMIC WRITE: saveToServer must use $set on the server (not replace),
      // so only the changed fields are written — crash-safe.
      await saveToServerRef.current(job.payload);

      // Success — update dirty flag baseline
      lastSavedFingerprintRef.current = fp;
      retryQueueRef.current = null;
      clearDraft(); // Clear local draft since server is synced
      showSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (job.attempt < maxRetries) {
        // QUEUE + RETRY: exponential back-off
        const nextJob: SaveJob<T> = { ...job, attempt: job.attempt + 1 };
        retryQueueRef.current = nextJob;
        setStatus('retrying');
        setErrorMessage(`Retry ${nextJob.attempt}/${maxRetries}…`);

        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          const queued = retryQueueRef.current;
          if (queued) {
            isSavingRef.current = false;
            retryQueueRef.current = null;
            executeServerSave(queued);
          }
        }, retryDelay(job.attempt));
        return; // don't reset isSavingRef yet
      } else {
        // Exhausted retries
        setStatus('error');
        setErrorMessage(msg);
        retryQueueRef.current = null;
      }
    } finally {
      isSavingRef.current = false;

      // Drain queue if another save arrived while we were in-flight
      if (retryQueueRef.current && retryQueueRef.current.attempt === 0) {
        const queued = retryQueueRef.current;
        retryQueueRef.current = null;
        executeServerSave(queued);
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

  // ── Public: mark as saved (used by manual save to sync dirty flag) ────────
  
  const markAsSaved = useCallback((snapshot: T) => {
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

  // ── Effect: read draft metadata on mount ──────────────────────────────────

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setHasDraft(true);
      setDraftTimestamp(draft.timestamp ?? null);
    }
  }, [readDraft]);

  // ── Effect: 1 DEBOUNCE + 2 DIRTY FLAG → local draft ─────────────────────

  useEffect(() => {
    if (!enabled) return;
    if (!initializedRef.current) { initializedRef.current = true; return; }

    clearTimeout(localDebounceRef.current);
    localDebounceRef.current = setTimeout(() => {
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
    };
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
  };
}