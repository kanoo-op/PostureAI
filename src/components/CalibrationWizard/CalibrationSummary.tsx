'use client';

import React from 'react';
import { CalibrationProfile } from '@/types/calibration';
import { JointAngleType } from '@/types/angleHistory';
import { CALIBRATION_COLORS, POSE_STEPS } from './constants';
import JointROMCard from './JointROMCard';

interface CalibrationSummaryProps {
  profile: CalibrationProfile | null;
  onRecalibrateJoint?: (jointType: JointAngleType) => void;
  onFinish: () => void;
}

// Map step names to joint types for recalibration
const STEP_JOINTS: JointAngleType[] = [
  'kneeFlexion',
  'hipFlexion',
  'torsoAngle',
  'ankleAngle',
  'elbowAngle',
  'shoulderAngle',
];

export default function CalibrationSummary({
  profile,
  onRecalibrateJoint,
  onFinish,
}: CalibrationSummaryProps) {
  // Calculate overall calibration quality
  const calculateOverallQuality = () => {
    if (!profile) return 0;

    const confidences = Object.values(profile.confidenceScores);
    if (confidences.length === 0) return 0;

    const sum = confidences.reduce((acc, val) => acc + (val || 0), 0);
    return sum / confidences.length;
  };

  const overallQuality = calculateOverallQuality();
  const calibratedCount = profile
    ? Object.keys(profile.joints).length
    : 0;
  const totalJoints = STEP_JOINTS.length;

  const getQualityColor = () => {
    if (overallQuality >= 0.8) return CALIBRATION_COLORS.complete;
    if (overallQuality >= 0.6) return CALIBRATION_COLORS.inProgress;
    return CALIBRATION_COLORS.statusError;
  };

  return (
    <div className="p-6">
      {/* Success banner */}
      <div
        className="text-center mb-6 p-6 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${CALIBRATION_COLORS.completeBg}, ${CALIBRATION_COLORS.activeBg})`,
          border: `1px solid ${CALIBRATION_COLORS.complete}`,
        }}
      >
        {/* Checkmark icon */}
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: CALIBRATION_COLORS.complete,
            boxShadow: `0 0 20px ${CALIBRATION_COLORS.completeGlow}`,
          }}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke={CALIBRATION_COLORS.background}
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: CALIBRATION_COLORS.textPrimary }}>
          Calibration Complete!
        </h2>
        <p className="text-lg" style={{ color: CALIBRATION_COLORS.complete }}>
          캘리브레이션 완료!
        </p>
      </div>

      {/* Overall quality score */}
      <div
        className="mb-6 p-4 rounded-xl"
        style={{ backgroundColor: CALIBRATION_COLORS.surface }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium" style={{ color: CALIBRATION_COLORS.textPrimary }}>
            Overall Quality / 전체 품질
          </span>
          <span
            className="text-2xl font-bold"
            style={{ color: getQualityColor() }}
          >
            {Math.round(overallQuality * 100)}%
          </span>
        </div>

        {/* Quality bar */}
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{ backgroundColor: CALIBRATION_COLORS.surfaceElevated }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${overallQuality * 100}%`,
              backgroundColor: getQualityColor(),
              boxShadow: `0 0 8px ${getQualityColor()}40`,
            }}
          />
        </div>

        <div className="mt-2 text-sm" style={{ color: CALIBRATION_COLORS.textMuted }}>
          {calibratedCount} / {totalJoints} joints calibrated
        </div>
      </div>

      {/* Joint ROM cards */}
      <div className="space-y-3 mb-6">
        <h3 className="font-medium" style={{ color: CALIBRATION_COLORS.textSecondary }}>
          Calibrated Joints / 측정된 관절
        </h3>

        <div className="grid gap-3">
          {STEP_JOINTS.map((jointType) => (
            <JointROMCard
              key={jointType}
              jointType={jointType}
              romRange={profile?.joints[jointType]}
              confidence={profile?.confidenceScores[jointType]}
              onRecalibrate={
                onRecalibrateJoint
                  ? () => onRecalibrateJoint(jointType)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Finish button */}
      <button
        onClick={onFinish}
        className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02]"
        style={{
          backgroundColor: CALIBRATION_COLORS.complete,
          color: CALIBRATION_COLORS.background,
          boxShadow: `0 0 20px ${CALIBRATION_COLORS.completeGlow}`,
        }}
      >
        Save & Finish / 저장 및 완료
      </button>

      <p className="text-center mt-3 text-xs" style={{ color: CALIBRATION_COLORS.textMuted }}>
        Your calibration profile will be saved locally and used for personalized feedback.
      </p>
    </div>
  );
}
