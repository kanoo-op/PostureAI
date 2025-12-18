// src/components/AngleDashboard/index.ts

export { default as AngleDashboard } from './AngleDashboard';
export { default as DashboardToggle } from './DashboardToggle';
export { default as DashboardHeader } from './DashboardHeader';
export { default as BodyPartSection } from './BodyPartSection';
export { default as AngleCard } from './AngleCard';
export { default as MiniAngleGauge } from './MiniAngleGauge';
export { default as TrendIndicator } from './TrendIndicator';
export { default as DashboardSkeleton } from './DashboardSkeleton';
export { default as ElbowAngleCard } from './ElbowAngleCard';
export { default as ElbowValgusIndicator } from './ElbowValgusIndicator';
export { default as ArmSymmetryCard } from './ArmSymmetryCard';
export { default as PerspectiveCorrectionIndicator } from './PerspectiveCorrectionIndicator';
export { default as CalibrationStatusBadge } from './CalibrationStatusBadge';

export { useDashboardToggle } from './hooks/useDashboardToggle';
export { useAngleCalculations } from './hooks/useAngleCalculations';
export { useTrendTracking } from './hooks/useTrendTracking';
export { useDepthNormalization } from './hooks/useDepthNormalization';
export type { UseDepthNormalizationResult, UseDepthNormalizationOptions } from './hooks/useDepthNormalization';

export * from './types';
export { DASHBOARD_COLORS, ANGLE_LABELS, BODY_PART_LABELS, DEFAULT_ANGLE_THRESHOLDS, getAngleThresholds } from './constants';
