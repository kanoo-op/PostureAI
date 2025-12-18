import type { VideoExerciseType, ConsistencyMetrics } from './video';

// Schema version for future migrations
export const SESSION_HISTORY_SCHEMA_VERSION = 1;

export interface VideoSessionRecord {
  id: string;                          // UUID
  schemaVersion: number;               // For data migrations
  timestamp: number;                   // Unix timestamp (ms)
  exerciseType: VideoExerciseType;     // 'squat' | 'lunge' | 'deadlift' | 'pushup' | 'plank'
  duration: number;                    // Total duration in ms
  totalReps: number;
  overallScore: number;                // 0-100
  perRepScores: number[];              // Score for each rep
  problemMoments: ProblemMomentSummary[];
  videoMetadata: {
    fileName: string;
    fileSize: number;
    width: number;
    height: number;
  };
  consistency: ConsistencyMetrics;     // From VideoRepAnalysisResult
}

export interface ProblemMomentSummary {
  timestamp: number;
  score: number;
  issues: string[];
}

export interface SessionComparisonResult {
  sessions: VideoSessionRecord[];
  scoreProgression: {
    sessionId: string;
    score: number;
    date: number;
  }[];
  averageScoreChange: number;          // Positive = improvement
  consistencyTrend: 'improving' | 'declining' | 'stable';
  commonIssues: string[];              // Issues appearing across sessions
  resolvedIssues: string[];            // Issues that improved
}

export interface ProgressChartData {
  labels: string[];                    // Date labels
  scores: number[];
  repCounts: number[];
  exerciseType: VideoExerciseType;
}
