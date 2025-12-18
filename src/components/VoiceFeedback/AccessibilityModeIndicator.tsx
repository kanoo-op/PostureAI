'use client';

import React from 'react';

// Design tokens
const COLORS = {
  textMuted: '#64748B',
  textSecondary: '#94A3B8',
  surface: 'rgba(30, 41, 59, 0.95)',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
  voicePending: '#38BDF8',
};

interface AccessibilityModeIndicatorProps {
  isScreenReaderDetected: boolean;
  volumeReduced?: boolean;
}

export function AccessibilityModeIndicator({
  isScreenReaderDetected,
  volumeReduced = true,
}: AccessibilityModeIndicatorProps) {
  if (!isScreenReaderDetected) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: `${COLORS.voicePending}10`,
        border: `1px solid ${COLORS.voicePending}30`,
        borderRadius: '8px',
      }}
      role="status"
      aria-live="polite"
    >
      {/* Info icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={COLORS.voicePending}
          strokeWidth="2"
        />
        <line
          x1="12"
          y1="16"
          x2="12"
          y2="12"
          stroke={COLORS.voicePending}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="8" r="1" fill={COLORS.voicePending} />
      </svg>

      {/* Text */}
      <span
        style={{
          fontSize: '12px',
          color: COLORS.textSecondary,
        }}
      >
        {volumeReduced
          ? 'Volume reduced for screen reader compatibility'
          : 'Screen reader detected'}
      </span>
    </div>
  );
}
