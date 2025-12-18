'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS, COMPARISON_COLORS } from './translations';
import type { SessionComparisonResult } from '@/types/sessionHistory';

interface ProgressSummaryCardsProps {
  comparison: SessionComparisonResult;
  language: 'ko' | 'en';
}

export function ProgressSummaryCards({
  comparison,
  language,
}: ProgressSummaryCardsProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];
  const { sessions, averageScoreChange, consistencyTrend } = comparison;

  const bestSession = sessions.reduce((best, s) =>
    s.overallScore > best.overallScore ? s : best
  );

  const getTrendColor = () => {
    if (consistencyTrend === 'improving') return COMPARISON_COLORS.trendImproving;
    if (consistencyTrend === 'declining') return COMPARISON_COLORS.trendDeclining;
    return COMPARISON_COLORS.trendStable;
  };

  const getTrendLabel = () => {
    if (consistencyTrend === 'improving') return t.improvement;
    if (consistencyTrend === 'declining') return t.decline;
    return t.stable;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Average Improvement */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
          border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
        }}
      >
        <p
          className="text-sm mb-1"
          style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
        >
          {t.averageImprovement}
        </p>
        <div className="flex items-baseline gap-1">
          <span
            className="text-2xl font-bold"
            style={{
              color:
                averageScoreChange > 0
                  ? COMPARISON_COLORS.trendImproving
                  : averageScoreChange < 0
                    ? COMPARISON_COLORS.trendDeclining
                    : VIDEO_ANALYSIS_COLORS.textPrimary,
            }}
          >
            {averageScoreChange > 0 ? '+' : ''}
            {averageScoreChange.toFixed(1)}
          </span>
          <span style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}>
            {t.points}
          </span>
        </div>
      </div>

      {/* Total Sessions */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
          border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
        }}
      >
        <p
          className="text-sm mb-1"
          style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
        >
          {t.totalSessions}
        </p>
        <span
          className="text-2xl font-bold"
          style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
        >
          {sessions.length}
        </span>
      </div>

      {/* Best Session */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
          border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
        }}
      >
        <p
          className="text-sm mb-1"
          style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
        >
          {t.bestSession}
        </p>
        <span
          className="text-2xl font-bold"
          style={{ color: VIDEO_ANALYSIS_COLORS.statusGood }}
        >
          {bestSession.overallScore}
        </span>
      </div>

      {/* Consistency Trend */}
      <div
        className="rounded-xl p-4 md:col-span-3"
        style={{
          backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
          border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
        }}
      >
        <p
          className="text-sm mb-2"
          style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
        >
          {t.consistencyTrend}
        </p>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getTrendColor() }}
          />
          <span
            className="font-medium"
            style={{ color: getTrendColor() }}
          >
            {getTrendLabel()}
          </span>
        </div>
      </div>
    </div>
  );
}
