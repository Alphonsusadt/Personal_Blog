import { useState, useEffect, useCallback } from 'react';

interface DraftData<T> {
  data: T;
  timestamp: number;
  version: number;
}

/**
 * Hook untuk autosave ke localStorage
 * Menyimpan draft secara otomatis setiap kali data berubah
 * Memungkinkan recovery jika browser ditutup atau crash
 */
export function useLocalDraft<T>(
  key: string,
  _initialData: T,
  options: {
    debounceMs?: number;
    onRestore?: (data: T, timestamp: number) => void;
  } = {}
) {
  const { debounceMs = 1000, onRestore } = options;
  const storageKey = `cms_draft_${key}`;

  // Check for existing draft on mount
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

  // Load initial data from localStorage if exists
  const loadDraft = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: DraftData<T> = JSON.parse(saved);
        return parsed.data;
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
    return null;
  }, [storageKey]);

  // Check if draft exists
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: DraftData<T> = JSON.parse(saved);
        setHasDraft(true);
        setDraftTimestamp(parsed.timestamp);
      }
    } catch (e) {
      console.error('Failed to check draft:', e);
    }
  }, [storageKey]);

  // Save draft to localStorage with debounce
  const saveDraft = useCallback((data: T) => {
    try {
      const draftData: DraftData<T> = {
        data,
        timestamp: Date.now(),
        version: 1,
      };
      localStorage.setItem(storageKey, JSON.stringify(draftData));
      setHasDraft(true);
      setDraftTimestamp(draftData.timestamp);
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  }, [storageKey]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftTimestamp(null);
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  }, [storageKey]);

  // Restore draft and notify
  const restoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft && draftTimestamp && onRestore) {
      onRestore(draft, draftTimestamp);
    }
    return draft;
  }, [loadDraft, draftTimestamp, onRestore]);

  // Auto-save effect with debounce
  const useAutoSave = (data: T, enabled: boolean = true) => {
    useEffect(() => {
      if (!enabled) return;

      const timeout = setTimeout(() => {
        saveDraft(data);
      }, debounceMs);

      return () => clearTimeout(timeout);
    }, [data, enabled]);
  };

  return {
    hasDraft,
    draftTimestamp,
    loadDraft,
    saveDraft,
    clearDraft,
    restoreDraft,
    useAutoSave,
  };
}

/**
 * Format timestamp untuk display
 */
export function formatDraftTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return 'Baru saja';
  } else if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins} menit yang lalu`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} jam yang lalu`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
