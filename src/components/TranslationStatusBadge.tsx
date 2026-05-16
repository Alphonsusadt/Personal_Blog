import React from 'react';
import { CheckCircle, Clock, AlertCircle, RotateCcw } from 'lucide-react';

/**
 * TranslationStatusBadge Component
 * Shows translation status: pending, completed, failed
 * Allows rollback to previous version
 */
export function TranslationStatusBadge({
  status, // 'pending' | 'completed' | 'failed' | null
  method, // 'google_translate' | 'hybrid' | 'smartai' | null
  language, // 'en' | 'id'
  onRollback,
  className = '',
}) {
  if (!status) return null;

  const statusConfig = {
    completed: {
      icon: CheckCircle,
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      label: 'Translated',
    },
    pending: {
      icon: Clock,
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      label: 'Translating...',
    },
    failed: {
      icon: AlertCircle,
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      label: 'Failed',
    },
  };

  const config = statusConfig[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`${className}`}>
      <div className={`flex items-center gap-2 p-2 rounded-lg ${config.bg} border ${config.border}`}>
        <Icon className={`w-4 h-4 ${config.text} flex-shrink-0`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.text}`}>{config.label}</p>
          {method && language && (
            <p className="text-xs opacity-75">
              {method === 'google_translate' && 'Google Translate'}
              {method === 'hybrid' && 'Hybrid (Google + AI)'}
              {method === 'smartai' && 'Smart AI'}
              {' → '}
              {language === 'en' ? 'English' : 'Indonesian'}
            </p>
          )}
        </div>

        {/* Rollback Button */}
        {status === 'completed' && onRollback && (
          <button
            onClick={onRollback}
            className="ml-auto p-1 rounded hover:bg-slate-700/50 transition-colors"
            title="Rollback to previous version"
          >
            <RotateCcw className="w-4 h-4 opacity-50 hover:opacity-100" />
          </button>
        )}
      </div>
    </div>
  );
}
