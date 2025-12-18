'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS, COMPARISON_COLORS } from './translations';
import { DateTimeDisplay } from './DateTimeDisplay';
import { formatDuration } from '@/utils/dateFormatter';
import type { VideoSessionRecord } from '@/types/sessionHistory';

interface ScoreComparisonCardProps {
  session: VideoSessionRecord;
  index: number;
  language: 'ko' | 'en';
}

function getSessionColor(index: number): string {
  const colors = [COMPARISON_COLORS.sessionA, COMPARISON_COLORS.sessionB, COMPARISON_COLORS.sessionC];
  return colors[index] || colors[0];
}

function getScoreBarWidth(score: number): string {
  return `${Math.min(score, 100)}%`;
}

export function ScoreComparisonCard({
  session,
  index,
  language,
}: ScoreComparisonCardProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];
  const sessionColor = getSessionColor(index);
  const exerciseLabel = t[session.exerciseType] || session.exerciseType;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
      }}
    >
      {/* Session Label */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: sessionColor }}
        />
        <span
          className="text-sm font-medium"
          style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
        >
          {language === 'ko' ? `세션 ${String.fromCharCode(65 + index)}` : `Session ${String.fromCharCode(65 + index)}`}
        </span>
      </div>

      {/* Date */}
      <DateTimeDisplay
        timestamp={session.timestamp}
        language={language}
        showTime
        className="text-sm block mb-3"
      />

      {/* Score */}
      <div className="mb-4">
        <div className="flex items-end gap-2 mb-2">
          <span
            className="text-3xl font-bold"
            style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
          >
            {session.overallScore}
          </span>
          <span
            className="text-sm mb-1"
            style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
          >
            / 100
          </span>
        </div>

        {/* Score Bar */}
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: getScoreBarWidth(session.overallScore),
              backgroundColor: sessionColor,
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-3 gap-2 text-center text-sm"
        style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
      >
        <div>
          <p style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}>{t.reps}</p>
          <p style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }} className="font-medium">
            {session.totalReps}
          </p>
        </div>
        <div>
          <p style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}>{t.duration}</p>
          <p style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }} className="font-medium">
            {formatDuration(session.duration)}
          </p>
        </div>
        <div>
          <p style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}>{exerciseLabel}</p>
          <p style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }} className="font-medium">
            {session.consistency.overallConsistency}%
          </p>
        </div>
      </div>
    </div>
  );
}
