import { Keypoint } from '@tensorflow-models/pose-detection';
import { SymmetryLevel, SymmetryDirection } from '../SymmetryFeedbackCard';

export type JointType = 'knee' | 'hip' | 'ankle';
export type TrendType = 'improving' | 'declining' | 'stable';

export interface BilateralAngleData {
  jointType: JointType;
  leftAngle: number;
  rightAngle: number;
  difference: number;
  symmetryScore: number;
  level: SymmetryLevel;  // 'good' | 'warning' | 'error'
  dominantSide: SymmetryDirection;  // 'left' | 'right' | 'balanced'
}

export interface RepHistoryEntry {
  repNumber: number;
  timestamp: number;
  angles: BilateralAngleData[];
}

export interface ImbalanceTrend {
  jointType: JointType;
  trend: TrendType;
  averageDifference: number;
  consistentLimitationSide: SymmetryDirection | null;
  improvementPercent: number;
}

export interface BilateralComparisonDashboardProps {
  keypoints: Keypoint[];
  compact?: boolean;  // For mobile overlay mode
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
  className?: string;
  repHistory?: RepHistoryEntry[];
  currentRep?: number;
}

export interface JointComparisonSectionProps {
  data: BilateralAngleData;
  expanded?: boolean;
  onToggle?: () => void;
  compact?: boolean;
}

export interface AngleComparisonBarProps {
  leftAngle: number;
  rightAngle: number;
  level: SymmetryLevel;
}

export interface SymmetryScoreBadgeProps {
  score: number;
  level: SymmetryLevel;
  size?: 'sm' | 'md' | 'lg';
}

export interface SeverityIndicatorProps {
  level: SymmetryLevel;
  difference: number;
}

export interface DominantSideIndicatorProps {
  side: SymmetryDirection;
  jointName: string;
}

export interface ImbalanceTrendChartProps {
  history: RepHistoryEntry[];
  jointType: JointType;
  compact?: boolean;
}

export interface RepCountBadgeProps {
  currentRep: number;
  totalReps?: number;
}
