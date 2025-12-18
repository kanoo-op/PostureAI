// src/components/BilateralComparisonDashboard/index.ts

export { default as BilateralComparisonDashboard } from './BilateralComparisonDashboard';
export { default as DashboardHeader } from './DashboardHeader';
export { default as JointComparisonSection } from './JointComparisonSection';
export { default as AngleComparisonBar } from './AngleComparisonBar';
export { default as SymmetryScoreBadge } from './SymmetryScoreBadge';
export { default as SeverityIndicator } from './SeverityIndicator';
export { default as DominantSideIndicator } from './DominantSideIndicator';
export { default as ImbalanceTrendChart } from './ImbalanceTrendChart';
export { default as RepCountBadge } from './RepCountBadge';
export { default as SkeletonLoader } from './SkeletonLoader';
export { default as EmptyState } from './EmptyState';

export { useBilateralAnalysis } from './hooks/useBilateralAnalysis';

export * from './types';
export { BILATERAL_COLORS, JOINT_LABELS, SIDE_LABELS } from './constants';
