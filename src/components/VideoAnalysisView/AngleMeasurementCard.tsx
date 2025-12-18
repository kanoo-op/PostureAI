'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from './constants';
import type { AngleMeasurement } from './types';

export default function AngleMeasurementCard({
  jointName,
  angle,
  targetMin,
  targetMax,
  status,
}: AngleMeasurement) {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return VIDEO_ANALYSIS_COLORS.statusGood;
      case 'warning':
        return VIDEO_ANALYSIS_COLORS.statusWarning;
      case 'error':
        return VIDEO_ANALYSIS_COLORS.statusError;
    }
  };

  const range = targetMax - targetMin;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((angle - targetMin) / range) * 100)
  );

  return (
    <div
      className="p-3 rounded-lg"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-sm font-medium"
          style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
        >
          {jointName}
        </span>
        <span className="text-lg font-bold" style={{ color: getStatusColor() }}>
          {angle.toFixed(1)}°
        </span>
      </div>

      <div
        className="h-1.5 rounded-full relative"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.timelineTrack }}
      >
        <div
          className="absolute h-full rounded-full"
          style={{
            backgroundColor: getStatusColor(),
            width: `${progressPercent}%`,
          }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span
          className="text-xs"
          style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
        >
          {targetMin}°
        </span>
        <span
          className="text-xs"
          style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
        >
          {targetMax}°
        </span>
      </div>
    </div>
  );
}
