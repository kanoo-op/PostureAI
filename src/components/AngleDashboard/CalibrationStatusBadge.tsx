'use client';

import React, { useState } from 'react';
import { DASHBOARD_COLORS } from './constants';

interface CalibrationStatusBadgeProps {
  isCalibrated: boolean;
  calibrationAge: number | null; // days since last calibration
  onOpenWizard: () => void;
  className?: string;
}

export default function CalibrationStatusBadge({
  isCalibrated,
  calibrationAge,
  onOpenWizard,
  className = '',
}: CalibrationStatusBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine status
  const isStale = calibrationAge !== null && calibrationAge > 30;

  const getStatusColor = () => {
    if (!isCalibrated) return '#9CA3AF'; // calibration-pending (gray)
    if (isStale) return '#FFB800'; // calibration-in-progress (yellow)
    return '#00F5A0'; // calibration-complete (green)
  };

  const getStatusGlow = () => {
    if (!isCalibrated) return 'none';
    if (isStale) return 'rgba(255, 184, 0, 0.4)';
    return 'rgba(0, 245, 160, 0.4)';
  };

  const getStatusText = () => {
    if (!isCalibrated) return { en: 'Not Calibrated', ko: '미보정' };
    if (isStale) return { en: 'Calibration Stale', ko: '재보정 필요' };
    return { en: 'Calibrated', ko: '보정됨' };
  };

  const getTooltipText = () => {
    if (!isCalibrated) {
      return 'Click to start calibration / 클릭하여 캘리브레이션 시작';
    }
    if (isStale) {
      return `Last calibrated ${calibrationAge} days ago. Consider recalibrating. / ${calibrationAge}일 전에 보정됨. 재보정을 권장합니다.`;
    }
    if (calibrationAge !== null) {
      if (calibrationAge === 0) {
        return 'Calibrated today / 오늘 보정됨';
      }
      return `Calibrated ${calibrationAge} day${calibrationAge === 1 ? '' : 's'} ago / ${calibrationAge}일 전 보정됨`;
    }
    return 'Calibrated / 보정됨';
  };

  const status = getStatusText();
  const statusColor = getStatusColor();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={onOpenWizard}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
        style={{
          backgroundColor: isCalibrated
            ? `${statusColor}15`
            : DASHBOARD_COLORS.surfaceElevated,
          border: `1px solid ${isCalibrated ? `${statusColor}40` : DASHBOARD_COLORS.border}`,
        }}
      >
        {/* Status dot */}
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: statusColor,
            boxShadow: `0 0 6px ${getStatusGlow()}`,
          }}
        />

        {/* Status text */}
        <span style={{ color: statusColor }}>
          {status.ko}
        </span>

        {/* Calibrate icon for uncalibrated state */}
        {!isCalibrated && (
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke={statusColor}
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        )}

        {/* Warning icon for stale calibration */}
        {isCalibrated && isStale && (
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke={statusColor}
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10"
          style={{
            backgroundColor: DASHBOARD_COLORS.surface,
            border: `1px solid ${DASHBOARD_COLORS.border}`,
            color: DASHBOARD_COLORS.textSecondary,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          {getTooltipText()}
          {/* Tooltip arrow */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 -top-1.5 w-3 h-3 rotate-45"
            style={{
              backgroundColor: DASHBOARD_COLORS.surface,
              borderLeft: `1px solid ${DASHBOARD_COLORS.border}`,
              borderTop: `1px solid ${DASHBOARD_COLORS.border}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
