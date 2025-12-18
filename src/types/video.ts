import type { Pose3D } from '@/types/pose';

// Video metadata extracted from file
export interface VideoMetadata {
  duration: number;        // Duration in seconds
  width: number;           // Native video width
  height: number;          // Native video height
  frameRate?: number;      // Estimated frame rate
  fileSize: number;        // File size in bytes
  mimeType: string;        // MIME type (video/mp4, video/webm)
  fileName: string;        // Original file name
  lastModified: number;    // File last modified timestamp
}

// Validation result structure
export interface VideoValidationResult {
  isValid: boolean;
  errors: VideoValidationError[];
  warnings: VideoValidationWarning[];
  metadata: VideoMetadata | null;
}

export interface VideoValidationError {
  code: 'INVALID_FORMAT' | 'FILE_TOO_LARGE' | 'DURATION_TOO_SHORT' | 'DURATION_TOO_LONG' | 'CORRUPTED_FILE' | 'LOAD_ERROR';
  message: string;
}

export interface VideoValidationWarning {
  code: 'LOW_RESOLUTION' | 'LOW_FRAME_RATE' | 'LARGE_FILE';
  message: string;
}

// Validation configuration
export interface VideoValidationConfig {
  maxFileSizeMB: number;          // Default: 500
  minDurationSeconds: number;      // Default: 10
  maxDurationSeconds: number;      // Default: 600 (10 minutes)
  acceptedFormats: string[];       // Default: ['video/mp4', 'video/webm']
  minResolution?: { width: number; height: number };
}

// Upload state tracking
export type UploadStatus = 'idle' | 'selecting' | 'validating' | 'ready' | 'error';

export interface UploadState {
  status: UploadStatus;
  file: File | null;
  metadata: VideoMetadata | null;
  validationResult: VideoValidationResult | null;
  errorMessage: string | null;
}

// Video player state
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isMuted: boolean;
  volume: number;
  isBuffering: boolean;
  hasEnded: boolean;
}

// Frame extraction types
export interface ExtractedFrame {
  timestamp: number;      // Time in seconds
  imageData: ImageData;   // Raw pixel data
  canvas: HTMLCanvasElement; // Canvas with frame drawn
  thumbnailDataUrl?: string;  // Optional thumbnail data URL
}

// Thumbnail data for timeline preview
export interface ThumbnailData {
  timestamp: number;      // Time in seconds
  dataUrl: string;        // Base64 data URL
  width: number;          // Thumbnail width (default: 120)
  height: number;         // Thumbnail height (default: 68)
}

export interface FrameExtractionConfig {
  frameRate?: number;     // Frames per second to extract
  startTime?: number;     // Start extraction from (seconds)
  endTime?: number;       // End extraction at (seconds)
  width?: number;         // Output frame width
  height?: number;        // Output frame height
}

// Video Analysis Status
export type VideoAnalysisStatus = 'idle' | 'initializing' | 'extracting' | 'processing' | 'completed' | 'cancelled' | 'error';

// Configuration for video analysis
export interface VideoAnalysisConfig {
  frameRate: number;              // Frames per second to extract (default: 10)
  startTime?: number;             // Start time in seconds (default: 0)
  endTime?: number;               // End time in seconds (default: video duration)
  batchSize: number;              // Frames per batch for processing (default: 5)
  width?: number;                 // Output frame width (default: native)
  height?: number;                // Output frame height (default: native)
  modelComplexity?: 0 | 1 | 2;    // BlazePose model complexity (default: 1)
  minDetectionConfidence?: number; // Min confidence for detection (default: 0.5)
  thumbnailInterval?: number;     // Seconds between thumbnails (default: 1)
  thumbnailWidth?: number;        // Thumbnail width (default: 120)
  thumbnailHeight?: number;       // Thumbnail height (default: 68)
  generateThumbnails?: boolean;   // Whether to generate thumbnails (default: true)
}

