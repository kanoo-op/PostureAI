'use client';

import React from 'react';
import { SymmetryScoreCardProps } from './types';
import { SUMMARY_COLORS, JOINT_LABELS } from './constants';

export default function SymmetryScoreCard({
  scores,
  language = 'ko',
}: SymmetryScoreCardProps) {
  if (scores.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: SUMMARY_COLORS.surface,
        border: `1px solid ${SUMMARY_COLORS.border}`,
      }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: SUMMARY_COLORS.textSecondary }}>
        {language === 'ko' ? '좌우 대칭 점수' : 'Bilateral Symmetry'}
      </h3>

      <div className="space-y-3">
        {scores.map((score) => {
          const label = JOINT_LABELS[score.jointType]?.[language] || score.jointType;
          const statusColor = SUMMARY_COLORS.status[score.level];
          const bgKey = `${score.level}Bg` as 'goodBg' | 'warningBg' | 'errorBg';

          return (
            <div key={score.jointType} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: SUMMARY_COLORS.textPrimary }}>
                {label}
              </span>
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono" style={{ color: SUMMARY_COLORS.textMuted }}>
                  L:{score.leftAverage}° R:{score.rightAverage}°
                </div>
                <div
                  className="px-2 py-1 rounded-md text-xs font-bold"
                  style={{
                    backgroundColor: SUMMARY_COLORS.status[bgKey],
                    color: statusColor,
                  }}
                >
                  {score.symmetryPercent}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
