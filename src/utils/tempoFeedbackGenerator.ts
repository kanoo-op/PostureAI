/**
 * Tempo Feedback Generator
 * Generate user-friendly feedback based on velocity/acceleration patterns
 */

import type {
  VelocityCategory,
  MovementPhase,
  TempoAnalysis,
  VelocityThresholds,
  ExerciseVelocityConfig,
  TrackedJoint,
} from '@/types/velocity';

// Default velocity thresholds (pixels/second, normalized to body height)
export const DEFAULT_VELOCITY_THRESHOLDS: Record<string, ExerciseVelocityConfig> = {
  squat: {
    exerciseType: 'squat',
    eccentricThresholds: {
      tooSlow: 20,
      slow: 50,
      optimal: { min: 80, max: 150 },
      fast: 200,
      tooFast: 300,
    },
    concentricThresholds: {
      tooSlow: 30,
      slow: 70,
      optimal: { min: 100, max: 200 },
      fast: 280,
      tooFast: 400,
    },
    trackedJoints: ['leftHip', 'rightHip', 'leftKnee', 'rightKnee'],
    primaryJoint: 'leftHip',
  },
  pushup: {
    exerciseType: 'pushup',
    eccentricThresholds: {
      tooSlow: 15,
      slow: 40,
      optimal: { min: 60, max: 120 },
      fast: 160,
      tooFast: 250,
    },
    concentricThresholds: {
      tooSlow: 20,
      slow: 50,
      optimal: { min: 80, max: 150 },
      fast: 200,
      tooFast: 300,
    },
    trackedJoints: ['leftShoulder', 'rightShoulder'],
    primaryJoint: 'leftShoulder',
  },
  lunge: {
    exerciseType: 'lunge',
    eccentricThresholds: {
      tooSlow: 20,
      slow: 50,
      optimal: { min: 80, max: 150 },
      fast: 200,
      tooFast: 300,
    },
    concentricThresholds: {
      tooSlow: 30,
      slow: 70,
      optimal: { min: 100, max: 200 },
      fast: 280,
      tooFast: 400,
    },
    trackedJoints: ['leftHip', 'rightHip', 'leftKnee', 'rightKnee'],
    primaryJoint: 'leftHip',
  },
  deadlift: {
    exerciseType: 'deadlift',
    eccentricThresholds: {
      tooSlow: 15,
      slow: 40,
      optimal: { min: 60, max: 120 },
      fast: 160,
      tooFast: 250,
    },
    concentricThresholds: {
      tooSlow: 25,
      slow: 60,
      optimal: { min: 90, max: 180 },
      fast: 240,
      tooFast: 350,
    },
    trackedJoints: ['leftHip', 'rightHip', 'leftShoulder', 'rightShoulder'],
    primaryJoint: 'leftHip',
  },
  plank: {
    exerciseType: 'plank',
    eccentricThresholds: {
      tooSlow: 5,
      slow: 10,
      optimal: { min: 0, max: 15 },
      fast: 25,
      tooFast: 50,
    },
    concentricThresholds: {
      tooSlow: 5,
      slow: 10,
      optimal: { min: 0, max: 15 },
      fast: 25,
      tooFast: 50,
    },
    trackedJoints: ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'],
    primaryJoint: 'leftShoulder',
  },
};

export class TempoFeedbackGenerator {
  private eccentricVelocities: number[] = [];
  private concentricVelocities: number[] = [];
  private eccentricStartTime: number = 0;
  private concentricStartTime: number = 0;
  private config: ExerciseVelocityConfig;
  private previousPhase: MovementPhase = 'isometric';

  constructor(exerciseType: string) {
    this.config =
      DEFAULT_VELOCITY_THRESHOLDS[exerciseType] ?? DEFAULT_VELOCITY_THRESHOLDS.squat;
  }

  /**
   * Get current exercise config
   */
  getConfig(): ExerciseVelocityConfig {
    return this.config;
  }

  /**
   * Classify velocity into category based on thresholds
   */
  classifyVelocity(velocity: number, phase: MovementPhase): VelocityCategory {
    const thresholds =
      phase === 'eccentric'
        ? this.config.eccentricThresholds
        : this.config.concentricThresholds;

    if (velocity < thresholds.tooSlow) return 'too_slow';
    if (velocity < thresholds.slow) return 'slow';
    if (velocity >= thresholds.optimal.min && velocity <= thresholds.optimal.max)
      return 'optimal';
    if (velocity < thresholds.fast) return 'fast';
    return 'too_fast';
  }

