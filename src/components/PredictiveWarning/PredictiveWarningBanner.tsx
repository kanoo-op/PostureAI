'use client';

import React from 'react';
import { PREDICTION_COLORS, URGENCY_STYLES } from './constants';
import type { PredictiveWarning } from '@/types/prediction';

interface PredictiveWarningBannerProps {
  warnings: PredictiveWarning[];
  className?: string;
}

export default function PredictiveWarningBanner({
  warnings,
  className = '',
}: PredictiveWarningBannerProps) {
  if (warnings.length === 0) return null;

  // Show highest urgency warning
  const sortedWarnings = [...warnings].sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  const topWarning = sortedWarnings[0];
  const styles = URGENCY_STYLES[topWarning.urgency];

  return (
    <div
      className={`rounded-lg px-4 py-2 border flex items-center gap-3 animate-pulse ${className}`}
      style={{
        backgroundColor: styles.bg,
        borderColor: styles.border,
        boxShadow: `0 0 20px ${styles.glow}`,
        animationDuration: topWarning.urgency === 'high' ? '0.5s' : '1s',
      }}
    >
      <span className="text-xl">{styles.icon}</span>
      <div className="flex-1">
        <p
          className="text-sm font-medium"
          style={{ color: PREDICTION_COLORS.textPrimary }}
        >
          {topWarning.message}
        </p>
      </div>
      {warnings.length > 1 && (
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            backgroundColor: PREDICTION_COLORS.surface,
            color: PREDICTION_COLORS.textSecondary,
          }}
        >
          +{warnings.length - 1}
        </span>
      )}
    </div>
  );
}
