import type {
  ClipBoundary,
  ClippedSegmentMetadata,
  CLIP_CONSTRAINTS,
} from '@/types/videoClip';
import type {
  FramePoseData,
  VideoAnalysisResult,
  VideoRepAnalysisResult,
  RepAnalysisResult,
} from '@/types/video';

/**
 * Extract frames within clip boundary from existing analysis
 */
export function extractClippedFrames(
  frames: FramePoseData[],
  clipBoundary: ClipBoundary
): FramePoseData[] {
  return frames.filter(
    frame =>
      frame.timestamp >= clipBoundary.startTimestamp &&
      frame.timestamp <= clipBoundary.endTimestamp
  );
}

/**
 * Extract reps within clip boundary
 */
export function extractClippedReps(
  reps: RepAnalysisResult[],
  clipBoundary: ClipBoundary
): RepAnalysisResult[] {
  return reps.filter(
    rep =>
      rep.startTimestamp >= clipBoundary.startTimestamp &&
      rep.endTimestamp <= clipBoundary.endTimestamp
  );
}

/**
 * Extract reps by rep numbers
 */
export function extractRepsByNumbers(
  reps: RepAnalysisResult[],
  repNumbers: number[]
): RepAnalysisResult[] {
  return reps.filter(rep => repNumbers.includes(rep.repNumber));
}

/**
 * Create metadata for clipped segment with parent reference
 */
export function createClipMetadata(
  parentSessionId: string,
  clipBoundary: ClipBoundary,
  selectedReps: number[]
): ClippedSegmentMetadata {
  const clipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: clipId,
    parentSessionId,
    originalVideoTimestamps: {
      start: clipBoundary.startTimestamp,
      end: clipBoundary.endTimestamp,
    },
    clipBoundary,
    selectedReps,
    createdAt: Date.now(),
    durationMs: clipBoundary.endTimestamp - clipBoundary.startTimestamp,
  };
}

/**
 * Validate clip boundary against constraints
 */
export function validateClipBoundary(clipBoundary: ClipBoundary): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const durationMs = clipBoundary.endTimestamp - clipBoundary.startTimestamp;

  // Import constraints inline to avoid circular dependency issues
  const MIN_DURATION_MS = 2000;  // 2 seconds
  const MAX_DURATION_MS = 300000; // 5 minutes

  if (durationMs < MIN_DURATION_MS) {
    errors.push(`Clip duration must be at least ${MIN_DURATION_MS / 1000} seconds`);
  }

  if (durationMs > MAX_DURATION_MS) {
    errors.push(`Clip duration must not exceed ${MAX_DURATION_MS / 60000} minutes`);
  }

  if (clipBoundary.startFrame >= clipBoundary.endFrame) {
    errors.push('Start frame must be before end frame');
  }

  if (clipBoundary.startTimestamp < 0) {
    errors.push('Start timestamp cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate processing time for UI feedback
 * Based on frame count and typical processing rate
 */
export function estimateClipAnalysisTime(
  clipBoundary: ClipBoundary,
  frameRate: number,
  processingRatePerSecond: number = 10
): number {
  const durationSeconds = (clipBoundary.endTimestamp - clipBoundary.startTimestamp) / 1000;
  const estimatedFrames = durationSeconds * frameRate;
  const estimatedSeconds = estimatedFrames / processingRatePerSecond;

  // Add 20% buffer for overhead
  return Math.ceil(estimatedSeconds * 1.2 * 1000); // Return in milliseconds
}

/**
 * Create clipped analysis result from existing analysis
 */
export function createClippedAnalysis(
  originalAnalysis: VideoAnalysisResult,
  clipBoundary: ClipBoundary,
  clipId: string
): VideoAnalysisResult {
  const clippedFrames = extractClippedFrames(originalAnalysis.frames, clipBoundary);

  const successfulFrames = clippedFrames.filter(f => f.pose !== null).length;
  const failedFrames = clippedFrames.filter(f => f.pose === null).length;
  const totalConfidence = clippedFrames.reduce((sum, f) => sum + f.confidence, 0);

  return {
    ...originalAnalysis,
    id: clipId,
    frames: clippedFrames,
    summary: {
      totalFrames: clippedFrames.length,
      successfulFrames,
      failedFrames,
      averageConfidence: clippedFrames.length > 0 ? totalConfidence / clippedFrames.length : 0,
      totalProcessingTime: clippedFrames.reduce((sum, f) => sum + f.processingTime, 0),
      averageProcessingRate: originalAnalysis.summary.averageProcessingRate,
    },
    createdAt: Date.now(),
    completedAt: Date.now(),
  };
}

/**
 * Create clipped rep analysis result from existing analysis
 */
export function createClippedRepAnalysis(
  originalRepAnalysis: VideoRepAnalysisResult,
  selectedReps: number[],
  clipId: string
): VideoRepAnalysisResult | null {
  const clippedReps = extractRepsByNumbers(originalRepAnalysis.reps, selectedReps);

  if (clippedReps.length === 0) {
    return null;
  }

  const scores = clippedReps.map(r => r.score);
  const durations = clippedReps.map(r => r.duration);

  return {
    ...originalRepAnalysis,
    id: clipId,
    videoAnalysisId: clipId,
    totalReps: clippedReps.length,
    reps: clippedReps,
    summary: {
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      totalDuration: durations.reduce((a, b) => a + b, 0),
      averageRepDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    },
    comparison: clippedReps.map((rep, index) => ({
      repNumber: rep.repNumber,
      score: rep.score,
      duration: rep.duration,
      deviation: 0, // Recalculate if needed
      trend: 'stable' as const,
      comparedToPrevious: index > 0 ? rep.score - clippedReps[index - 1].score : null,
    })),
    processedAt: Date.now(),
  };
}

/**
 * Format clip duration for display
 */
export function formatClipDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((durationMs % 1000) / 10);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${seconds}.${ms.toString().padStart(2, '0')}s`;
}

/**
 * Calculate frame number from timestamp
 */
export function timestampToFrame(timestampMs: number, frameRate: number): number {
  return Math.round((timestampMs / 1000) * frameRate);
}

/**
 * Calculate timestamp from frame number
 */
export function frameToTimestamp(frame: number, frameRate: number): number {
  return (frame / frameRate) * 1000;
}
