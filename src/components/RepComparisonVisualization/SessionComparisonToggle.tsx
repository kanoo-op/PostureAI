'use client';

import React from 'react';
import { SessionComparisonToggleProps } from './types';
import { REP_COMPARISON_COLORS } from './constants';

export default function SessionComparisonToggle({
  isEnabled,
  onToggle,
}: SessionComparisonToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        backgroundColor: isEnabled
          ? REP_COMPARISON_COLORS.status.goodBg
          : REP_COMPARISON_COLORS.surfaceElevated,
        color: isEnabled ? REP_COMPARISON_COLORS.primary : REP_COMPARISON_COLORS.textSecondary,
        borderColor: isEnabled ? REP_COMPARISON_COLORS.primary : REP_COMPARISON_COLORS.border,
        borderWidth: 1,
        borderStyle: 'solid',
      }}
      role="switch"
      aria-checked={isEnabled}
      aria-label="Toggle session comparison mode"
    >
      {/* Toggle switch indicator */}
      <div
        className="relative w-8 h-4 rounded-full transition-colors"
        style={{
          backgroundColor: isEnabled
            ? REP_COMPARISON_COLORS.primary
            : REP_COMPARISON_COLORS.border,
        }}
      >
        <div
          className="absolute top-0.5 w-3 h-3 rounded-full transition-transform"
          style={{
            backgroundColor: REP_COMPARISON_COLORS.textPrimary,
            transform: isEnabled ? 'translateX(18px)' : 'translateX(2px)',
          }}
        />
      </div>

      <span>세션 비교 / Compare Sessions</span>
    </button>
  );
}
