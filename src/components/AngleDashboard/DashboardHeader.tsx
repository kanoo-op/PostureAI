// src/components/AngleDashboard/DashboardHeader.tsx

'use client';

import React from 'react';
import { DASHBOARD_COLORS } from './constants';
import { DepthConfidenceResult, CalibrationState } from '@/utils/depthNormalization';
import DepthConfidenceBadge from './DepthConfidenceBadge';
import CalibrationButton from './CalibrationButton';
import PerspectiveCorrectionIndicator from './PerspectiveCorrectionIndicator';
import CalibrationStatusBadge from './CalibrationStatusBadge';

interface DashboardHeaderProps {
  onClose?: () => void;
  depthConfidence?: DepthConfidenceResult;
  perspectiveFactor?: number;
  onCalibrate?: () => void;
  calibrationState?: CalibrationState;
  // 3D Angle Calibration props
  isAngleCalibrated?: boolean;
  angleCalibrationAge?: number | null;
  onOpenAngleCalibrationWizard?: () => void;
}

export default function DashboardHeader({
  onClose,
  depthConfidence,
  perspectiveFactor,
  onCalibrate,
  calibrationState,
  isAngleCalibrated = false,
  angleCalibrationAge = null,
  onOpenAngleCalibrationWizard,
}: DashboardHeaderProps) {
  const isCalibrated = calibrationState?.isCalibrated ?? false;

  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: DASHBOARD_COLORS.border }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status indicator dots */}
          <div className="flex gap-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: DASHBOARD_COLORS.primary }}
            />
            <span
              className="w-2 h-2 rounded-full opacity-50"
              style={{ backgroundColor: DASHBOARD_COLORS.primary }}
            />
            <span
              className="w-2 h-2 rounded-full opacity-25"
              style={{ backgroundColor: DASHBOARD_COLORS.primary }}
            />
          </div>

          <h2 className="font-bold text-sm text-gray-100 uppercase tracking-wider">
            Angle Dashboard
          </h2>

          {/* Depth confidence badge */}
          {depthConfidence && (
            <DepthConfidenceBadge confidence={depthConfidence} />
          )}

          {/* Perspective correction indicator */}
          {depthConfidence?.isReliable && perspectiveFactor && perspectiveFactor !== 1.0 && (
            <PerspectiveCorrectionIndicator
              isActive={true}
              factor={perspectiveFactor}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 3D Angle Calibration status badge */}
          {onOpenAngleCalibrationWizard && (
            <CalibrationStatusBadge
              isCalibrated={isAngleCalibrated}
              calibrationAge={angleCalibrationAge}
              onOpenWizard={onOpenAngleCalibrationWizard}
            />
          )}

          {/* Depth Calibration button */}
          {onCalibrate && (
            <CalibrationButton
              onClick={onCalibrate}
              isCalibrated={isCalibrated}
            />
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-700/50 transition-colors"
              aria-label="Close dashboard"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
