// src/components/AngleDashboard/types.ts

import { JointAngleType, ExerciseType } from '@/types/angleHistory';
import { Keypoint } from '@tensorflow-models/pose-detection';
import { DepthConfidenceResult, CalibrationState } from '@/utils/depthNormalization';

export type AngleStatus = 'good' | 'warning' | 'error';
export type TrendDirection = 'improving' | 'declining' | 'stable';
export type BodyPartCategory = 'upper' | 'core' | 'lower';

export interface AngleDisplayData {
  jointType: JointAngleType;
  label: string;
  value: number;           // Current smoothed angle in degrees
  rawValue: number;        // Raw unsmoothed value
  status: AngleStatus;
  trend: TrendDirection;
  minOptimal: number;      // Optimal range minimum
  maxOptimal: number;      // Optimal range maximum
  unit: string;            // Usually '°'
  isPerspectiveCorrected?: boolean; // Whether depth normalization was applied
}

export interface BodyPartGroup {
  id: BodyPartCategory;
  label: string;
  labelKo: string;         // Korean label
  icon: string;            // Emoji or icon identifier
  angles: AngleDisplayData[];
  overallStatus: AngleStatus;
}

export interface AngleDashboardProps {
  keypoints: Keypoint[];
  exerciseType: ExerciseType;
  mirrored?: boolean;
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
  className?: string;
  compact?: boolean;       // For mobile overlay mode
  depthConfidence?: DepthConfidenceResult;
  onCalibrate?: () => void;
  calibrationState?: CalibrationState;
}

export interface DashboardToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

export interface BodyPartSectionProps {
  group: BodyPartGroup;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export interface AngleCardProps {
  angle: AngleDisplayData;
  showGauge?: boolean;
  showTrend?: boolean;
  compact?: boolean;
}

export interface MiniAngleGaugeProps {
  value: number;
  minOptimal: number;
  maxOptimal: number;
  status: AngleStatus;
  size?: 'sm' | 'md' | 'lg';
}

export interface TrendIndicatorProps {
  direction: TrendDirection;
  size?: 'sm' | 'md';
}

// Depth confidence indicator props
export interface DepthConfidenceIndicatorProps {
  confidence: DepthConfidenceResult;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Calibration overlay props
export interface CalibrationOverlayProps {
  isVisible: boolean;
  onCalibrationComplete: (baselineDepth: number) => void;
  onCancel: () => void;
  tPoseDetected: boolean;
  countdown?: number;
}

// Calibration button props
export interface CalibrationButtonProps {
  onClick: () => void;
  isCalibrated: boolean;
  className?: string;
}

// Depth confidence badge props
export interface DepthConfidenceBadgeProps {
  confidence: DepthConfidenceResult;
  className?: string;
}
