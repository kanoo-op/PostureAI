import type { VideoAnalysisResult, VideoRepAnalysisResult, RepAnalysisResult } from '@/types/video';
import type { Pose3D } from '@/types/pose';

export interface VideoAnalysisViewProps {
  videoUrl: string;
  analysisResult: VideoAnalysisResult;
  repAnalysisResult: VideoRepAnalysisResult;
  language?: 'ko' | 'en';
  onBack?: () => void;
}

export interface SynchronizedPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  currentFrameIndex: number;
  currentPose: Pose3D | null;
}

export interface RepSelectorPanelProps {
  reps: RepAnalysisResult[];
  selectedRepIndex: number | null;
  onSelectRep: (repIndex: number) => void;
  currentTime: number;
  language: 'ko' | 'en';
}

export interface FormFeedbackPanelProps {
  currentTimestamp: number;
  repAnalysisResult: VideoRepAnalysisResult;
  currentRepIndex: number | null;
  language: 'ko' | 'en';
}

export interface AngleMeasurement {
  jointName: string;
  angle: number;
  targetMin: number;
  targetMax: number;
  status: 'good' | 'warning' | 'error';
}

export interface ProblemMomentCapture {
  timestamp: number;
  repNumber: number;
  score: number;
  feedbacks: string[];
  screenshotDataUrl?: string;
}

// Problem marker interface for timeline visualization
export interface ProblemMarker {
  timestamp: number;           // Timestamp in milliseconds
  timestampSeconds: number;    // Timestamp in seconds for positioning
  score: number;               // Frame score (0-100)
  level: 'error' | 'warning';  // error: score < 60, warning: 60-80
  feedbacks: string[];         // Feedback messages at this moment
  feedbackCount: number;       // Number of issues for sizing
}

// Grouped markers for nearby problem moments
export interface ProblemMarkerGroup {
  startTimestamp: number;
  endTimestamp: number;
  markers: ProblemMarker[];
  primaryLevel: 'error' | 'warning';  // Highest severity in group
  totalFeedbackCount: number;
}

// View mode for skeleton display
export type SkeletonViewMode = 'side-by-side' | 'overlay';

// Skeleton control state
export interface SkeletonControlState {
  viewMode: SkeletonViewMode;
  opacity: number;              // 0.25 to 1.0
  showJointAngles: boolean;
  focusModeEnabled: boolean;
}

// Joint angle data for display
export interface JointAngleData {
  jointName: string;
  angle: number;
  position: { x: number; y: number };
  isProblematic: boolean;
}

// Problematic joint info for focus mode
export interface ProblematicJoint {
  jointIndex: number;
  jointName: string;
  severity: 'warning' | 'error';
  message: string;
}
