// src/components/AngleDashboard/AngleDashboard.tsx

'use client';

import React, { useMemo, useEffect } from 'react';
import { AngleDashboardProps, BodyPartGroup } from './types';
import { DASHBOARD_COLORS } from './constants';
import { useAngleCalculations } from './hooks/useAngleCalculations';
import { useTrendTracking } from './hooks/useTrendTracking';
import { useDepthNormalization } from './hooks/useDepthNormalization';
import { useCalibration } from '@/contexts/CalibrationContext';
import DashboardHeader from './DashboardHeader';
import BodyPartSection from './BodyPartSection';
import DashboardSkeleton from './DashboardSkeleton';
import CalibrationOverlay from './CalibrationOverlay';
import { CalibrationWizard } from '@/components/CalibrationWizard';

export default function AngleDashboard({
  keypoints,
  exerciseType,
  mirrored = true,
  isVisible = true,
  onToggle,
  className = '',
  compact = false,
  depthConfidence: externalDepthConfidence,
  onCalibrate,
  calibrationState,
}: AngleDashboardProps) {
  // Initialize depth normalization hook
  const {
    calibrationState: internalCalibrationState,
    depthConfidence: internalDepthConfidence,
    perspectiveFactor,
    tPoseDetected,
    isCalibrating,
    startCalibration,
    cancelCalibration,
    updateWithKeypoints,
  } = useDepthNormalization({ enabled: true });

  // 3D Angle Calibration context
  const {
    profile: angleCalibrationProfile,
    isCalibrated: isAngleCalibrated,
    calibrationAge: angleCalibrationAge,
    isWizardOpen,
    openWizard: openAngleCalibrationWizard,
  } = useCalibration();

  // Update depth normalization when keypoints change
  useEffect(() => {
    updateWithKeypoints(keypoints);
  }, [keypoints, updateWithKeypoints]);

  // Calculate angles from keypoints with calibration profile
  const { bodyParts: bodyPartGroups, depthConfidence, perspectiveResult } = useAngleCalculations(
    keypoints,
    exerciseType,
    undefined, // use default depth config
    angleCalibrationProfile
  );

  // Use external depth confidence if provided, otherwise use calculated
  const effectiveDepthConfidence = externalDepthConfidence ?? depthConfidence;

  // Use external or internal calibration state
  const effectiveCalibrationState = calibrationState ?? internalCalibrationState;

  // Get effective perspective factor from result
  const effectivePerspectiveFactor = perspectiveResult?.factor ?? perspectiveFactor;

  // Trend tracking
  const { updateAnglesWithTrends, reset: resetTrends } = useTrendTracking();

  // Reset trends when exercise type changes
  useEffect(() => {
    resetTrends();
  }, [exerciseType, resetTrends]);

  // Apply trends to all angles
  const groupsWithTrends: BodyPartGroup[] = useMemo(() => {
    return bodyPartGroups.map(group => ({
      ...group,
      angles: updateAnglesWithTrends(group.angles),
    }));
  }, [bodyPartGroups, updateAnglesWithTrends]);

  if (!isVisible) {
    return null;
  }

  // Show skeleton while loading
  if (!keypoints || keypoints.length === 0) {
    return <DashboardSkeleton />;
  }

  const handleClose = () => {
    onToggle?.(false);
  };

  return (
    <div
      className={`
        rounded-2xl overflow-hidden border shadow-2xl
        ${compact ? 'max-w-xs' : 'w-full max-w-sm'}
        ${className}
      `}
      style={{
        backgroundColor: DASHBOARD_COLORS.background,
        borderColor: DASHBOARD_COLORS.border,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <DashboardHeader
        onClose={onToggle ? handleClose : undefined}
        depthConfidence={effectiveDepthConfidence}
        perspectiveFactor={effectivePerspectiveFactor}
        onCalibrate={onCalibrate ?? startCalibration}
        calibrationState={effectiveCalibrationState}
        isAngleCalibrated={isAngleCalibrated}
        angleCalibrationAge={angleCalibrationAge}
        onOpenAngleCalibrationWizard={openAngleCalibrationWizard}
      />

      {/* Body Part Sections */}
      <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {groupsWithTrends.length > 0 ? (
          groupsWithTrends.map((group) => (
            <BodyPartSection
              key={group.id}
              group={group}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              포즈를 감지하면 각도가 표시됩니다
            </p>
          </div>
        )}
      </div>

      {/* Bottom gradient accent */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${DASHBOARD_COLORS.status.error}, ${DASHBOARD_COLORS.status.warning}, ${DASHBOARD_COLORS.status.good})`,
        }}
      />

      {/* Depth Calibration Overlay */}
      {isCalibrating && (
        <CalibrationOverlay
          isVisible={isCalibrating}
          onCalibrationComplete={() => {
            // Calibration completion is handled internally by the hook
            cancelCalibration();
          }}
          onCancel={cancelCalibration}
          tPoseDetected={tPoseDetected}
        />
      )}

      {/* 3D Angle Calibration Wizard */}
      {isWizardOpen && (
        <CalibrationWizard
          currentAngle={bodyPartGroups[0]?.angles[0]?.value ?? null}
          confidence={depthConfidence?.score ?? 0}
        />
      )}
    </div>
  );
}
