'use client';

import React from 'react';
import { AngleValueTooltipProps } from './types';
import { REP_COMPARISON_COLORS, JOINT_ANGLE_LABELS, PHASE_LABELS } from './constants';

export default function AngleValueTooltip({
  visible,
  x,
  y,
  repNumber,
  jointType,
  value,
  deviation,
  phase,
}: AngleValueTooltipProps) {
  if (!visible) {
    return null;
  }

  const jointLabel = JOINT_ANGLE_LABELS[jointType];
  const phaseLabel = PHASE_LABELS[phase];

  // Get deviation color
  const deviationColor =
    Math.abs(deviation) <= 5
      ? REP_COMPARISON_COLORS.status.good
      : Math.abs(deviation) <= 10
        ? REP_COMPARISON_COLORS.status.warning
        : REP_COMPARISON_COLORS.status.error;

  // Position tooltip to avoid going off screen
  const tooltipX = x > 150 ? x - 140 : x + 10;
  const tooltipY = y > 100 ? y - 80 : y + 10;

  return (
    <div
      className="absolute pointer-events-none z-50 transition-opacity duration-150"
      style={{
        left: tooltipX,
        top: tooltipY,
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="rounded-lg px-3 py-2 shadow-lg min-w-[120px]"
        style={{
          backgroundColor: REP_COMPARISON_COLORS.surface,
          borderColor: REP_COMPARISON_COLORS.borderActive,
          borderWidth: 1,
          borderStyle: 'solid',
        }}
      >
        {/* Rep number */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
            Rep
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: REP_COMPARISON_COLORS.primary }}
          >
            {repNumber}
          </span>
        </div>

        {/* Joint type */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
            {jointLabel.ko}
          </span>
        </div>

        {/* Phase */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
            {phaseLabel.ko} / {phaseLabel.en}
          </span>
        </div>

        {/* Divider */}
        <div
          className="h-px my-1"
          style={{ backgroundColor: REP_COMPARISON_COLORS.border }}
        />

        {/* Angle value */}
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
            각도 / Angle
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: REP_COMPARISON_COLORS.textPrimary }}
          >
            {value.toFixed(1)}
          </span>
        </div>

        {/* Deviation */}
        {deviation !== 0 && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
              편차 / Dev
            </span>
            <span className="text-xs font-medium" style={{ color: deviationColor }}>
              {deviation > 0 ? '+' : ''}
              {deviation.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
