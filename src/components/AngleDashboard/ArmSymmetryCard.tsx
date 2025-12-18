'use client';

import React from 'react';
import { DASHBOARD_COLORS } from './constants';

interface ArmSymmetryCardProps {
  score: number;          // 0-100
  leftAngle: number;
  rightAngle: number;
  compact?: boolean;
}

export default function ArmSymmetryCard({
  score,
  leftAngle,
  rightAngle,
  compact = false,
}: ArmSymmetryCardProps) {
  const status = score >= 90 ? 'good' : score >= 70 ? 'warning' : 'error';
  const statusColor = DASHBOARD_COLORS.status[status];
  const bgColor = DASHBOARD_COLORS.status[`${status}Bg` as keyof typeof DASHBOARD_COLORS.status];
  const leftColor = '#3b82f6';  // arm-left
  const rightColor = '#8b5cf6'; // arm-right

  const borderClass = status === 'good'
    ? 'border-emerald-500/30'
    : status === 'warning'
      ? 'border-amber-500/30'
      : 'border-rose-500/30';

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-lg border ${borderClass}`}
        style={{ backgroundColor: bgColor }}
      >
        <span className="text-xs text-gray-300">팔 대칭</span>
        <span
          className="font-mono text-sm font-semibold"
          style={{ color: statusColor }}
        >
          {score}%
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-xl border ${borderClass} transition-all duration-200`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">팔 대칭</span>
        <span
          className="font-mono text-lg font-bold"
          style={{ color: statusColor }}
        >
          {score}%
        </span>
      </div>

      {/* Symmetry bar visualization */}
      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${DASHBOARD_COLORS.gauge.fillStart}, ${DASHBOARD_COLORS.gauge.fillEnd})`,
          }}
        />
      </div>

      {/* Left/Right comparison */}
      <div className="flex justify-between mt-2 text-[10px]">
        <span style={{ color: leftColor }}>
          L: {leftAngle.toFixed(0)}deg
        </span>
        <span style={{ color: rightColor }}>
          R: {rightAngle.toFixed(0)}deg
        </span>
      </div>
    </div>
  );
}
