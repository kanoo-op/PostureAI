'use client';

import React, { useMemo } from 'react';
import { RepStatsSummaryProps } from './types';
import { REP_COMPARISON_COLORS } from './constants';

export default function RepStatsSummary({
  selectedReps,
  consistencyScore,
  averageDeviation,
}: RepStatsSummaryProps) {
  // Find best and worst reps
  const { bestRep, worstRep } = useMemo(() => {
    if (selectedReps.length === 0) {
      return { bestRep: null, worstRep: null };
    }

    const sorted = [...selectedReps].sort((a, b) => b.overallQuality - a.overallQuality);
    return {
      bestRep: sorted[0],
      worstRep: sorted[sorted.length - 1],
    };
  }, [selectedReps]);

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return REP_COMPARISON_COLORS.status.good;
    if (score >= 60) return REP_COMPARISON_COLORS.status.warning;
    return REP_COMPARISON_COLORS.status.error;
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return REP_COMPARISON_COLORS.status.goodBg;
    if (score >= 60) return REP_COMPARISON_COLORS.status.warningBg;
    return REP_COMPARISON_COLORS.status.errorBg;
  };

  if (selectedReps.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: REP_COMPARISON_COLORS.surfaceElevated }}
    >
      <h4
        className="text-xs font-semibold mb-3"
        style={{ color: REP_COMPARISON_COLORS.textSecondary }}
      >
        통계 요약 / Stats Summary
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Consistency Score */}
        <div className="space-y-1">
          <p className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
            일관성 점수 / Consistency
          </p>
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold"
              style={{ color: getScoreColor(consistencyScore) }}
            >
              {consistencyScore}%
            </span>
          </div>
          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: REP_COMPARISON_COLORS.border }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${consistencyScore}%`,
                backgroundColor: getScoreColor(consistencyScore),
              }}
            />
          </div>
        </div>

        {/* Average Deviation */}
        <div className="space-y-1">
          <p className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
            평균 편차 / Avg Deviation
          </p>
          <div className="flex items-center gap-1">
            <span
              className="text-lg font-bold"
              style={{
                color:
                  averageDeviation <= 5
                    ? REP_COMPARISON_COLORS.status.good
                    : averageDeviation <= 10
                      ? REP_COMPARISON_COLORS.status.warning
                      : REP_COMPARISON_COLORS.status.error,
              }}
            >
              {averageDeviation}
            </span>
            <span className="text-xs" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
              deg
            </span>
          </div>
        </div>

        {/* Best Rep */}
        {bestRep && (
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: getScoreBg(bestRep.overallQuality) }}
          >
            <p className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
              최고 / Best
            </p>
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-medium"
                style={{ color: REP_COMPARISON_COLORS.textPrimary }}
              >
                Rep {bestRep.repNumber}
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: getScoreColor(bestRep.overallQuality) }}
              >
                {bestRep.overallQuality}%
              </span>
            </div>
          </div>
        )}

        {/* Worst Rep */}
        {worstRep && selectedReps.length > 1 && (
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: getScoreBg(worstRep.overallQuality) }}
          >
            <p className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
              개선필요 / Needs Work
            </p>
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-medium"
                style={{ color: REP_COMPARISON_COLORS.textPrimary }}
              >
                Rep {worstRep.repNumber}
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: getScoreColor(worstRep.overallQuality) }}
              >
                {worstRep.overallQuality}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
