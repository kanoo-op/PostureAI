'use client';

import React from 'react';
import { JointAngleType } from '@/types/angleHistory';
import { CALIBRATION_COLORS } from './constants';
import { PHYSIOLOGICAL_BOUNDS } from '@/utils/calibrationStorage';
import { ANGLE_LABELS } from '@/components/AngleDashboard/constants';

interface SafetyBoundsWarningProps {
  jointType: JointAngleType;
  capturedMin: number;
  capturedMax: number;
  onRecalibrate: () => void;
}

export default function SafetyBoundsWarning({
  jointType,
  capturedMin,
  capturedMax,
  onRecalibrate,
}: SafetyBoundsWarningProps) {
  const bounds = PHYSIOLOGICAL_BOUNDS[jointType];
  const labels = ANGLE_LABELS[jointType];

  const minExceeds = capturedMin < bounds.absoluteMin || capturedMin > bounds.absoluteMax;
  const maxExceeds = capturedMax < bounds.absoluteMin || capturedMax > bounds.absoluteMax;

  if (!minExceeds && !maxExceeds) {
    return null;
  }

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        borderColor: CALIBRATION_COLORS.statusWarning,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255, 184, 0, 0.2)' }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke={CALIBRATION_COLORS.statusWarning}
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1">
          {/* Title */}
          <h3
            className="font-bold text-sm"
            style={{ color: CALIBRATION_COLORS.statusWarning }}
          >
            {labels.ko} 범위 초과 / {labels.en} Range Exceeded
          </h3>

          {/* Explanation */}
          <p className="text-xs mt-1" style={{ color: CALIBRATION_COLORS.textSecondary }}>
            측정된 값이 정상 범위를 벗어났습니다. 다시 측정해 주세요.
          </p>
          <p className="text-xs" style={{ color: CALIBRATION_COLORS.textMuted }}>
            The captured values exceed physiological bounds. Please recalibrate.
          </p>

          {/* Details */}
          <div className="mt-2 text-xs" style={{ color: CALIBRATION_COLORS.textSecondary }}>
            <div>
              정상 범위 / Normal range: {bounds.absoluteMin}\u00b0 - {bounds.absoluteMax}\u00b0
            </div>
            <div>
              측정값 / Captured: {Math.round(capturedMin)}\u00b0 - {Math.round(capturedMax)}\u00b0
            </div>
          </div>

          {/* Recalibrate button */}
          <button
            onClick={onRecalibrate}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: CALIBRATION_COLORS.statusWarning,
              color: CALIBRATION_COLORS.background,
            }}
          >
            다시 측정 / Recalibrate
          </button>
        </div>
      </div>
    </div>
  );
}
