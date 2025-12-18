'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';
import type { VideoExerciseType } from '@/types/video';

interface CompareWithPreviousButtonProps {
  currentExerciseType: VideoExerciseType;
  onOpenComparison: () => void;
  language: 'ko' | 'en';
}

export function CompareWithPreviousButton({
  currentExerciseType,
  onOpenComparison,
  language,
}: CompareWithPreviousButtonProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];

  return (
    <button
      onClick={onOpenComparison}
      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        color: VIDEO_ANALYSIS_COLORS.textSecondary,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
      }}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke={VIDEO_ANALYSIS_COLORS.secondary}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <span>{t.compareWithPrevious}</span>
    </button>
  );
}
