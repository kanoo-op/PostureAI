/**
 * Acceleration Pattern Analyzer
 * Analyzes acceleration patterns to detect movement phases
 */

import type { MovementPhase, JointVelocityData } from '@/types/velocity';

// Thresholds for phase detection
const PHASE_THRESHOLDS = {
  isometricVelocity: 5, // Below this = stationary
  phaseChangeAcceleration: 50, // Significant acceleration change
  hysteresis: 0.1, // Prevent rapid phase switching
};

export class AccelerationAnalyzer {
  private previousPhase: MovementPhase = 'isometric';
  private phaseStartTime: number = 0;
  private phaseVelocities: number[] = [];
  private phaseChangeBuffer: MovementPhase[] = []; // Buffer to prevent rapid phase changes
  private readonly bufferSize = 3;

  /**
   * Analyze velocity data to determine current movement phase
   * @param velocityData - Current velocity for primary joint
   * @param previousPositionY - Y position from previous frame (for direction)
   * @param currentPositionY - Current Y position
   */
  analyzePhase(
    velocityData: JointVelocityData,
    previousPositionY: number,
    currentPositionY: number
  ): {
    phase: MovementPhase;
    phaseProgress: number;
    phaseDuration: number;
  } {
    // Handle invalid velocity data
    if (!velocityData || !velocityData.isValid) {
      return {
        phase: this.previousPhase,
        phaseProgress: this.calculatePhaseProgress(),
        phaseDuration: performance.now() - this.phaseStartTime,
      };
    }

    // Determine direction from Y position change
    // In screen coordinates: increasing Y = downward = eccentric (for squats)
    const yDelta = currentPositionY - previousPositionY;
    const isMovingDown = yDelta > PHASE_THRESHOLDS.hysteresis;
    const isMovingUp = yDelta < -PHASE_THRESHOLDS.hysteresis;

    // Determine phase based on velocity magnitude and direction
    let detectedPhase: MovementPhase;

    if (velocityData.smoothedVelocity < PHASE_THRESHOLDS.isometricVelocity) {
      detectedPhase = 'isometric';
    } else if (isMovingDown) {
      detectedPhase = 'eccentric';
    } else if (isMovingUp) {
      detectedPhase = 'concentric';
    } else {
      detectedPhase = 'transition';
    }

    // Apply phase change buffering to prevent rapid switching
    this.phaseChangeBuffer.push(detectedPhase);
    if (this.phaseChangeBuffer.length > this.bufferSize) {
      this.phaseChangeBuffer.shift();
    }

    // Only change phase if majority of buffer agrees
    const phase = this.getConsensusPhase(detectedPhase);

    // Handle phase change
    if (phase !== this.previousPhase) {
      this.onPhaseChange(phase);
    }

    // Record velocity for phase analysis
    this.phaseVelocities.push(velocityData.smoothedVelocity);

    return {
      phase,
      phaseProgress: this.calculatePhaseProgress(),
      phaseDuration: performance.now() - this.phaseStartTime,
    };
  }

  /**
   * Get consensus phase from buffer
   */
  private getConsensusPhase(detectedPhase: MovementPhase): MovementPhase {
    if (this.phaseChangeBuffer.length < this.bufferSize) {
      return detectedPhase;
    }

    // Count phase occurrences
    const counts = new Map<MovementPhase, number>();
    for (const phase of this.phaseChangeBuffer) {
      counts.set(phase, (counts.get(phase) ?? 0) + 1);
    }

    // Find most common phase
    let maxCount = 0;
    let consensusPhase = this.previousPhase;
    counts.forEach((count, phase) => {
      if (count > maxCount) {
        maxCount = count;
        consensusPhase = phase;
      }
    });

    // Only switch if majority agrees
    const threshold = Math.ceil(this.bufferSize / 2);
    return maxCount >= threshold ? consensusPhase : this.previousPhase;
  }

  /**
   * Handle phase transition
   */
  private onPhaseChange(newPhase: MovementPhase): void {
    this.previousPhase = newPhase;
    this.phaseStartTime = performance.now();
    this.phaseVelocities = [];
    this.phaseChangeBuffer = [];
  }

  /**
   * Calculate progress through current phase (0-1)
   * Based on typical phase durations
   */
  private calculatePhaseProgress(): number {
    const duration = performance.now() - this.phaseStartTime;

    // Expected durations for each phase (in ms)
    const expectedDurations: Record<MovementPhase, number> = {
      eccentric: 2000, // 2 seconds for controlled descent
      concentric: 1500, // 1.5 seconds for ascent
      isometric: 1000, // 1 second hold
      transition: 300, // Quick transitions
    };

    const expected = expectedDurations[this.previousPhase];
    const progress = Math.min(duration / expected, 1);

    return progress;
  }

  /**
   * Get average velocity for current phase
   */
  getPhaseAverageVelocity(): number {
    if (this.phaseVelocities.length === 0) return 0;
    const sum = this.phaseVelocities.reduce((a, b) => a + b, 0);
    return sum / this.phaseVelocities.length;
  }

  /**
   * Get current phase duration
   */
  getPhaseDuration(): number {
    return performance.now() - this.phaseStartTime;
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): MovementPhase {
    return this.previousPhase;
  }

  /**
   * Reset analyzer state
   */
  reset(): void {
    this.previousPhase = 'isometric';
    this.phaseStartTime = performance.now();
    this.phaseVelocities = [];
    this.phaseChangeBuffer = [];
  }
}
