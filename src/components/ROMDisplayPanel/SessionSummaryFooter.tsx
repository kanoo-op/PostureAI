'use client';

import React from 'react';
import { ROM_COLORS, ROM_LABELS } from './constants';
import { SessionSummaryFooterProps } from './types';
import { getROMStatus } from '@/utils/jointROMAnalyzer';

export default function SessionSummaryFooter({
  summary,
  compact = false,
}: SessionSummaryFooterProps) {
  if (!summary) return null;

  const overallStatus = getROMStatus(summary.overallMobility);

  return (
    <div
      className="px-4 py-3 border-t"
      style={{ borderColor: ROM_COLORS.border }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium"
          style={{ color: ROM_COLORS.textSecondary }}
        >
          {ROM_LABELS.overallMobility.ko}
        </span>

        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: overallStatus.color }}
          />
          <span
            className="text-sm font-semibold"
            style={{ color: overallStatus.color }}
          >
            {overallStatus.label}
          </span>
        </div>
      </div>

      {/* Recommendations preview (non-compact) */}
      {!compact && summary.recommendations.length > 0 && (
        <div
          className="mt-2 text-xs"
          style={{ color: ROM_COLORS.textMuted }}
        >
          {summary.recommendations[0].message}
        </div>
      )}
    </div>
  );
}
