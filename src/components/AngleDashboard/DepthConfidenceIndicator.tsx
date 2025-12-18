'use client';

import React from 'react';
import { DepthConfidenceResult } from '@/utils/depthNormalization';
import { DASHBOARD_COLORS } from './constants';

interface DepthConfidenceIndicatorProps {
  confidence: DepthConfidenceResult;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Visual indicator showing depth reliability status
 * Displays a colored dot/badge with optional label
 */
export default function DepthConfidenceIndicator({
  confidence,
  showLabel = false,
  size = 'md',
}: DepthConfidenceIndicatorProps) {
  // Determine color based on confidence score
  const getColors = () => {
    if (confidence.score >= 0.7) {
      return {
        bg: DASHBOARD_COLORS.depth?.reliable ?? '#00F5A0',
        glow: DASHBOARD_COLORS.depth?.reliableGlow ?? 'rgba(0, 245, 160, 0.4)',
      };
    } else if (confidence.score >= 0.5) {
      return {
        bg: DASHBOARD_COLORS.depth?.moderate ?? '#FFB800',
        glow: DASHBOARD_COLORS.depth?.moderateGlow ?? 'rgba(255, 184, 0, 0.4)',
      };
    } else {
      return {
        bg: DASHBOARD_COLORS.depth?.unreliable ?? '#FF3D71',
        glow: DASHBOARD_COLORS.depth?.unreliableGlow ?? 'rgba(255, 61, 113, 0.4)',
      };
    }
  };

  const colors = getColors();

  // Size mappings
  const sizeMap = {
    sm: { dot: 'w-2 h-2', text: 'text-xs' },
    md: { dot: 'w-3 h-3', text: 'text-sm' },
    lg: { dot: 'w-4 h-4', text: 'text-base' },
  };

  const sizeClasses = sizeMap[size];

  // Tooltip content
  const tooltipText = `3D Depth: ${Math.round(confidence.score * 100)}% reliable`;

  return (
    <div
      className="flex items-center gap-2 cursor-default"
      title={tooltipText}
    >
      {/* Colored dot with glow effect */}
      <span
        className={`${sizeClasses.dot} rounded-full`}
        style={{
          backgroundColor: colors.bg,
          boxShadow: `0 0 8px ${colors.glow}`,
        }}
      />

      {/* Optional label */}
      {showLabel && (
        <span
          className={`${sizeClasses.text} font-medium`}
          style={{ color: colors.bg }}
        >
          {confidence.fallbackMode === '3d' ? '3D' : '2D'}
        </span>
      )}
    </div>
  );
}
