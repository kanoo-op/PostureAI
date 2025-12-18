'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';

interface NoMatchingSessionsStateProps {
  language: 'ko' | 'en';
}

export function NoMatchingSessionsState({ language }: NoMatchingSessionsStateProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke={VIDEO_ANALYSIS_COLORS.textMuted}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <p style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}>
        {t.noMatchingSessions}
      </p>
    </div>
  );
}
