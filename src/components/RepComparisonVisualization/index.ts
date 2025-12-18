// src/components/RepComparisonVisualization/index.ts

export { default as RepComparisonVisualization } from './RepComparisonVisualization';
export { default as MultiRepAngleChart } from './MultiRepAngleChart';
export { default as RepSelectorPanel } from './RepSelectorPanel';
export { default as SessionSelector } from './SessionSelector';
export { default as SessionComparisonToggle } from './SessionComparisonToggle';
export { default as JointFilterDropdown } from './JointFilterDropdown';
export { default as DeviationHighlightOverlay } from './DeviationHighlightOverlay';
export { default as RepStatsSummary } from './RepStatsSummary';
export { default as ChartLegend } from './ChartLegend';
export { default as EmptyStateRepComparison } from './EmptyStateRepComparison';
export { default as PhaseTimelineAxis } from './PhaseTimelineAxis';
export { default as AngleValueTooltip } from './AngleValueTooltip';

export { useRepComparisonData } from './hooks/useRepComparisonData';

export * from './types';
export { REP_COMPARISON_COLORS, JOINT_ANGLE_LABELS, PHASE_LABELS } from './constants';
