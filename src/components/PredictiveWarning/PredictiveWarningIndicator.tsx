'use client';

import React from 'react';
import { PREDICTION_COLORS, URGENCY_STYLES } from './constants';
import type { PredictiveWarning } from '@/types/prediction';

interface PredictiveWarningIndicatorProps {
  warning: PredictiveWarning;
  className?: string;
}

export default function PredictiveWarningIndicator({
  warning,
  className = '',
}: PredictiveWarningIndicatorProps) {
  const styles = URGENCY_STYLES[warning.urgency];
  const confidenceColor = warning.confidence > 0.8
    ? PREDICTION_COLORS.confidence.high
    : warning.confidence > 0.6
      ? PREDICTION_COLORS.confidence.medium
      : PREDICTION_COLORS.confidence.low;

  return (
    <div
      className={`rounded-xl p-3 border transition-all duration-200 ${className}`}
      style={{
        backgroundColor: styles.bg,
        borderColor: styles.border,
        boxShadow: `0 0 16px ${styles.glow}`,
      }}
    >
      {/* Header with urgency indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{styles.icon}</span>
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: styles.border }}
        >
          {warning.urgency === 'high' ? '\uC989\uC2DC \uC870\uCE58' : warning.urgency === 'medium' ? '\uC8FC\uC758' : '\uC608\uCE21'}
        </span>
        <div className="flex-1" />
        {/* Time to issue */}
        <span
          className="text-xs font-mono"
          style={{ color: PREDICTION_COLORS.textMuted }}
        >
          {warning.timeToIssue < 1000
            ? `${Math.round(warning.timeToIssue)}ms`
            : `${(warning.timeToIssue / 1000).toFixed(1)}s`}
        </span>
      </div>

      {/* Warning message */}
      <p
        className="text-sm font-medium mb-2"
        style={{ color: PREDICTION_COLORS.textPrimary }}
      >
        {warning.message}
      </p>

      {/* Correction suggestion */}
      <p
        className="text-xs"
        style={{ color: PREDICTION_COLORS.textSecondary }}
      >
        {'\u{1F4A1}'} {warning.correction}
      </p>

      {/* Confidence bar */}
      <div className="mt-2 flex items-center gap-2">
        <div
          className="flex-1 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: PREDICTION_COLORS.border }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${warning.confidence * 100}%`,
              backgroundColor: confidenceColor,
            }}
          />
        </div>
        <span
          className="text-xs font-mono"
          style={{ color: confidenceColor }}
        >
          {Math.round(warning.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}
