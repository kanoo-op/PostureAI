'use client';

import React, { useMemo } from 'react';
import { RepQualityTrendChartProps } from './types';
import { SUMMARY_COLORS } from './constants';

export default function RepQualityTrendChart({
  trend,
  language = 'ko',
}: RepQualityTrendChartProps) {
  const { maxScore, minScore, pathData } = useMemo(() => {
    if (trend.length === 0) {
      return { maxScore: 0, minScore: 0, pathData: '' };
    }

    const scores = trend.map(t => t.score);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min || 1;

    // Generate SVG path
    const width = 100;
    const height = 50;
    const points = trend.map((t, i) => {
      const x = trend.length === 1 ? 50 : (i / (trend.length - 1)) * width;
      const y = height - ((t.score - min) / range) * height;
      return `${x},${y}`;
    });

    return {
      maxScore: max,
      minScore: min,
      pathData: `M ${points.join(' L ')}`,
    };
  }, [trend]);

  if (trend.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: SUMMARY_COLORS.surface,
        border: `1px solid ${SUMMARY_COLORS.border}`,
      }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: SUMMARY_COLORS.textSecondary }}>
        {language === 'ko' ? '반복별 품질 추세' : 'Rep-by-Rep Quality Trend'}
      </h3>

      {/* Simple line chart */}
      <div className="relative h-16">
        <svg
          viewBox="0 0 100 50"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke={SUMMARY_COLORS.border} strokeWidth="0.5" />

          {/* Trend line */}
          <path
            d={pathData}
            fill="none"
            stroke={SUMMARY_COLORS.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: `drop-shadow(0 0 4px ${SUMMARY_COLORS.primaryGlow})`,
            }}
          />

          {/* Data points */}
          {trend.map((t, i) => {
            const x = trend.length === 1 ? 50 : (i / (trend.length - 1)) * 100;
            const y = 50 - ((t.score - minScore) / (maxScore - minScore || 1)) * 50;
            const color = t.trend === 'improving'
              ? SUMMARY_COLORS.trend.improving
              : t.trend === 'declining'
              ? SUMMARY_COLORS.trend.declining
              : SUMMARY_COLORS.primary;

            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                fill={color}
              />
            );
          })}
        </svg>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs" style={{ color: SUMMARY_COLORS.textMuted }}>
        <span>Rep 1</span>
        <span>Rep {trend.length}</span>
      </div>
    </div>
  );
}
