'use client';

import React from 'react';
import { AngleStatisticsCardProps } from './types';
import { SUMMARY_COLORS, JOINT_LABELS } from './constants';

export default function AngleStatisticsCard({
  statistics,
  language = 'ko',
}: AngleStatisticsCardProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: SUMMARY_COLORS.surface,
        border: `1px solid ${SUMMARY_COLORS.border}`,
      }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: SUMMARY_COLORS.textSecondary }}>
        {language === 'ko' ? '3D 각도 통계' : '3D Angle Statistics'}
      </h3>

      <div className="space-y-3">
        {statistics.map((stat) => {
          const label = JOINT_LABELS[stat.jointType]?.[language] || stat.jointType;
          return (
            <div key={stat.jointType} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: SUMMARY_COLORS.textPrimary }}>
                {label}
              </span>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span style={{ color: SUMMARY_COLORS.accent.cyan }}>
                  Min: {stat.min}°
                </span>
                <span style={{ color: SUMMARY_COLORS.accent.amber }}>
                  Avg: {stat.average}°
                </span>
                <span style={{ color: SUMMARY_COLORS.accent.violet }}>
                  Max: {stat.max}°
                </span>
                <span style={{ color: SUMMARY_COLORS.textMuted }}>
                  (±{stat.stdDev}°)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
