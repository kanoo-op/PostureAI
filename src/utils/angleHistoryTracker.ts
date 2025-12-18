import {
  ExerciseType,
  JointAngleType,
  AngleData,
  SessionRecord
} from '@/types/angleHistory';
import { addSession } from './angleHistoryStorage';

// Internal accumulator for collecting angle samples during a session
interface AngleAccumulator {
  jointType: JointAngleType;
  samples: number[];
}

export class AngleHistoryTracker {
  private exerciseType: ExerciseType;
  private startTime: number;
  private accumulators: Map<JointAngleType, AngleAccumulator>;
  private repCount: number;
  private scoreSum: number;
  private scoreSamples: number;
  private isRecording: boolean;

  constructor(exerciseType: ExerciseType) {
    this.exerciseType = exerciseType;
    this.startTime = 0;
    this.accumulators = new Map();
    this.repCount = 0;
    this.scoreSum = 0;
    this.scoreSamples = 0;
    this.isRecording = false;
  }

  // Start a new recording session
  startSession(): void {
    this.startTime = Date.now();
    this.accumulators.clear();
    this.repCount = 0;
    this.scoreSum = 0;
    this.scoreSamples = 0;
    this.isRecording = true;
  }

  // Record an angle measurement (call this from pose analysis callbacks)
  recordAngle(jointType: JointAngleType, angle: number): void {
    if (!this.isRecording) return;
    if (!isFinite(angle) || angle < 0 || angle > 360) return;

    let accumulator = this.accumulators.get(jointType);
    if (!accumulator) {
      accumulator = { jointType, samples: [] };
      this.accumulators.set(jointType, accumulator);
    }
    accumulator.samples.push(angle);
  }

  // Record multiple angles at once (convenient for analyzer results)
  recordAngles(angles: Partial<Record<JointAngleType, number>>): void {
    for (const [joint, angle] of Object.entries(angles)) {
      if (angle !== undefined) {
        this.recordAngle(joint as JointAngleType, angle);
      }
    }
  }

  // Record a rep completion
  recordRep(): void {
    if (!this.isRecording) return;
    this.repCount++;
  }

  // Record an overall score sample
  recordScore(score: number): void {
    if (!this.isRecording) return;
    if (score >= 0 && score <= 100) {
      this.scoreSum += score;
      this.scoreSamples++;
    }
  }

  // End session and save to storage
  endSession(metadata?: { notes?: string }): SessionRecord | null {
    if (!this.isRecording) return null;
    this.isRecording = false;

    const endTime = Date.now();
    const duration = Math.round((endTime - this.startTime) / 1000);

    // Calculate angle statistics
    const angles: AngleData[] = [];
    const accumulatorValues = Array.from(this.accumulators.values());
    for (let i = 0; i < accumulatorValues.length; i++) {
      const accumulator = accumulatorValues[i];
      if (accumulator.samples.length === 0) continue;

      const stats = this.calculateStatistics(accumulator.samples);
      angles.push({
        jointType: accumulator.jointType,
        min: stats.min,
        max: stats.max,
        average: stats.average,
        stdDev: stats.stdDev,
        sampleCount: accumulator.samples.length
      });
    }

    // Calculate overall score
    const overallScore = this.scoreSamples > 0
      ? Math.round(this.scoreSum / this.scoreSamples)
      : 0;

    // Create session record
    const session: SessionRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: this.startTime,
      exerciseType: this.exerciseType,
      duration,
      repCount: this.repCount,
      overallScore,
      angles,
      metadata: {
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...metadata
      }
    };

    // Save to storage
    const saved = addSession(session);
    if (!saved) {
      console.error('Failed to save session to storage');
    }

    return session;
  }

  // Cancel session without saving
  cancelSession(): void {
    this.isRecording = false;
    this.accumulators.clear();
  }

  // Get current session stats (for live display)
  getCurrentStats(): {
    duration: number;
    repCount: number;
    averageScore: number;
    sampleCounts: Record<string, number>;
  } {
    const currentTime = Date.now();
    const duration = this.isRecording
      ? Math.round((currentTime - this.startTime) / 1000)
      : 0;

    const sampleCounts: Record<string, number> = {};
    const entries = Array.from(this.accumulators.entries());
    for (let i = 0; i < entries.length; i++) {
      const [joint, acc] = entries[i];
      sampleCounts[joint] = acc.samples.length;
    }

    return {
      duration,
      repCount: this.repCount,
      averageScore: this.scoreSamples > 0
        ? Math.round(this.scoreSum / this.scoreSamples)
        : 0,
      sampleCounts
    };
  }

  // Check if currently recording
  getIsRecording(): boolean {
    return this.isRecording;
  }

  // Private: Calculate statistical measures
  private calculateStatistics(samples: number[]): {
    min: number;
    max: number;
    average: number;
    stdDev: number;
  } {
    const n = samples.length;
    if (n === 0) {
      return { min: 0, max: 0, average: 0, stdDev: 0 };
    }

    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const sum = samples.reduce((a, b) => a + b, 0);
    const average = sum / n;

    // Standard deviation
    const squaredDiffs = samples.map(x => Math.pow(x - average, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      average: Math.round(average * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10
    };
  }
}

// Factory function for convenience
export function createAngleTracker(exerciseType: ExerciseType): AngleHistoryTracker {
  return new AngleHistoryTracker(exerciseType);
}
