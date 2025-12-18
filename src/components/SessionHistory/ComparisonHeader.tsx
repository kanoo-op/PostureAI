'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';

interface ComparisonHeaderProps {
  onClose: () => void;
  language: 'ko' | 'en';
}

export function ComparisonHeader({ onClose, language }: ComparisonHeaderProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];

  return (
    <div className="flex items-center justify-between mb-6">
      <h1
        className="text-2xl font-bold"
        style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
      >
        {t.overallProgress}
      </h1>
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
        style={{
          backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
          color: VIDEO_ANALYSIS_COLORS.textSecondary,
          border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        {t.close}
      </button>
    </div>
  );
}
