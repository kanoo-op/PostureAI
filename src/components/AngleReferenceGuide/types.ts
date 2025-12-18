import { ExerciseType, JointAngleType } from '@/types/angleHistory';
import { Keypoint } from '@tensorflow-models/pose-detection';

// Ideal angle configuration per exercise
export interface IdealAngleConfig {
  jointType: JointAngleType;
  idealValue: number;           // Target angle in degrees
  acceptableRange: { min: number; max: number }; // Acceptable deviation range
  warningThreshold: number;     // Degrees beyond acceptable = warning
  description: string;          // User-friendly description
  descriptionKo: string;        // Korean description
}

// Exercise-specific ideal form configuration
export interface ExerciseIdealForm {
  exerciseType: ExerciseType;
  name: string;
  nameKo: string;
  phases: ExercisePhase[];      // Movement phases with keyframes
  angles: IdealAngleConfig[];   // Ideal angles for this exercise
}

// Movement phase (for animation)
export interface ExercisePhase {
  id: string;
  name: string;
  nameKo: string;
  duration: number;             // Duration in ms for animation
  keypointPositions: KeypointPosition[]; // 3D positions for this phase
}

// 3D keypoint position for ideal skeleton
export interface KeypointPosition {
  index: number;                // BlazePose keypoint index
  x: number;                    // Normalized X (0-1)
  y: number;                    // Normalized Y (0-1)
  z: number;                    // Depth value
}

// Comparison result between user and ideal
export interface AngleComparisonResult {
  jointType: JointAngleType;
  userAngle: number;
  idealAngle: number;
  deviation: number;            // Absolute difference
  status: 'optimal' | 'acceptable' | 'warning';
  correctionHint: string;
  correctionHintKo: string;
}

// Component props
export interface AngleReferenceGuideProps {
  exerciseType: ExerciseType;
  userKeypoints?: Keypoint[];   // Real-time user pose (optional)
  width?: number;
  height?: number;
  showIdealSkeleton?: boolean;
  showOverlayComparison?: boolean;
  showAngleValues?: boolean;
  showAnimation?: boolean;
  animationSpeed?: number;      // 0.5x to 2x
  selectedPhase?: string;       // Specific phase to display
  onPhaseChange?: (phaseId: string) => void;
  className?: string;
}

// Viewport controls state
export interface ViewportControls {
  rotationX: number;
  rotationY: number;
  zoom: number;
  panX: number;
  panY: number;
}
