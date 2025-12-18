'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';

interface EmptyHistoryStateProps {
  onStartAnalysis: () => void;
  language: 'ko' | 'en';
}

export function EmptyHistoryState({ onStartAnalysis, language }: EmptyHistoryStateProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
      >
        <svg
          className="w-10 h-10"
          fill="none"
          stroke={VIDEO_ANALYSIS_COLORS.textMuted}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </div>
      <h2
        className="text-xl font-semibold mb-2"
        style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
      >
        {t.noHistory}
      </h2>
      <p
        className="mb-6 max-w-sm"
        style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
      >
        {language === 'ko'
          ? '첫 번째 운동 분석을 시작하여 진행 상황을 추적하세요'
          : 'Start your first exercise analysis to track your progress'}
      </p>
      <button
        onClick={onStartAnalysis}
        className="px-6 py-3 rounded-lg font-medium transition-colors"
        style={{
          backgroundColor: VIDEO_ANALYSIS_COLORS.primary,
          color: VIDEO_ANALYSIS_COLORS.background,
        }}
      >
        {t.startAnalysis}
      </button>
    </div>
  );
}
