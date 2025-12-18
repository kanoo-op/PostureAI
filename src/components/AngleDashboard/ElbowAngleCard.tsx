'use client';

import React from 'react';
import { DASHBOARD_COLORS } from './constants';
import MiniAngleGauge from './MiniAngleGauge';
import ElbowValgusIndicator from './ElbowValgusIndicator';

interface ElbowAngleCardProps {
  leftElbowAngle: number;
  rightElbowAngle: number;
  leftValgus: number;
  rightValgus: number;
  status: 'good' | 'warning' | 'error';
  valgusStatus: 'good' | 'warning' | 'error';
  compact?: boolean;
}

export default function ElbowAngleCard({
  leftElbowAngle,
  rightElbowAngle,
  leftValgus,
  rightValgus,
  status,
  valgusStatus,
  compact = false,
}: ElbowAngleCardProps) {
  const avgAngle = (leftElbowAngle + rightElbowAngle) / 2;
  const statusColor = DASHBOARD_COLORS.status[status];
  const bgColor = DASHBOARD_COLORS.status[`${status}Bg` as keyof typeof DASHBOARD_COLORS.status];
  const leftColor = '#3b82f6';
  const rightColor = '#8b5cf6';

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
        <span className="text-xs text-gray-300">팔꿈치</span>
        <div className="flex items-center gap-2">
          <span style={{ color: leftColor, fontSize: 10 }}>
            L:{leftElbowAngle.toFixed(0)}deg
          </span>
          <span style={{ color: rightColor, fontSize: 10 }}>
            R:{rightElbowAngle.toFixed(0)}deg
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-xl border ${borderClass} transition-all duration-200`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">팔꿈치 각도</span>
        <span
          className="font-mono text-lg font-bold"
          style={{ color: statusColor }}
        >
          {avgAngle.toFixed(0)}deg
        </span>
      </div>

      {/* Gauge and Valgus Indicator side by side */}
      <div className="flex items-center gap-3">
        <MiniAngleGauge
          value={avgAngle}
          minOptimal={80}
          maxOptimal={100}
          status={status}
          size="md"
        />
        <ElbowValgusIndicator
          leftValgus={leftValgus}
          rightValgus={rightValgus}
          status={valgusStatus}
          size="sm"
        />
      </div>

      {/* Left/Right values */}
      <div className="flex justify-between mt-2 text-[10px]">
        <div style={{ color: leftColor }}>
          <div>L: {leftElbowAngle.toFixed(0)}deg</div>
          <div className="text-gray-500">valgus: {leftValgus.toFixed(0)}deg</div>
        </div>
        <div style={{ color: rightColor }} className="text-right">
          <div>R: {rightElbowAngle.toFixed(0)}deg</div>
          <div className="text-gray-500">valgus: {rightValgus.toFixed(0)}deg</div>
        </div>
      </div>

      {/* Optimal range hint */}
      <span className="text-[10px] text-gray-600 block mt-1">
        optimal: 80-100deg, valgus: 0-8deg
      </span>
    </div>
  );
}
