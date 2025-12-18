'use client';

import React from 'react';
import { CALIBRATION_COLORS } from './constants';

interface ROMCaptureDisplayProps {
  currentAngle: number | null;
  capturedMin: number | null;
  capturedMax: number | null;
  capturePhase: 'min' | 'max' | 'complete';
  unit?: string;
}

export default function ROMCaptureDisplay({
  currentAngle,
  capturedMin,
  capturedMax,
  capturePhase,
  unit = '\u00b0',
}: ROMCaptureDisplayProps) {
  const formatAngle = (angle: number | null) => {
    if (angle === null) return '--';
    return `${Math.round(angle)}${unit}`;
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: CALIBRATION_COLORS.surface }}
    >
      {/* Current angle display */}
      <div className="text-center mb-4">
        <span className="text-xs font-medium" style={{ color: CALIBRATION_COLORS.textSecondary }}>
          Current Angle
        </span>
        <div
          className="text-3xl font-bold mt-1"
          style={{
            color: CALIBRATION_COLORS.active,
            textShadow: `0 0 10px ${CALIBRATION_COLORS.activeGlow}`,
          }}
        >
          {formatAngle(currentAngle)}
        </div>
      </div>

      {/* ROM range display */}
      <div className="flex justify-between gap-4">
        {/* Min value */}
        <div
          className="flex-1 rounded-lg p-3 text-center transition-all duration-300"
          style={{
            backgroundColor: capturePhase === 'min'
              ? CALIBRATION_COLORS.activeBg
              : CALIBRATION_COLORS.surfaceElevated,
            border: capturePhase === 'min'
              ? `2px solid ${CALIBRATION_COLORS.active}`
              : '2px solid transparent',
          }}
        >
          <span
            className="text-xs font-medium block"
            style={{
              color: capturedMin !== null
                ? CALIBRATION_COLORS.complete
                : CALIBRATION_COLORS.textSecondary,
            }}
          >
            {capturedMin !== null ? 'MIN (Locked)' : 'MIN'}
          </span>
          <span
            className="text-xl font-bold"
            style={{
              color: capturedMin !== null
                ? CALIBRATION_COLORS.complete
                : CALIBRATION_COLORS.textMuted,
            }}
          >
            {formatAngle(capturedMin)}
          </span>
          {capturedMin !== null && (
            <svg
              className="w-4 h-4 mx-auto mt-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke={CALIBRATION_COLORS.complete}
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Arrow indicator */}
        <div className="flex items-center">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke={CALIBRATION_COLORS.textMuted}
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>

        {/* Max value */}
        <div
          className="flex-1 rounded-lg p-3 text-center transition-all duration-300"
          style={{
            backgroundColor: capturePhase === 'max'
              ? CALIBRATION_COLORS.activeBg
              : CALIBRATION_COLORS.surfaceElevated,
            border: capturePhase === 'max'
              ? `2px solid ${CALIBRATION_COLORS.active}`
              : '2px solid transparent',
          }}
        >
          <span
            className="text-xs font-medium block"
            style={{
              color: capturedMax !== null
                ? CALIBRATION_COLORS.complete
                : CALIBRATION_COLORS.textSecondary,
            }}
          >
            {capturedMax !== null ? 'MAX (Locked)' : 'MAX'}
          </span>
          <span
            className="text-xl font-bold"
            style={{
              color: capturedMax !== null
                ? CALIBRATION_COLORS.complete
                : CALIBRATION_COLORS.textMuted,
            }}
          >
            {formatAngle(capturedMax)}
          </span>
          {capturedMax !== null && (
            <svg
              className="w-4 h-4 mx-auto mt-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke={CALIBRATION_COLORS.complete}
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Phase indicator */}
      <div className="mt-3 text-center">
        <span className="text-xs" style={{ color: CALIBRATION_COLORS.textMuted }}>
          {capturePhase === 'min' && 'Capturing minimum position...'}
          {capturePhase === 'max' && 'Capturing maximum position...'}
          {capturePhase === 'complete' && 'Capture complete!'}
        </span>
      </div>
    </div>
  );
}
