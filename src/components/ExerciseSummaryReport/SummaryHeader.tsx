'use client';

import React from 'react';
import { SummaryHeaderProps } from './types';
import { SUMMARY_COLORS, EXERCISE_LABELS, SCORE_THRESHOLDS } from './constants';

export default function SummaryHeader({
  exerciseType,
  timestamp,
  duration,
  overallScore,
  language = 'ko',
}: SummaryHeaderProps) {
  const exerciseLabel = EXERCISE_LABELS[exerciseType]?.[language] || exerciseType;
  const formattedDate = new Date(timestamp).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDuration = formatDuration(duration);

  const scoreColor = overallScore >= SCORE_THRESHOLDS.good
    ? SUMMARY_COLORS.status.good
    : overallScore >= SCORE_THRESHOLDS.warning
    ? SUMMARY_COLORS.status.warning
    : SUMMARY_COLORS.status.error;

  return (
    <div className="relative p-6 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20 blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${scoreColor}40 0%, transparent 60%)`,
        }}
      />

      {/* Gradient accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${SUMMARY_COLORS.primary}, ${SUMMARY_COLORS.secondary})`,
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: SUMMARY_COLORS.textPrimary }}>
            {language === 'ko' ? '운동 요약' : 'Exercise Summary'}
          </h2>
          <p className="text-lg mt-1" style={{ color: SUMMARY_COLORS.textSecondary }}>
            {exerciseLabel}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-sm" style={{ color: SUMMARY_COLORS.textMuted }}>
              {formattedDate}
            </span>
            <span className="text-sm" style={{ color: SUMMARY_COLORS.textMuted }}>
              {formattedDuration}
            </span>
          </div>
        </div>

        {/* Score display */}
        <div className="text-center">
          <div
            className="text-5xl font-bold font-mono"
            style={{
              color: scoreColor,
              textShadow: `0 0 30px ${scoreColor}60`,
            }}
          >
            {overallScore}
          </div>
          <div className="text-xs mt-1" style={{ color: SUMMARY_COLORS.textMuted }}>
            {language === 'ko' ? '종합 점수' : 'Overall Score'}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
