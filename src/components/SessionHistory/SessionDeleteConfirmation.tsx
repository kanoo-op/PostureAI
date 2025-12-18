'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';
import { formatSessionDate } from '@/utils/dateFormatter';

interface SessionDeleteConfirmationProps {
  isOpen: boolean;
  sessionDate: number;
  onConfirm: () => void;
  onCancel: () => void;
  language: 'ko' | 'en';
}

export function SessionDeleteConfirmation({
  isOpen,
  sessionDate,
  onConfirm,
  onCancel,
  language,
}: SessionDeleteConfirmationProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="relative z-10 max-w-sm w-full mx-4 rounded-xl p-6"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
      >
        <h3
          className="text-lg font-semibold mb-2"
          style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
        >
          {t.deleteConfirmTitle}
        </h3>
        <p
          className="mb-2"
          style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
        >
          {formatSessionDate(sessionDate, language === 'ko' ? 'ko-KR' : 'en-US')}
        </p>
        <p
          className="mb-6"
          style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
        >
          {t.deleteConfirmMessage}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
              color: VIDEO_ANALYSIS_COLORS.textPrimary,
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.statusError,
              color: VIDEO_ANALYSIS_COLORS.textPrimary,
            }}
          >
            {t.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
