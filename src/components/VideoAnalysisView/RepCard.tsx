'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from './constants';
import type { RepAnalysisResult } from '@/types/video';

interface RepCardProps {
  rep: RepAnalysisResult;
  isSelected: boolean;
  isActive: boolean;
  onClick: () => void;
  language: 'ko' | 'en';
}

export default function RepCard({
  rep,
  isSelected,
  isActive,
  onClick,
  language,
}: RepCardProps) {
  const t = TRANSLATIONS[language];

  const getScoreColor = (score: number) => {
    if (score >= 80) return VIDEO_ANALYSIS_COLORS.statusGood;
    if (score >= 60) return VIDEO_ANALYSIS_COLORS.statusWarning;
    return VIDEO_ANALYSIS_COLORS.statusError;
  };

  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-xl text-left transition-all ${
        isActive ? 'ring-2 ring-offset-2 ring-offset-transparent animate-pulse' : ''
      }`}
      style={{
        backgroundColor: isSelected
          ? VIDEO_ANALYSIS_COLORS.surfaceElevated
          : VIDEO_ANALYSIS_COLORS.surface,
        border: `1px solid ${
          isSelected ? VIDEO_ANALYSIS_COLORS.primary : VIDEO_ANALYSIS_COLORS.border
        }`,
        boxShadow: isSelected
          ? `0 0 12px ${VIDEO_ANALYSIS_COLORS.primaryGlow}`
          : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-medium"
          style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
        >
          {t.repNumber.replace('{number}', String(rep.repNumber))}
        </span>
        <span
          className="text-2xl font-bold"
          style={{ color: getScoreColor(rep.score) }}
        >
          {rep.score}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}>
          {t.duration}: {formatDuration(rep.duration)}
        </span>
        {rep.primaryIssues.length > 0 && (
          <span style={{ color: VIDEO_ANALYSIS_COLORS.statusWarning }}>
            {rep.primaryIssues.length} {t.issues}
          </span>
        )}
      </div>
    </button>
  );
}
