import React, { useEffect, useState, useCallback } from 'react';
import { Check, Clock, AlertCircle, RefreshCw, HardDrive, CloudOff, Cloud, Save } from 'lucide-react';
import type { AutosaveStatus } from '../hooks/useAdminAutosave';
import { formatDraftTime } from '../hooks/useLocalDraft';

interface AutosaveStatusBarProps {
  /** Current autosave status from useAdminAutosave */
  status: AutosaveStatus;
  /** Error message when status === 'error' */
  errorMessage?: string;
  /** Whether there is a local draft in localStorage */
  hasDraft?: boolean;
  /** Timestamp of the local draft */
  draftTimestamp?: number | null;
  /** Called when user manually triggers save (e.g. Ctrl+S) */
  onSaveNow?: () => void | Promise<void>;
  /** Whether the document has never been saved to server */
  isNew?: boolean;
  /** Last time the server confirmed a save (ISO string or Date) */
  lastServerSavedAt?: string | Date | null;
  /** Extra class names for the wrapper */
  className?: string;
}

/**
 * AutosaveStatusBar
 * A rich, animated status row that communicates the full autosave lifecycle:
 *  - Idle / clean           → subtle "All saved" badge + last-saved time
 *  - Debouncing (local)     → pulsing dot "Unsaved changes"
 *  - Saving to server       → spinning cloud icon "Saving…"
 *  - Retrying               → orange spinner + attempt counter
 *  - Saved (flash)          → green checkmark "Saved ✓" (fades after 2s)
 *  - Error                  → red alert + "Retry" button
 *  - hasDraft (no server)   → hard-drive icon "Draft saved locally"
 * Ctrl+S fires onSaveNow if provided.
 */
export function AutosaveStatusBar({
  status,
  errorMessage,
  hasDraft,
  draftTimestamp,
  onSaveNow,
  isNew,
  lastServerSavedAt,
  className = '',
}: AutosaveStatusBarProps) {
  const [relativeTime, setRelativeTime] = useState('');
  const [saving, setSaving] = useState(false);

  // Update relative time string every 30s
  useEffect(() => {
    const compute = () => {
      if (lastServerSavedAt) {
        const ts = typeof lastServerSavedAt === 'string'
          ? new Date(lastServerSavedAt).getTime()
          : lastServerSavedAt.getTime();
        setRelativeTime(formatDraftTime(ts));
      } else if (draftTimestamp) {
        setRelativeTime(formatDraftTime(draftTimestamp));
      }
    };
    compute();
    const timer = setInterval(compute, 30_000);
    return () => clearInterval(timer);
  }, [lastServerSavedAt, draftTimestamp]);

  // Ctrl+S shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (onSaveNow && !saving) {
        setSaving(true);
        Promise.resolve(onSaveNow()).finally(() => setSaving(false));
      }
    }
  }, [onSaveNow, saving]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Render per-state ──────────────────────────────────────────────────────

  const renderStatus = () => {
    // Error state — most prominent
    if (status === 'error') {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/15 border border-red-500/40 rounded-lg">
            <CloudOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-xs font-medium text-red-300">Gagal menyimpan</span>
            {errorMessage && (
              <span className="text-[10px] text-red-400/80 hidden sm:inline">— {errorMessage}</span>
            )}
          </div>
          {onSaveNow && (
            <button
              onClick={() => {
                setSaving(true);
                Promise.resolve(onSaveNow()).finally(() => setSaving(false));
              }}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${saving ? 'animate-spin' : ''}`} />
              Coba Lagi
            </button>
          )}
        </div>
      );
    }

    // Retrying
    if (status === 'retrying') {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <RefreshCw className="w-3.5 h-3.5 text-orange-400 animate-spin flex-shrink-0" />
          <span className="text-xs text-orange-300">
            {errorMessage || 'Mencoba ulang…'}
          </span>
        </div>
      );
    }

    // Actively saving
    if (status === 'saving') {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Cloud className="w-3.5 h-3.5 text-blue-400 animate-pulse flex-shrink-0" />
          <span className="text-xs text-blue-300">Menyimpan…</span>
        </div>
      );
    }

    // Just saved (brief flash)
    if (status === 'saved') {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg animate-pulse">
          <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          <span className="text-xs font-medium text-green-300">Tersimpan ✓</span>
        </div>
      );
    }

    // Idle — show draft / last-saved info
    if (hasDraft && !lastServerSavedAt) {
      // Only locally saved (new document never pushed to server)
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[#475569]" title={`Draft lokal: ${relativeTime}`}>
          <HardDrive className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[11px]">
            Draft lokal {relativeTime ? `· ${relativeTime}` : ''}
          </span>
        </div>
      );
    }

    if (lastServerSavedAt || (isNew === false)) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#475569]" title={`Server: ${relativeTime}`}>
          <Check className="w-3 h-3 flex-shrink-0 text-[#334155]" />
          <span className="text-[11px]">
            {relativeTime ? `Disimpan ${relativeTime}` : 'Semua tersimpan'}
          </span>
        </div>
      );
    }

    return null; // truly idle + new doc with no changes
  };

  const statusContent = renderStatus();

  // Ctrl+S button hint (only when there's unsaved state or save handler)
  const showSaveButton = onSaveNow && (status === 'saving' || status === 'saved' || status === 'idle' || status === 'error');

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Live status pill */}
      {statusContent}

      {/* Unsaved local change dot — shows when debouncing (idle but hasDraft and no server sync yet) */}
      {status === 'idle' && hasDraft && !lastServerSavedAt && (
        <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
          <Clock className="w-3 h-3" />
          <span className="hidden sm:inline">Belum ke server</span>
        </div>
      )}

      {/* Ctrl+S shortcut save button */}
      {showSaveButton && onSaveNow && (
        <button
          onClick={() => {
            setSaving(true);
            Promise.resolve(onSaveNow()).finally(() => setSaving(false));
          }}
          disabled={saving || status === 'saving'}
          title="Simpan sekarang (Ctrl+S)"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#475569] hover:text-[#94A3B8] hover:bg-[#1E293B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ctrl+S</span>
        </button>
      )}
    </div>
  );
}
