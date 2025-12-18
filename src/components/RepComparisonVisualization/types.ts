import { JointAngleType, SessionRecord, ExerciseType } from '@/types/angleHistory';

// Movement phases for phase-normalized comparison
export type MovementPhase = 'setup' | 'descent' | 'bottom' | 'ascent' | 'lockout';

// Normalized rep data for overlay comparison
export interface NormalizedRepData {
  repNumber: number;
  sessionId: string;
  sessionTimestamp: number;
  phaseData: PhaseAngleData[];
  overallQuality: number;
}

// Angle data at each phase point
export interface PhaseAngleData {
  phase: MovementPhase;
  phasePercent: number; // 0-100 normalized timeline
  angles: JointAnglePoint[];
}

export interface JointAnglePoint {
  jointType: JointAngleType;
  value: number;
  deviation: number; // from mean across selected reps
}

// Deviation highlight data
export interface DeviationPoint {
  repNumber: number;
  phasePercent: number;
  jointType: JointAngleType;
  deviation: number;
  severity: 'minor' | 'moderate' | 'significant';
}

// Component props
export interface RepComparisonVisualizationProps {
  sessionId?: string;
  exerciseType: ExerciseType;
  compact?: boolean;
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
  className?: string;
}

export interface MultiRepAngleChartProps {
  selectedReps: NormalizedRepData[];
  selectedJoints: JointAngleType[];
  deviationPoints: DeviationPoint[];
  showDeviationBand: boolean;
  compact?: boolean;
}

export interface RepSelectorPanelProps {
  availableReps: { repNumber: number; sessionId: string; quality: number }[];
  selectedRepNumbers: number[];
  onSelectionChange: (selected: number[]) => void;
  maxSelections?: number;
}

export interface SessionSelectorProps {
  sessions: SessionRecord[];
  selectedSessionIds: string[];
  onSessionChange: (sessionIds: string[]) => void;
  currentSessionId?: string;
}

export interface JointFilterDropdownProps {
  availableJoints: JointAngleType[];
  selectedJoints: JointAngleType[];
  onJointChange: (joints: JointAngleType[]) => void;
}

export interface DeviationHighlightOverlayProps {
  deviationPoints: DeviationPoint[];
  chartWidth: number;
  chartHeight: number;
}

export interface RepStatsSummaryProps {
  selectedReps: NormalizedRepData[];
  consistencyScore: number;
  averageDeviation: number;
}

export interface ChartLegendProps {
  selectedReps: { repNumber: number; color: string }[];
  selectedJoints: JointAngleType[];
}

export interface PhaseTimelineAxisProps {
  width: number;
  phases: MovementPhase[];
}

export interface AngleValueTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  repNumber: number;
  jointType: JointAngleType;
  value: number;
  deviation: number;
  phase: MovementPhase;
}

export interface SessionComparisonToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}
