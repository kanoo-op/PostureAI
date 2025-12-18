'use client';

import React from 'react';
import { DASHBOARD_COLORS } from './constants';

interface CalibrationButtonProps {
  onClick: () => void;
  isCalibrated: boolean;
  className?: string;
}

/**
 * Button to trigger T-pose calibration
 * Visual state changes based on calibration status
 */
export default function CalibrationButton({
  onClick,
  isCalibrated,
  className = '',
}: CalibrationButtonProps) {
  // Colors based on calibration status
  const getColors = () => {
    if (isCalibrated) {
      return {
        color: DASHBOARD_COLORS.depth?.reliable ?? '#00F5A0',
        glow: DASHBOARD_COLORS.depth?.reliableGlow ?? 'rgba(0, 245, 160, 0.4)',
      };
    }
    return {
      color: DASHBOARD_COLORS.calibration?.active ?? '#00ddff',
      glow: DASHBOARD_COLORS.calibration?.activeGlow ?? 'rgba(0, 221, 255, 0.4)',
    };
  };

  const colors = getColors();

  // Calibration/target icon SVG
  const CalibrationIcon = () => (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outer circle */}
      <circle cx="12" cy="12" r="10" />
      {/* Inner circle */}
      <circle cx="12" cy="12" r="6" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      {/* Crosshairs */}
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );

  // Checkmark icon for calibrated state
  const CheckIcon = () => (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-all hover:bg-gray-700/50 ${className}`}
      style={{
        color: colors.color,
        boxShadow: isCalibrated ? `0 0 8px ${colors.glow}` : 'none',
      }}
      title={isCalibrated ? 'Recalibrate depth (T-pose)' : 'Calibrate depth (T-pose)'}
      aria-label={isCalibrated ? 'Recalibrate depth' : 'Calibrate depth'}
    >
      <div className="relative">
        {isCalibrated ? <CheckIcon /> : <CalibrationIcon />}
        {/* Status indicator dot */}
        {isCalibrated && (
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
            style={{
              backgroundColor: colors.color,
              boxShadow: `0 0 4px ${colors.glow}`,
            }}
          />
        )}
      </div>
    </button>
  );
}
