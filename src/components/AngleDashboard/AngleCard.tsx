// src/components/AngleDashboard/AngleCard.tsx

'use client';

import React from 'react';
import { AngleCardProps } from './types';
import { DASHBOARD_COLORS } from './constants';
import MiniAngleGauge from './MiniAngleGauge';
import TrendIndicator from './TrendIndicator';

export default function AngleCard({
  angle,
  showGauge = true,
  showTrend = true,
  compact = false,
}: AngleCardProps) {
  const { label, value, status, trend, minOptimal, maxOptimal, unit } = angle;
  const statusColors = DASHBOARD_COLORS.status;

  const bgColor = statusColors[`${status}Bg` as keyof typeof statusColors];
  const textColor = statusColors[status];
  const borderColor = status === 'good'
    ? 'border-emerald-500/30'
    : status === 'warning'
      ? 'border-amber-500/30'
      : 'border-rose-500/30';

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-lg border ${borderColor}`}
        style={{ backgroundColor: bgColor }}
      >
        <span className="text-xs text-gray-300 truncate mr-2">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: textColor }}
          >
            {value}{unit}
          </span>
          {angle.isPerspectiveCorrected && (
            <span
              className="text-[10px] font-medium"
              style={{ color: DASHBOARD_COLORS.depth.reliable }}
              title="3D perspective corrected"
            >
              3D
            </span>
          )}
          {showTrend && <TrendIndicator direction={trend} size="sm" />}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-xl border ${borderColor} transition-all duration-200 hover:scale-[1.02]`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex items-center gap-3">
        {/* Gauge */}
        {showGauge && (
          <MiniAngleGauge
            value={value}
            minOptimal={minOptimal}
            maxOptimal={maxOptimal}
            status={status}
            size="md"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400 truncate">
              {label}
            </span>
            <div className="flex items-center gap-1">
              {angle.isPerspectiveCorrected && (
                <span
                  className="text-[10px] font-medium"
                  style={{ color: DASHBOARD_COLORS.depth.reliable }}
                  title="3D perspective corrected"
                >
                  3D
                </span>
              )}
              {showTrend && <TrendIndicator direction={trend} size="sm" />}
            </div>
          </div>

          <div className="flex items-baseline gap-1 mt-1">
            <span
              className="font-mono text-lg font-bold"
              style={{ color: textColor }}
            >
              {value}
            </span>
            <span className="font-mono text-xs text-gray-500">
              {unit}
            </span>
          </div>

          {/* Optimal range hint */}
          <span className="text-[10px] text-gray-600">
            optimal: {minOptimal}-{maxOptimal}{unit}
          </span>
        </div>
      </div>
    </div>
  );
}
