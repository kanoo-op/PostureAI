import type { VideoAnalysisResult, VideoRepAnalysisResult, RepAnalysisResult } from './video';

// Clip boundary stored as frame numbers for precision
export interface ClipBoundary {
  startFrame: number;
  endFrame: number;
  startTimestamp: number;  // milliseconds, derived from frame
  endTimestamp: number;    // milliseconds, derived from frame
}

// Clip state for editor
export interface ClipEditorState {
  clipBoundary: ClipBoundary;
  selectedRepRange: RepRangeSelection | null;
  isDragging: 'start' | 'end' | null;
  previewTime: number;  // Current preview position in ms
  undoStack: ClipBoundary[];
  redoStack: ClipBoundary[];
}

// Rep range selection
export interface RepRangeSelection {
  startRepIndex: number;  // 0-based
  endRepIndex: number;    // 0-based, inclusive
}

// Clipped segment metadata
export interface ClippedSegmentMetadata {
  id: string;
  parentSessionId: string;
  originalVideoTimestamps: {
    start: number;  // Original video start timestamp (ms)
    end: number;    // Original video end timestamp (ms)
  };
  clipBoundary: ClipBoundary;
  selectedReps: number[];  // Rep numbers included in clip
  createdAt: number;
  durationMs: number;
}

// Export options
export interface ClipExportOptions {
  createNewSession: boolean;
  runAnalysis: boolean;
  includeOriginalReference: boolean;
}

// Clipped session result
export interface ClippedSession {
  id: string;
  metadata: ClippedSegmentMetadata;
  analysisResult?: VideoAnalysisResult;
  repAnalysisResult?: VideoRepAnalysisResult;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  errorMessage?: string;
}

// Validation constraints
export const CLIP_CONSTRAINTS = {
  MIN_DURATION_MS: 2000,     // 2 seconds minimum
  MAX_DURATION_MS: 300000,   // 5 minutes maximum to prevent accidental full re-analysis
  FRAME_STEP_MS: 33,         // ~30fps frame step for keyboard navigation
} as const;

// Export status for tracking clip export progress
export type ClipExportStatus = 'idle' | 'exporting' | 'analyzing' | 'completed' | 'error';

// Export progress tracking
export interface ClipExportProgress {
  status: ClipExportStatus;
  percent: number;
  message: string;
}