  /**
   * Generate feedback message based on velocity and phase
   */
  generateFeedback(
    velocity: number,
    category: VelocityCategory,
    phase: MovementPhase
  ): string {
    const feedbackMap: Record<VelocityCategory, Record<MovementPhase, string>> = {
      too_slow: {
        eccentric: '하강이 너무 느립니다. 근력 부족 신호일 수 있습니다.',
        concentric: '상승이 너무 느립니다. 힘을 더 주세요.',
        isometric: '좋은 자세 유지',
        transition: '',
      },
      slow: {
        eccentric: '천천히 내려가고 있습니다. 좋은 컨트롤입니다.',
        concentric: '조금 더 폭발적으로 올라오세요.',
        isometric: '좋은 자세 유지',
        transition: '',
      },
      optimal: {
        eccentric: '완벽한 하강 속도입니다!',
        concentric: '좋은 상승 속도입니다!',
        isometric: '좋은 자세 유지',
        transition: '',
      },
      fast: {
        eccentric: '조금 더 천천히 내려가세요.',
        concentric: '좋은 폭발력입니다.',
        isometric: '',
        transition: '',
      },
      too_fast: {
        eccentric: '너무 빠릅니다! 컨트롤을 잃을 수 있습니다.',
        concentric: '속도를 조금 줄이세요.',
        isometric: '',
        transition: '',
      },
    };

    return feedbackMap[category][phase] || '';
  }

  /**
   * Record velocity for tempo analysis
   */
  recordPhaseVelocity(velocity: number, phase: MovementPhase): void {
    // Detect phase transitions
    if (phase === 'eccentric' && this.previousPhase !== 'eccentric') {
      this.eccentricStartTime = performance.now();
    } else if (phase === 'concentric' && this.previousPhase !== 'concentric') {
      this.concentricStartTime = performance.now();
    }

    this.previousPhase = phase;

    if (phase === 'eccentric') {
      this.eccentricVelocities.push(velocity);
    } else if (phase === 'concentric') {
      this.concentricVelocities.push(velocity);
    }
  }

  /**
   * Analyze tempo after rep completion
   */
  analyzeRepTempo(): TempoAnalysis | null {
    if (this.eccentricVelocities.length === 0 || this.concentricVelocities.length === 0) {
      return null;
    }

    const avgEccentric =
      this.eccentricVelocities.reduce((a, b) => a + b, 0) /
      this.eccentricVelocities.length;
    const avgConcentric =
      this.concentricVelocities.reduce((a, b) => a + b, 0) /
      this.concentricVelocities.length;

    // Calculate tempo ratio (higher = slower eccentric relative to concentric)
    const tempoRatio = avgConcentric > 0 ? avgEccentric / avgConcentric : 0;

    // Calculate approximate durations based on sample counts (assuming ~30fps)
    const eccentricDuration = this.eccentricVelocities.length * 33;
    const concentricDuration = this.concentricVelocities.length * 33;

    // Ideal tempo ratio is around 2:1 (eccentric slower than concentric)
    // For most exercises, controlled eccentric = better muscle activation
    const isControlled = tempoRatio >= 1.5 && tempoRatio <= 3;

    let feedback: string;
    if (tempoRatio < 1) {
      feedback = '하강을 더 천천히 하세요 (이상적 비율: 2:1)';
    } else if (tempoRatio > 4) {
      feedback = '상승 속도가 너무 느립니다';
    } else if (isControlled) {
      feedback = '완벽한 템포입니다!';
    } else {
      feedback = '템포를 조절해보세요';
    }

    return {
      eccentricDuration,
      concentricDuration,
      tempoRatio,
      averageEccentricVelocity: avgEccentric,
      averageConcentricVelocity: avgConcentric,
      isControlled,
      feedback,
    };
  }

  /**
   * Check if we have enough data for tempo analysis
   */
  hasTempoData(): boolean {
    return this.eccentricVelocities.length > 0 && this.concentricVelocities.length > 0;
  }

  /**
   * Reset rep data for new rep
   */
  resetRep(): void {
    this.eccentricVelocities = [];
    this.concentricVelocities = [];
    this.eccentricStartTime = 0;
    this.concentricStartTime = 0;
    this.previousPhase = 'isometric';
  }
}
