// Exercise types supported by the system
export type ExerciseType = 'squat' | 'pushup' | 'lunge' | 'plank' | 'deadlift' | 'static-posture';

// Joint angle types tracked
export type JointAngleType =
  | 'kneeFlexion'
  | 'hipFlexion'
  | 'torsoAngle'
  | 'ankleAngle'
  | 'elbowAngle'
  | 'shoulderAngle'
  | 'spineAlignment'
  | 'kneeValgus'
  | 'elbowValgus'      // Elbow flare angle (valgus/varus)
  | 'armSymmetry';     // Left-right arm symmetry score

// Individual angle measurement within a session
export interface AngleData {
  jointType: JointAngleType;
  min: number;        // Minimum angle achieved (degrees)
  max: number;        // Maximum angle achieved (degrees)
  average: number;    // Average angle during session (degrees)
  stdDev: number;     // Standard deviation for consistency
  sampleCount: number; // Number of samples collected
}

// Complete session record
export interface SessionRecord {
  id: string;                    // UUID
  timestamp: number;             // Unix timestamp (ms)
  exerciseType: ExerciseType;
  duration: number;              // Session duration in seconds
  repCount: number;              // Number of reps completed
  overallScore: number;          // 0-100 session score
  angles: AngleData[];           // All angle measurements
  metadata?: {
    deviceInfo?: string;
    notes?: string;
  };
}

// Trend direction indicator
export type TrendDirection = 'improving' | 'declining' | 'stable';

// Trend analysis result for a specific joint
export interface JointTrendAnalysis {
  jointType: JointAngleType;
  currentAverage: number;
  previousAverage: number;
  changeAmount: number;          // Positive = improvement (context-dependent)
  changePercent: number;
  direction: TrendDirection;
  isStatisticallySignificant: boolean;
  insight: string;               // Human-readable insight
}

// Overall trend analysis result
export interface TrendAnalysis {
  exerciseType: ExerciseType;
  periodStart: number;           // Start of analysis period (timestamp)
  periodEnd: number;             // End of analysis period (timestamp)
  sessionCount: number;
  jointTrends: JointTrendAnalysis[];
  overallTrend: TrendDirection;
  summaryInsight: string;        // e.g., "Your squat depth has improved by 5° over the last week"
}

// Storage schema with versioning
export interface AngleHistoryStorage {
  version: number;
  sessions: SessionRecord[];
  lastUpdated: number;
}

// Storage status for UI display
export interface StorageStatus {
  usedBytes: number;
  totalBytes: number;            // Estimated quota
  sessionCount: number;
  oldestSession: number | null;  // Timestamp
  newestSession: number | null;  // Timestamp
}
