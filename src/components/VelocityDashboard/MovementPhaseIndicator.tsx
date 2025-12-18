'use client';

import React from 'react';
import { VELOCITY_COLORS } from './constants';
import type { MovementPhase } from '@/types/velocity';

interface MovementPhaseIndicatorProps {
  phase: MovementPhase;
  progress?: number; // 0-1
}

const PHASE_CONFIG: Record<
  MovementPhase,
  { label: string; labelKo: string; color: string; glow: string }
> = {
  eccentric: {
    label: 'Eccentric',
    labelKo: '하강',
    color: VELOCITY_COLORS.phase.eccentric,
    glow: VELOCITY_COLORS.phase.eccentricGlow,
  },
  concentric: {
    label: 'Concentric',
    labelKo: '상승',
    color: VELOCITY_COLORS.phase.concentric,
    glow: VELOCITY_COLORS.phase.concentricGlow,
  },
  isometric: {
    label: 'Hold',
    labelKo: '유지',
    color: VELOCITY_COLORS.phase.isometric,
    glow: 'transparent',
  },
  transition: {
    label: 'Transition',
    labelKo: '전환',
    color: VELOCITY_COLORS.textMuted,
    glow: 'transparent',
  },
};

export default function MovementPhaseIndicator({
  phase,
  progress = 0,
}: MovementPhaseIndicatorProps) {
  const config = PHASE_CONFIG[phase];

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{
        backgroundColor: VELOCITY_COLORS.surfaceElevated,
        boxShadow: `0 0 12px ${config.glow}`,
      }}
    >
      {/* Animated dot */}
      <span
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: config.color }}
      />
      {/* Phase label */}
      <span style={{ color: config.color }} className="text-sm font-medium">
        {config.labelKo}
      </span>
      {/* Progress bar */}
      {progress > 0 && (
        <div
          className="w-12 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: VELOCITY_COLORS.border }}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: config.color,
            }}
          />
        </div>
      )}
    </div>
  );
}
