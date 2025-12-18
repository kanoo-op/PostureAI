'use client';

import React from 'react';
import { DepthConfidenceResult } from '@/utils/depthNormalization';
import { DASHBOARD_COLORS } from './constants';

interface DepthConfidenceBadgeProps {
  confidence: DepthConfidenceResult;
  className?: string;
}

/**
 * Compact badge for inline display of depth confidence
 * Shows 3D/2D mode with color-coded status
 */
export default function DepthConfidenceBadge({
  confidence,
  className = '',
}: DepthConfidenceBadgeProps) {
  // Determine colors based on confidence score
  const getStatusColors = () => {
    if (confidence.score >= 0.7) {
      return {
        bg: DASHBOARD_COLORS.depth?.reliableBg ?? 'rgba(0, 245, 160, 0.1)',
        border: DASHBOARD_COLORS.depth?.reliable ?? '#00F5A0',
        text: DASHBOARD_COLORS.depth?.reliable ?? '#00F5A0',
      };
    } else if (confidence.score >= 0.5) {
      return {
        bg: DASHBOARD_COLORS.depth?.moderateBg ?? 'rgba(255, 184, 0, 0.1)',
        border: DASHBOARD_COLORS.depth?.moderate ?? '#FFB800',
        text: DASHBOARD_COLORS.depth?.moderate ?? '#FFB800',
      };
    } else {
      return {
        bg: DASHBOARD_COLORS.depth?.unreliableBg ?? 'rgba(255, 61, 113, 0.1)',
        border: DASHBOARD_COLORS.depth?.unreliable ?? '#FF3D71',
        text: DASHBOARD_COLORS.depth?.unreliable ?? '#FF3D71',
      };
    }
  };

  const colors = getStatusColors();

  // 3D cube icon SVG
  const CubeIcon = () => (
    <svg
      className="w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );

  // 2D square icon SVG
  const SquareIcon = () => (
    <svg
      className="w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  );

  const is3D = confidence.fallbackMode === '3d';

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${className}`}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}80`,
        color: colors.text,
      }}
      title={`${is3D ? '3D' : '2D'} Mode - ${Math.round(confidence.score * 100)}% confidence`}
    >
      {is3D ? <CubeIcon /> : <SquareIcon />}
      <span className="text-xs font-medium">
        {is3D ? '3D' : '2D'}
      </span>
    </div>
  );
}
