'use client';

import React from 'react';
import { VELOCITY_COLORS } from './constants';
import type { TempoAnalysis } from '@/types/velocity';

interface TempoFeedbackCardProps {
  tempo: TempoAnalysis | null;
  currentFeedback: string;
  overallQuality: 'good' | 'warning' | 'error';
}

const QUALITY_STYLES = {
  good: {
    border: VELOCITY_COLORS.status.good,
    bg: VELOCITY_COLORS.status.goodBg,
    glow: VELOCITY_COLORS.status.goodGlow,
  },
  warning: {
    border: VELOCITY_COLORS.status.warning,
    bg: VELOCITY_COLORS.status.warningBg,
    glow: VELOCITY_COLORS.status.warningGlow,
  },
  error: {
    border: VELOCITY_COLORS.status.error,
    bg: VELOCITY_COLORS.status.errorBg,
    glow: VELOCITY_COLORS.status.errorGlow,
  },
};

export default function TempoFeedbackCard({
  tempo,
  currentFeedback,
  overallQuality,
}: TempoFeedbackCardProps) {
  const styles = QUALITY_STYLES[overallQuality];

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: styles.bg,
        borderColor: styles.border,
        boxShadow: `0 0 20px ${styles.glow}`,
      }}
    >
      {/* Current feedback */}
      <p className="text-sm font-medium mb-3" style={{ color: styles.border }}>
        {currentFeedback || '동작을 시작하세요'}
      </p>

      {/* Tempo ratio display */}
      {tempo && (
        <div
          className="flex items-center gap-4 mt-2 pt-2 border-t"
          style={{ borderColor: VELOCITY_COLORS.border }}
        >
          <div className="text-center">
            <span className="text-xs" style={{ color: VELOCITY_COLORS.textMuted }}>
              템포 비율
            </span>
            <p
              className="font-mono font-bold"
              style={{ color: VELOCITY_COLORS.textPrimary }}
            >
              {tempo.tempoRatio.toFixed(1)}:1
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs" style={{ color: VELOCITY_COLORS.textMuted }}>
              하강
            </span>
            <p className="font-mono" style={{ color: VELOCITY_COLORS.phase.eccentric }}>
              {(tempo.eccentricDuration / 1000).toFixed(1)}s
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs" style={{ color: VELOCITY_COLORS.textMuted }}>
              상승
            </span>
            <p className="font-mono" style={{ color: VELOCITY_COLORS.phase.concentric }}>
              {(tempo.concentricDuration / 1000).toFixed(1)}s
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
