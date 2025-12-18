import type { FramePoseData, VideoAnalysisResult, ThumbnailData } from '@/types/video';
import type { Keypoint3D } from '@/types/pose';

// Problem severity levels for markers
export type ProblemSeverity = 'critical' | 'moderate' | 'minor';

// Problem marker data structure
export interface ProblemMarker {
  id: string;
  timestamp: number;        // milliseconds
  severity: ProblemSeverity;
  type: string;             // e.g., 'knee_valgus', 'back_rounding'
  description: string;
  frameIndex: number;
}

// Rep boundary marker
export interface RepBoundary {
  id: string;
  repNumber: number;
  startTimestamp: number;   // milliseconds
  endTimestamp: number;     // milliseconds
  startFrameIndex: number;
  endFrameIndex: number;
}

// Timeline zoom state
export interface TimelineZoomState {
  level: number;            // 1x to 10x
  centerTimestamp: number;  // Center point of zoom
  visibleRange: {
    start: number;          // milliseconds
    end: number;
  };
}

// Main timeline state
export interface TimelineState {
  currentTime: number;      // milliseconds
  duration: number;         // milliseconds
  isPlaying: boolean;
  zoom: TimelineZoomState;
  hoveredTimestamp: number | null;
}

// Props for main VideoTimeline component
export interface VideoTimelineProps {
  analysisResult: VideoAnalysisResult | null;
  currentTime: number;              // Current video position in seconds
  duration: number;                 // Total duration in seconds
  isPlaying: boolean;
  problemMarkers: ProblemMarker[];
  repBoundaries: RepBoundary[];
  onSeek: (time: number) => void;   // Callback when user seeks
  onPoseChange?: (pose: Keypoint3D[] | null, frameIndex: number) => void;
  className?: string;
  showPosePreview?: boolean;
  showProblemMarkers?: boolean;
  showRepBoundaries?: boolean;
  initialZoom?: number;
  thumbnails?: ThumbnailData[];           // Thumbnails for strip display
  showThumbnailStrip?: boolean;           // Whether to show thumbnail strip
  isThumbnailsLoading?: boolean;          // Loading state for thumbnails
  onThumbnailHover?: (thumbnail: ThumbnailData | null) => void; // Hover callback
}

// Pose preview panel props
export interface PosePreviewPanelProps {
  keypoints: Keypoint3D[] | null;
  timestamp: number;
  confidence: number;
  width?: number;
  height?: number;
  className?: string;
}

// Marker cluster for dense regions
export interface MarkerCluster {
  id: string;
  startTimestamp: number;
  endTimestamp: number;
  markers: ProblemMarker[];
  dominantSeverity: ProblemSeverity;
}

// Thumbnail strip props
export interface ThumbnailStripProps {
  thumbnails: ThumbnailData[];
  visibleRange: { start: number; end: number };
  duration: number;
  isLoading?: boolean;
  className?: string;
}

// Thumbnail hover preview props
export interface ThumbnailHoverPreviewProps {
  thumbnail: ThumbnailData | null;
  position: { x: number; y: number };
  visible: boolean;
}
