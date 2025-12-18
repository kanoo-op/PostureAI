'use client';

import React, { useMemo } from 'react';
import { ImbalanceTrendChartProps } from './types';
import { BILATERAL_COLORS, JOINT_LABELS } from './constants';

export default function ImbalanceTrendChart({ history, jointType, compact = false }: ImbalanceTrendChartProps) {
  const chartData = useMemo(() => {
    return history.slice(-10).map((rep) => {
      const jointData = rep.angles.find((a) => a.jointType === jointType);
      return {
        rep: rep.repNumber,
        difference: jointData?.difference ?? 0,
        score: jointData?.symmetryScore ?? 0,
      };
    });
  }, [history, jointType]);

  if (chartData.length < 2) {
    return (
      <div
        className="p-3 rounded-lg text-center text-xs"
        style={{ backgroundColor: BILATERAL_COLORS.surfaceElevated, color: BILATERAL_COLORS.textMuted }}
      >
        최소 2회 반복 후 추세 표시 / Trend after 2+ reps
      </div>
    );
  }

  const maxDiff = Math.max(...chartData.map((d) => d.difference), 15);
  const chartHeight = compact ? 40 : 60;
  const jointColor = BILATERAL_COLORS.joint[jointType];
  const label = JOINT_LABELS[jointType];

  return (
    <div
      className="p-3 rounded-lg"
      style={{ backgroundColor: BILATERAL_COLORS.surfaceElevated }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: BILATERAL_COLORS.textSecondary }}>
          {label.ko} 추세 / {label.en} Trend
        </span>
        <span className="text-xs" style={{ color: jointColor }}>
          {chartData.length} reps
        </span>
      </div>

      <div className="flex items-end gap-1" style={{ height: chartHeight }}>
        {chartData.map((d, i) => {
          const barHeight = (d.difference / maxDiff) * 100;
          const barColor = d.difference <= 5
            ? BILATERAL_COLORS.status.good
            : d.difference <= 15
              ? BILATERAL_COLORS.status.warning
              : BILATERAL_COLORS.status.error;

          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all duration-300"
              style={{
                height: `${Math.max(barHeight, 5)}%`,
                backgroundColor: barColor,
                opacity: 0.6 + (i / chartData.length) * 0.4,
              }}
              title={`Rep ${d.rep}: Δ${d.difference.toFixed(1)}°`}
            />
          );
        })}
      </div>
    </div>
  );
}