// Progress tracking during analysis
export interface VideoAnalysisProgress {
  status: VideoAnalysisStatus;
  currentFrame: number;
  totalFrames: number;
  percent: number;                // 0-100
  estimatedTimeRemaining: number; // In milliseconds
  processingRate: number;         // Frames per second being processed
  failedFrames: number;           // Count of frames where pose detection failed
  thumbnailsGenerated?: number;   // Count of generated thumbnails
  thumbnailsTotal?: number;       // Total thumbnails to generate
  isThumbnailPhase?: boolean;     // Currently generating thumbnails
}

// Single frame pose data with timestamp
export interface FramePoseData {
  frameIndex: number;
  timestamp: number;              // In milliseconds for precision
  pose: Pose3D | null;            // null if detection failed
  confidence: number;             // Average keypoint confidence
  processingTime: number;         // Time taken to process this frame in ms
}

// Complete video analysis result
export interface VideoAnalysisResult {
  id: string;                     // Unique analysis ID
  videoMetadata: VideoMetadata;
  config: VideoAnalysisConfig;
  frames: FramePoseData[];
  thumbnails?: ThumbnailData[];   // Thumbnail data for timeline
  summary: VideoAnalysisSummary;
  createdAt: number;              // Unix timestamp
  completedAt: number | null;     // Unix timestamp when completed
}

// Summary statistics for the analysis
export interface VideoAnalysisSummary {
  totalFrames: number;
  successfulFrames: number;
  failedFrames: number;
  averageConfidence: number;
  totalProcessingTime: number;    // In milliseconds
  averageProcessingRate: number;  // Frames per second
}

// ============================================
// Rep Analysis Types
// ============================================

/**
 * Supported exercise types for video analysis
 * 비디오 분석에서 지원하는 운동 유형
 */
export type VideoExerciseType = 'squat' | 'lunge' | 'deadlift' | 'pushup' | 'plank' | 'unknown';

/**
 * Phase weight configuration for scoring
 * 단계별 가중치 설정 (점수 계산용)
 */
export interface PhaseWeightConfig {
  standing: number;    // Weight for standing phase
  descending: number;  // Weight for descent phase
  bottom: number;      // Weight for bottom phase (critical for form)
  ascending: number;   // Weight for ascent phase
}

/**
 * Default phase weights per exercise type
 * 운동 유형별 기본 단계 가중치
 */
export interface ExercisePhaseWeights {
  squat: PhaseWeightConfig;
  lunge: PhaseWeightConfig;
  deadlift: PhaseWeightConfig;
  pushup: PhaseWeightConfig;
  plank: PhaseWeightConfig;
}

/**
 * Individual rep analysis result
 * 개별 반복 분석 결과
 */
export interface RepAnalysisResult {
  repNumber: number;              // Rep index (1-based)
  startTimestamp: number;         // Start time in milliseconds
  endTimestamp: number;           // End time in milliseconds
  duration: number;               // Rep duration in milliseconds

  // Scoring
  score: number;                  // Overall rep score (0-100)
  phaseScores: {                  // Score breakdown by phase
    standing: number | null;
    descending: number | null;
    bottom: number | null;
    ascending: number | null;
  };

  // Frame-level analysis
  frameCount: number;             // Number of frames in this rep
  frameScores: number[];          // Score for each frame in rep
  minScore: number;               // Minimum frame score (worst moment)
  maxScore: number;               // Maximum frame score (best moment)
  avgScore: number;               // Average frame score

  // Worst moment identification
  worstMoment: {
    timestamp: number;            // Timestamp of worst frame
    frameIndex: number;           // Frame index within rep
    score: number;                // Score at worst moment
    feedbacks: string[];          // Feedback messages at worst moment
  };

  // Form feedback aggregation
  primaryIssues: string[];        // Most frequent issues during rep
  feedbackSummary: Record<string, number>; // Issue frequency count
}

/**
 * Rep comparison data for consistency analysis
 * 반복 비교 데이터 (일관성 분석용)
 */
export interface RepComparisonData {
  repNumber: number;
  score: number;
  duration: number;
  deviation: number;              // Standard deviation from mean
  trend: 'improving' | 'declining' | 'stable';
  comparedToPrevious: number | null;  // Score difference from previous rep
}

/**
 * Consistency metrics across all reps
 * 전체 반복에 대한 일관성 메트릭
 */
