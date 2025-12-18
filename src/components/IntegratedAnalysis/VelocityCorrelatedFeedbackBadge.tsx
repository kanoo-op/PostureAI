'use client';

import React from 'react';
import { INTEGRATED_COLORS } from './constants';
import type { VelocityContext } from '@/types/integratedAnalysis';

interface VelocityCorrelatedFeedbackBadgeProps {
  velocityContext: VelocityContext;
  message?: string;
  className?: string;
}

export default function VelocityCorrelatedFeedbackBadge({
  velocityContext,
  message,
  className = '',
}: VelocityCorrelatedFeedbackBadgeProps) {
  if (!velocityContext) return null;

  const contextConfig = {
    high_velocity: {
      label: 'High Velocity',
      color: INTEGRATED_COLORS.quality.rushed,
      bg: INTEGRATED_COLORS.quality.rushedBg,
    },
    optimal_velocity: {
      label: 'Optimal',
      color: INTEGRATED_COLORS.quality.controlled,
      bg: INTEGRATED_COLORS.quality.controlledBg,
    },
    low_velocity: {
      label: 'Low Velocity',
      color: INTEGRATED_COLORS.velocity.slow,
      bg: 'rgba(59, 130, 246, 0.1)',
    },
  };

  const config = contextConfig[velocityContext];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      <span>{config.label}</span>
      {message && <span className="opacity-75">: {message}</span>}
    </div>
  );
}
