import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAdminAutosaveOptions<T> {
  storageKey: string;
  data: T;
  enabled: boolean;
  saveToServer: (data: T) => Promise<void>;
  hasMeaningfulData?: (data: T) => boolean;
  localDebounceMs?: number;
  serverDebounceMs?: number;
  resetStatusMs?: number;
}

export function useAdminAutosave<T>({
  storageKey,
  data,
  enabled,
  saveToServer,
  hasMeaningfulData,
  localDebounceMs = 900,
  serverDebounceMs = 3000,
  resetStatusMs = 1500,
}: UseAdminAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

  const localTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const serverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const statusResetTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const localInitializedRef = useRef(false);
  const serverInitializedRef = useRef(false);

  const clearStatusResetTimeout = useCallback(() => {
    if (statusResetTimeoutRef.current) {
      clearTimeout(statusResetTimeoutRef.current);
      statusResetTimeoutRef.current = undefined;
    }
  }, []);

  const setSavedStatus = useCallback(() => {
    clearStatusResetTimeout();
    setStatus('saved');
    statusResetTimeoutRef.current = setTimeout(() => {
      setStatus('idle');
    }, resetStatusMs);
  }, [clearStatusResetTimeout, resetStatusMs]);

  const persistLocalDraft = useCallback((nextData: T) => {
    try {
      const timestamp = Date.now();
      localStorage.setItem(storageKey, JSON.stringify({ data: nextData, timestamp }));
      setHasDraft(true);
      setDraftTimestamp(timestamp);
    } catch (err) {
      console.error('Failed to persist local draft:', err);
    }
  }, [storageKey]);

  const saveNow = useCallback(async () => {
    if (!enabled) return;
    if (hasMeaningfulData && !hasMeaningfulData(data)) return;

    persistLocalDraft(data);
    setErrorMessage('');
    setStatus('saving');

    try {
      await saveToServer(data);
      setSavedStatus();
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
      clearStatusResetTimeout();
    }
  }, [clearStatusResetTimeout, data, enabled, hasMeaningfulData, persistLocalDraft, saveToServer, setSavedStatus]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftTimestamp(null);
    } catch (err) {
      console.error('Failed to clear local draft:', err);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setHasDraft(false);
        setDraftTimestamp(null);
        return;
      }

      const parsed = JSON.parse(raw) as { timestamp?: number };
      setHasDraft(true);
      setDraftTimestamp(typeof parsed.timestamp === 'number' ? parsed.timestamp : null);
    } catch (err) {
      console.error('Failed to read local draft metadata:', err);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) return;

    if (!localInitializedRef.current) {
      localInitializedRef.current = true;
      return;
    }

    clearTimeout(localTimeoutRef.current);
    localTimeoutRef.current = setTimeout(() => {
      persistLocalDraft(data);
    }, localDebounceMs);

    return () => clearTimeout(localTimeoutRef.current);
  }, [data, enabled, localDebounceMs, persistLocalDraft]);

  useEffect(() => {
    if (!enabled) return;

    if (!serverInitializedRef.current) {
      serverInitializedRef.current = true;
      return;
    }

    if (hasMeaningfulData && !hasMeaningfulData(data)) {
      return;
    }

    clearTimeout(serverTimeoutRef.current);
    serverTimeoutRef.current = setTimeout(async () => {
      setErrorMessage('');
      setStatus('saving');

      try {
        await saveToServer(data);
        setSavedStatus();
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : String(err));
        clearStatusResetTimeout();
      }
    }, serverDebounceMs);

    return () => clearTimeout(serverTimeoutRef.current);
  }, [clearStatusResetTimeout, data, enabled, hasMeaningfulData, saveToServer, serverDebounceMs, setSavedStatus]);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      persistLocalDraft(data);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [data, enabled, persistLocalDraft]);

  useEffect(() => {
    return () => {
      clearTimeout(localTimeoutRef.current);
      clearTimeout(serverTimeoutRef.current);
      clearTimeout(statusResetTimeoutRef.current);
    };
  }, []);

  return {
    status,
    errorMessage,
    hasDraft,
    draftTimestamp,
    saveNow,
    clearDraft,
    persistLocalDraft,
  };
}