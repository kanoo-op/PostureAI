'use client';

import React from 'react';
import { JointAngleType } from '@/types/angleHistory';
import { JointROMRange } from '@/types/calibration';
import { CALIBRATION_COLORS } from './constants';
import { ANGLE_LABELS } from '@/components/AngleDashboard/constants';
import { PHYSIOLOGICAL_BOUNDS } from '@/utils/calibrationStorage';

interface JointROMCardProps {
  jointType: JointAngleType;
  romRange: JointROMRange | undefined;
  confidence: number | undefined;
  onRecalibrate?: () => void;
}

export default function JointROMCard({
  jointType,
  romRange,
  confidence,
  onRecalibrate,
}: JointROMCardProps) {
  const labels = ANGLE_LABELS[jointType];
  const bounds = PHYSIOLOGICAL_BOUNDS[jointType];
  const isCalibrated = romRange !== undefined && confidence !== undefined && confidence >= 0.7;

  // Calculate position for range bar
  const rangeStart = romRange
    ? ((romRange.min - bounds.absoluteMin) / (bounds.absoluteMax - bounds.absoluteMin)) * 100
    : 0;
  const rangeWidth = romRange
    ? ((romRange.max - romRange.min) / (bounds.absoluteMax - bounds.absoluteMin)) * 100
    : 0;

  return (
    <div
      className="rounded-xl p-4 transition-all duration-300"
      style={{
        backgroundColor: CALIBRATION_COLORS.surface,
        border: `1px solid ${isCalibrated ? CALIBRATION_COLORS.complete : CALIBRATION_COLORS.border}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isCalibrated
                ? CALIBRATION_COLORS.complete
                : CALIBRATION_COLORS.pending,
              boxShadow: isCalibrated
                ? `0 0 8px ${CALIBRATION_COLORS.completeGlow}`
                : 'none',
            }}
          />
          {/* Joint name */}
          <div>
            <span className="font-medium text-sm" style={{ color: CALIBRATION_COLORS.textPrimary }}>
              {labels.ko}
            </span>
            <span className="text-xs ml-2" style={{ color: CALIBRATION_COLORS.textMuted }}>
              {labels.en}
            </span>
          </div>
        </div>

        {/* Confidence badge */}
        {confidence !== undefined && (
          <div
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: confidence >= 0.7
                ? CALIBRATION_COLORS.completeBg
                : CALIBRATION_COLORS.inProgressGlow,
              color: confidence >= 0.7
                ? CALIBRATION_COLORS.complete
                : CALIBRATION_COLORS.inProgress,
            }}
          >
            {Math.round(confidence * 100)}%
          </div>
        )}
      </div>

      {/* Range bar visualization */}
      <div className="relative h-4 rounded-full overflow-hidden mb-2" style={{ backgroundColor: CALIBRATION_COLORS.surfaceElevated }}>
        {romRange && (
          <div
            className="absolute h-full rounded-full transition-all duration-300"
            style={{
              left: `${rangeStart}%`,
              width: `${rangeWidth}%`,
              backgroundColor: isCalibrated
                ? CALIBRATION_COLORS.complete
                : CALIBRATION_COLORS.inProgress,
              boxShadow: isCalibrated
                ? `0 0 8px ${CALIBRATION_COLORS.completeGlow}`
                : 'none',
            }}
          />
        )}
      </div>

      {/* Range values */}
      <div className="flex justify-between text-xs" style={{ color: CALIBRATION_COLORS.textSecondary }}>
        <span>{bounds.absoluteMin}\u00b0</span>
        {romRange ? (
          <span style={{ color: CALIBRATION_COLORS.textPrimary }}>
            {Math.round(romRange.min)}\u00b0 - {Math.round(romRange.max)}\u00b0
          </span>
        ) : (
          <span style={{ color: CALIBRATION_COLORS.textMuted }}>Not calibrated</span>
        )}
        <span>{bounds.absoluteMax}\u00b0</span>
      </div>

      {/* Recalibrate button */}
      {onRecalibrate && (
        <button
          onClick={onRecalibrate}
          className="mt-3 w-full py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{
            backgroundColor: CALIBRATION_COLORS.surfaceElevated,
            color: CALIBRATION_COLORS.textSecondary,
          }}
        >
          {isCalibrated ? '\ub2e4\uc2dc \uce21\uc815 / Recalibrate' : '\uce21\uc815\ud558\uae30 / Calibrate'}
        </button>
      )}
    </div>
  );
}
