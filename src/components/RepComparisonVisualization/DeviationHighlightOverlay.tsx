'use client';

import React from 'react';
import { DeviationHighlightOverlayProps } from './types';
import { REP_COMPARISON_COLORS, CHART_DIMENSIONS, DEVIATION_THRESHOLDS } from './constants';

export default function DeviationHighlightOverlay({
  deviationPoints,
  chartWidth,
  chartHeight,
}: DeviationHighlightOverlayProps) {
  const { marginTop, marginBottom } = CHART_DIMENSIONS;
  const innerHeight = chartHeight - marginTop - marginBottom;

  if (deviationPoints.length === 0) {
    return null;
  }

  // Get color based on severity
  const getSeverityColor = (severity: 'minor' | 'moderate' | 'significant') => {
    switch (severity) {
      case 'significant':
        return REP_COMPARISON_COLORS.status.error;
      case 'moderate':
        return REP_COMPARISON_COLORS.status.warning;
      case 'minor':
      default:
        return `${REP_COMPARISON_COLORS.status.warning}80`; // 50% opacity
    }
  };

  // Get size based on severity
  const getSeverityRadius = (severity: 'minor' | 'moderate' | 'significant') => {
    switch (severity) {
      case 'significant':
        return 3;
      case 'moderate':
        return 2.5;
      case 'minor':
      default:
        return 2;
    }
  };

  // Group deviation points by phase for band rendering
  const phaseGroups = new Map<number, typeof deviationPoints>();
  deviationPoints.forEach((point) => {
    const existing = phaseGroups.get(point.phasePercent) || [];
    existing.push(point);
    phaseGroups.set(point.phasePercent, existing);
  });

  return (
    <g className="deviation-overlay">
      {/* Deviation band background at significant deviation points */}
      {Array.from(phaseGroups.entries()).map(([phasePercent, points]) => {
        const hasSignificant = points.some((p) => p.severity === 'significant');
        const hasModerate = points.some((p) => p.severity === 'moderate');

        if (!hasSignificant && !hasModerate) return null;

        const bandWidth = 8;
        const x = phasePercent - bandWidth / 2;

        return (
          <rect
            key={`band-${phasePercent}`}
            x={x}
            y={marginTop}
            width={bandWidth}
            height={innerHeight}
            fill={
              hasSignificant
                ? REP_COMPARISON_COLORS.status.errorBg
                : REP_COMPARISON_COLORS.status.warningBg
            }
            opacity={0.3}
          />
        );
      })}

      {/* Deviation point markers */}
      {deviationPoints.map((point, idx) => {
        // Position based on phase percent (x) and center vertically with slight offset
        const cx = point.phasePercent;
        // Spread points vertically based on deviation magnitude
        const yOffset = (point.deviation / DEVIATION_THRESHOLDS.significant) * 10;
        const cy = marginTop + innerHeight / 2 + yOffset;

        return (
          <g key={`deviation-${idx}`}>
            {/* Glow effect */}
            <circle
              cx={cx}
              cy={cy}
              r={getSeverityRadius(point.severity) * 2}
              fill={getSeverityColor(point.severity)}
              opacity={0.2}
            />
            {/* Main marker */}
            <circle
              cx={cx}
              cy={cy}
              r={getSeverityRadius(point.severity)}
              fill={getSeverityColor(point.severity)}
              opacity={0.8}
            />
          </g>
        );
      })}
    </g>
  );
}
