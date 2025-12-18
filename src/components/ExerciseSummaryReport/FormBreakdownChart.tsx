'use client';

import React from 'react';
import { FormBreakdownChartProps } from './types';
import { SUMMARY_COLORS } from './constants';

export default function FormBreakdownChart({
  breakdown,
  language = 'ko',
}: FormBreakdownChartProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: SUMMARY_COLORS.surface,
        border: `1px solid ${SUMMARY_COLORS.border}`,
      }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: SUMMARY_COLORS.textSecondary }}>
        {language === 'ko' ? '자세 분석' : 'Form Breakdown'}
      </h3>

      {/* Horizontal stacked bar */}
      <div className="h-6 rounded-full overflow-hidden flex" style={{ backgroundColor: SUMMARY_COLORS.surfaceElevated }}>
        {breakdown.map((item) => (
          <div
            key={item.type}
            className="h-full transition-all duration-500"
            style={{
              width: `${item.percentage}%`,
              backgroundColor: SUMMARY_COLORS.status[item.type],
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-between mt-4">
        {breakdown.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: SUMMARY_COLORS.status[item.type] }}
            />
            <span className="text-xs" style={{ color: SUMMARY_COLORS.textSecondary }}>
              {language === 'ko' ? item.label : item.labelEn} ({item.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