export interface ConsistencyMetrics {
  overallConsistency: number;     // 0-100 consistency score
  scoreStdDev: number;            // Standard deviation of scores
  durationStdDev: number;         // Standard deviation of durations
  trend: 'improving' | 'declining' | 'stable' | 'fluctuating';
  trendSlope: number;             // Linear regression slope
  bestRep: number;                // Rep number with highest score
  worstRep: number;               // Rep number with lowest score
}

/**
 * Complete video rep analysis result
 * 전체 비디오 반복 분석 결과
 */
export interface VideoRepAnalysisResult {
  id: string;                     // Analysis ID
  videoAnalysisId: string;        // Reference to VideoAnalysisResult
  exerciseType: VideoExerciseType;
  exerciseTypeConfidence: number; // 0-1 confidence in detected type

  // Rep results
  totalReps: number;
  reps: RepAnalysisResult[];

  // Overall summary
  summary: {
    averageScore: number;
    minScore: number;
    maxScore: number;
    totalDuration: number;        // Total exercise duration in ms
    averageRepDuration: number;
  };

  // Consistency analysis
  consistency: ConsistencyMetrics;
  comparison: RepComparisonData[];

  // Processing metadata
  config: VideoRepAnalyzerConfig;
  processedAt: number;            // Unix timestamp
}

/**
 * Configuration for video rep analyzer
 * 비디오 반복 분석기 설정
 */
export interface VideoRepAnalyzerConfig {
  exerciseType?: VideoExerciseType;  // Manual override (auto-detect if not provided)
  phaseWeights?: Partial<PhaseWeightConfig>;
  minRepDuration?: number;           // Minimum rep duration in ms (default: 500)
  maxRepDuration?: number;           // Maximum rep duration in ms (default: 10000)
  scoreAggregation?: 'weighted' | 'average' | 'minimum';
  smoothingEnabled?: boolean;        // Pass through to underlying analyzer
  skipFailedFrames?: boolean;        // Skip frames with failed pose detection
  interpolateGaps?: boolean;         // Interpolate missing frames
}

// ============================================
// Analysis Cache Types
// ============================================

/** Status of a cached analysis entry */
export type CacheAnalysisStatus = 'in_progress' | 'completed' | 'paused' | 'error';

/** Cache entry for video analysis with progress persistence */
export interface AnalysisCacheEntry {
  id: string;                        // Unique analysis ID
  videoMetadata: VideoMetadata;      // Video file metadata
  videoChecksum: string;             // MD5/hash for file validation on resume
  config: VideoAnalysisConfig;       // Analysis configuration used
  frames: FramePoseData[];           // Processed frames so far
  progress: VideoAnalysisProgress;   // Current progress state
  status: CacheAnalysisStatus;       // Cache entry status
  exerciseType: VideoExerciseType | 'auto'; // Selected exercise type
  createdAt: number;                 // Unix timestamp
  updatedAt: number;                 // Last update timestamp
  expiresAt: number;                 // Expiration timestamp (7 days default)
  errorMessage?: string;             // Error message if status is 'error'
}

/** Summary of a cached analysis for history display */
export interface AnalysisCacheSummary {
  id: string;
  videoName: string;
  exerciseType: VideoExerciseType | 'auto';
  status: CacheAnalysisStatus;
  progressPercent: number;
  framesProcessed: number;
  totalFrames: number;
  createdAt: number;
  updatedAt: number;
}

/** Storage quota information */
export interface StorageQuotaInfo {
  used: number;          // Bytes used
  available: number;     // Bytes available
  percentUsed: number;   // 0-100
}

// ============================================
// Recording Types
// ============================================

/** Recording state machine */
export type RecordingState = 'idle' | 'initializing' | 'recording' | 'paused' | 'stopped' | 'error';

/** Metadata for recorded video */
export interface RecordingMetadata {
  duration: number;           // Duration in milliseconds
  width: number;
  height: number;
  mimeType: string;
  size: number;               // File size in bytes
  recordedAt: number;         // Unix timestamp
}

/** Camera error types */
export type CameraError = 'denied' | 'in_use' | 'not_supported' | 'quota_exceeded' | 'unknown';
