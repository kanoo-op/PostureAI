'use client';

import React from 'react';
import { ROMAchievementSectionProps } from './types';
import { SUMMARY_COLORS, JOINT_LABELS } from './constants';

export default function ROMAchievementSection({
  achievements,
  language = 'ko',
}: ROMAchievementSectionProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: SUMMARY_COLORS.surface,
        border: `1px solid ${SUMMARY_COLORS.border}`,
      }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: SUMMARY_COLORS.textSecondary }}>
        {language === 'ko' ? 'ROM 달성도' : 'ROM Achievement'}
      </h3>

      <div className="space-y-4">
        {achievements.map((achievement) => {
          const label = JOINT_LABELS[achievement.jointType]?.[language] || achievement.jointType;
          const statusColor = achievement.assessment === 'normal'
            ? SUMMARY_COLORS.status.good
            : achievement.assessment === 'limited'
            ? SUMMARY_COLORS.status.warning
            : SUMMARY_COLORS.status.error;

          return (
            <div key={achievement.jointType}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm" style={{ color: SUMMARY_COLORS.textPrimary }}>
                  {label}
                </span>
                <span className="text-xs font-mono" style={{ color: statusColor }}>
                  {achievement.achieved}° / {achievement.benchmarkMax}° ({achievement.percentOfBenchmark}%)
                </span>
              </div>
              {/* Progress bar */}
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: SUMMARY_COLORS.surfaceElevated }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, achievement.percentOfBenchmark)}%`,
                    backgroundColor: statusColor,
                    boxShadow: `0 0 8px ${statusColor}60`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
