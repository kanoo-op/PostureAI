// src/components/ROMDisplayPanel/types.ts

import { JointAngleType } from '@/types/angleHistory';
import { Keypoint } from '@tensorflow-models/pose-detection';
import {
  JointROMResult,
  SessionROMSummary,
  MobilityAssessment,
  JointROMTracker,
} from '@/utils/jointROMAnalyzer';

export interface ROMDisplayPanelProps {
  keypoints: Keypoint[];
  romTracker: JointROMTracker;  // Pass tracker instance from parent
  isTracking?: boolean;
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
  className?: string;
  compact?: boolean;
  defaultCollapsed?: boolean;   // Panel starts collapsed
}

export interface JointROMCardProps {
  result: JointROMResult;
  currentAngle?: number;        // Live current angle
  compact?: boolean;
}

export interface ROMProgressBarProps {
  percentOfNormal: number;      // 0-100+
  assessment: MobilityAssessment;
  showLabel?: boolean;
}

export interface PanelHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
  sessionDuration?: number;     // In seconds
}

export interface SessionSummaryFooterProps {
  summary: SessionROMSummary | null;
  compact?: boolean;
}

export interface EmptyStateProps {
  message?: string;
}

export interface CurrentJointStats {
  jointType: JointAngleType;
  min: number;
  max: number;
  current: number;
  side?: 'left' | 'right';
}
