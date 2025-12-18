/**
 * Joint Range of Motion (ROM) Analyzer
 * 관절 가동 범위 분석 모듈
 *
 * Tracks and analyzes joint ROM for knee, hip, and torso during exercises.
 * Provides mobility assessment context complementing existing angle tracking.
 */

import { JointAngleType, ExerciseType, AngleData } from '@/types/angleHistory';

// ============================================
// Type Definitions
// ============================================

/**
 * Mobility assessment categories based on physical therapy standards
 */
export type MobilityAssessment = 'normal' | 'limited' | 'hypermobile';

/**
 * ROM benchmark defining standard mobility ranges for a joint
 */
export interface ROMBenchmark {
  jointType: JointAngleType;
  jointName: string;           // Korean name (e.g., '무릎')
  jointNameEn: string;         // English name (e.g., 'Knee')
  normalRange: {
    min: number;               // Minimum normal ROM (degrees)
    max: number;               // Maximum normal ROM (degrees)
  };
  hypermobileThreshold: number; // Above this = hypermobile
  limitedThreshold: number;     // Below this = limited
}

/**
 * ROM feedback item compatible with existing FeedbackItem structure
 */
export interface ROMFeedbackItem {
  level: 'good' | 'warning' | 'error';  // Matches existing FeedbackLevel
  message: string;             // Korean message
  messageEn: string;           // English message
  assessment: MobilityAssessment;
  value: number;               // Achieved ROM
  benchmarkRange: { min: number; max: number };
}

/**
 * Individual joint ROM analysis result
 */
export interface JointROMResult {
  jointType: JointAngleType;
  side?: 'left' | 'right' | 'bilateral';  // For bilateral tracking
  minAngle: number;            // Minimum angle achieved in session
  maxAngle: number;            // Maximum angle achieved in session
  rangeAchieved: number;       // max - min (total ROM used)
  benchmark: ROMBenchmark;     // Reference benchmark
  assessment: MobilityAssessment;
  percentOfNormal: number;     // 0-100+ (can exceed 100 for hypermobile)
  feedback: ROMFeedbackItem;
}

/**
 * Recommendation for mobility improvement
 */
export interface ROMRecommendation {
  type: 'stretch' | 'strengthen' | 'maintain';
  jointType: JointAngleType;
  priority: 'high' | 'medium' | 'low';
  message: string;             // Korean
  messageEn: string;           // English
  exercises?: string[];        // Suggested exercises
}

/**
 * Complete session ROM summary
 */
export interface SessionROMSummary {
  exerciseType: ExerciseType;
  timestamp: number;
  duration: number;            // Session duration in seconds
  joints: JointROMResult[];    // All tracked joints
  overallMobility: MobilityAssessment;  // Aggregate assessment
  recommendations: ROMRecommendation[];
}

// ============================================
// ROM Benchmarks (Physical Therapy Standards)
// ============================================

/**
 * Standard ROM benchmarks based on physical therapy reference values
 */
export const ROM_BENCHMARKS: Record<string, ROMBenchmark> = {
  kneeFlexion: {
    jointType: 'kneeFlexion',
    jointName: '무릎 굴곡',
    jointNameEn: 'Knee Flexion',
    normalRange: { min: 0, max: 135 },
    hypermobileThreshold: 145,
    limitedThreshold: 120,
  },
  hipFlexion: {
    jointType: 'hipFlexion',
    jointName: '엉덩이 굴곡',
    jointNameEn: 'Hip Flexion',
    normalRange: { min: 0, max: 120 },
    hypermobileThreshold: 130,
    limitedThreshold: 100,
  },
  torsoAngle: {
    jointType: 'torsoAngle',
    jointName: '상체 굴곡',
    jointNameEn: 'Torso Flexion',
    normalRange: { min: 0, max: 80 },
    hypermobileThreshold: 90,
    limitedThreshold: 60,
  },
  ankleAngle: {
    jointType: 'ankleAngle',
    jointName: '발목 배굴',
    jointNameEn: 'Ankle Dorsiflexion',
    normalRange: { min: 0, max: 20 },
    hypermobileThreshold: 30,
    limitedThreshold: 10,
  },
} as const;

// ============================================
// Utility Functions for Exercise Recommendations
// ============================================

/**
 * Get stretch exercises for a given joint type
 */
function getStretchExercises(jointType: JointAngleType): string[] {
  switch (jointType) {
    case 'kneeFlexion':
      return ['쿼드 스트레칭', '햄스트링 스트레칭', '폼롤러 대퇴사두근'];
    case 'hipFlexion':
      return ['힙 플렉서 스트레칭', '90/90 스트레칭', '비둘기 자세'];
    case 'torsoAngle':
      return ['고양이-소 스트레칭', '흉추 회전 스트레칭', '어린이 자세'];
    case 'ankleAngle':
      return ['종아리 스트레칭', '발목 원 돌리기', '벽 발목 스트레칭'];
    default:
      return ['일반 스트레칭'];
  }
}

/**
 * Get strengthening exercises for a given joint type
 */
function getStrengthenExercises(jointType: JointAngleType): string[] {
  switch (jointType) {
    case 'kneeFlexion':
      return ['터미널 니 익스텐션', '스텝업', '레그 프레스'];
    case 'hipFlexion':
      return ['힙 힌지 운동', '글루트 브릿지', '데드버그'];
    case 'torsoAngle':
      return ['플랭크', '버드독', '데드리프트'];
    case 'ankleAngle':
      return ['카프 레이즈', '발목 저항 운동', '발가락 걷기'];
    default:
      return ['코어 강화 운동'];
  }
}

// ============================================
// Assessment Functions
// ============================================

/**
 * Assess mobility based on achieved range and benchmark
 *
 * @param achievedRange - The ROM achieved during the session
 * @param benchmark - The reference benchmark for comparison
 * @returns MobilityAssessment ('normal', 'limited', or 'hypermobile')
 */
export function assessMobility(
  achievedRange: number,
  benchmark: ROMBenchmark
): MobilityAssessment {
  if (achievedRange >= benchmark.hypermobileThreshold) {
    return 'hypermobile';
  }
  if (achievedRange < benchmark.limitedThreshold) {
    return 'limited';
  }
  return 'normal';
}

/**
 * Generate feedback item for a joint ROM result
 */
function generateFeedback(
  achievedRange: number,
  benchmark: ROMBenchmark,
  assessment: MobilityAssessment,
  percentOfNormal: number
): ROMFeedbackItem {
  let level: 'good' | 'warning' | 'error';
  let message: string;
  let messageEn: string;

  switch (assessment) {
    case 'normal':
      level = 'good';
      message = `${benchmark.jointName} 가동성이 정상 범위입니다 (${Math.round(percentOfNormal)}%)`;
      messageEn = `${benchmark.jointNameEn} mobility is within normal range (${Math.round(percentOfNormal)}%)`;
      break;
    case 'limited':
      level = percentOfNormal < 70 ? 'error' : 'warning';
      message = `${benchmark.jointName} 가동성이 제한적입니다 (${Math.round(percentOfNormal)}%)`;
      messageEn = `${benchmark.jointNameEn} mobility is limited (${Math.round(percentOfNormal)}%)`;
      break;
    case 'hypermobile':
      level = 'warning';
      message = `${benchmark.jointName} 과가동성이 있습니다 (${Math.round(percentOfNormal)}%)`;
      messageEn = `${benchmark.jointNameEn} shows hypermobility (${Math.round(percentOfNormal)}%)`;
      break;
  }

  return {
    level,
    message,
    messageEn,
    assessment,
    value: achievedRange,
    benchmarkRange: benchmark.normalRange,
  };
}

/**
 * Generate recommendations based on joint ROM results
 *
 * @param jointResults - Array of joint ROM results to analyze
 * @returns Array of recommendations sorted by priority
 */
export function generateRecommendations(
  jointResults: JointROMResult[]
): ROMRecommendation[] {
  const recommendations: ROMRecommendation[] = [];

  for (const result of jointResults) {
    if (result.assessment === 'limited') {
      recommendations.push({
        type: 'stretch',
        jointType: result.jointType,
        priority: result.percentOfNormal < 70 ? 'high' : 'medium',
        message: `${result.benchmark.jointName} 가동성이 제한적입니다. 스트레칭을 권장합니다.`,
        messageEn: `${result.benchmark.jointNameEn} mobility is limited. Stretching recommended.`,
        exercises: getStretchExercises(result.jointType),
      });
    } else if (result.assessment === 'hypermobile') {
      recommendations.push({
        type: 'strengthen',
        jointType: result.jointType,
        priority: 'medium',
        message: `${result.benchmark.jointName} 과가동성이 있습니다. 안정화 운동을 권장합니다.`,
        messageEn: `${result.benchmark.jointNameEn} shows hypermobility. Stabilization exercises recommended.`,
        exercises: getStrengthenExercises(result.jointType),
      });
    } else {
      recommendations.push({
        type: 'maintain',
        jointType: result.jointType,
        priority: 'low',
        message: `${result.benchmark.jointName} 가동성이 정상입니다. 현재 운동을 유지하세요.`,
        messageEn: `${result.benchmark.jointNameEn} mobility is normal. Maintain current exercises.`,
      });
    }
  }

  // Sort by priority (high first)
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return recommendations.sort((a, b) => {
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ============================================
// JointROMTracker Class
// ============================================

/**
 * Internal data structure for tracking joint samples
 */
interface JointSampleData {
  samples: number[];
  side?: 'left' | 'right';
}

/**
 * Main tracker class for joint ROM analysis during exercise sessions
 * Follows the pattern established by AngleHistoryTracker
 */
export class JointROMTracker {
  private exerciseType: ExerciseType;
  private startTime: number;
  private isTracking: boolean;
  private jointData: Map<string, JointSampleData>;
  private trackedJoints: JointAngleType[];
  private bilateralMode: boolean;

  constructor(
    exerciseType: ExerciseType,
    trackedJoints: JointAngleType[],
    bilateralMode: boolean = false
  ) {
    this.exerciseType = exerciseType;
    this.trackedJoints = trackedJoints;
    this.bilateralMode = bilateralMode;
    this.startTime = 0;
    this.isTracking = false;
    this.jointData = new Map();
  }

  /**
   * Start a new tracking session
   */
  startTracking(): void {
    this.startTime = Date.now();
    this.jointData.clear();
    this.isTracking = true;
  }

  /**
   * Record an angle sample during the session
   *
   * @param jointType - The type of joint being measured
   * @param angle - The angle value in degrees
   * @param side - Optional side for bilateral tracking ('left' or 'right')
   */
  recordAngle(jointType: JointAngleType, angle: number, side?: 'left' | 'right'): void {
    if (!this.isTracking) return;
    if (!isFinite(angle) || angle < 0 || angle > 360) return;
    if (!this.trackedJoints.includes(jointType)) return;

    const key = side ? `${jointType}_${side}` : jointType;

    let data = this.jointData.get(key);
    if (!data) {
      data = { samples: [], side };
      this.jointData.set(key, data);
    }
    data.samples.push(angle);
  }

  /**
   * Get the current session summary without stopping tracking
   *
   * @returns SessionROMSummary or null if not tracking
   */
  getSessionSummary(): SessionROMSummary | null {
    if (!this.isTracking || this.jointData.size === 0) {
      return null;
    }

    const currentTime = Date.now();
    const duration = Math.round((currentTime - this.startTime) / 1000);

    const jointResults = this.calculateJointResults();

    if (jointResults.length === 0) {
      return null;
    }

    const overallMobility = this.calculateOverallMobility(jointResults);
    const recommendations = generateRecommendations(jointResults);

    return {
      exerciseType: this.exerciseType,
      timestamp: this.startTime,
      duration,
      joints: jointResults,
      overallMobility,
      recommendations,
    };
  }

  /**
   * Stop tracking and return final summary
   *
   * @returns Final SessionROMSummary or null if no data
   */
  stopTracking(): SessionROMSummary | null {
    if (!this.isTracking) {
      return null;
    }

    const summary = this.getSessionSummary();
    this.isTracking = false;
    return summary;
  }

  /**
   * Get current stats for live UI display
   *
   * @returns Array of current stats per joint
   */
  getCurrentStats(): { jointType: JointAngleType; min: number; max: number; current: number; side?: 'left' | 'right' }[] {
    const stats: { jointType: JointAngleType; min: number; max: number; current: number; side?: 'left' | 'right' }[] = [];

    this.jointData.forEach((data, key) => {
      if (data.samples.length === 0) return;

      const jointType = key.includes('_')
        ? key.split('_')[0] as JointAngleType
        : key as JointAngleType;

      const min = Math.min(...data.samples);
      const max = Math.max(...data.samples);
      const current = data.samples[data.samples.length - 1];

      stats.push({
        jointType,
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
        current: Math.round(current * 10) / 10,
        side: data.side,
      });
    });

    return stats;
  }

  /**
   * Check if currently tracking
   */
  getIsTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Calculate joint results from accumulated samples
   */
  private calculateJointResults(): JointROMResult[] {
    const results: JointROMResult[] = [];

    this.jointData.forEach((data, key) => {
      if (data.samples.length === 0) return;

      const jointType = key.includes('_')
        ? key.split('_')[0] as JointAngleType
        : key as JointAngleType;

      const benchmarkKey = this.getBenchmarkKey(jointType);
      const benchmark = ROM_BENCHMARKS[benchmarkKey];

      if (!benchmark) return;

      const minAngle = Math.min(...data.samples);
      const maxAngle = Math.max(...data.samples);
      const rangeAchieved = maxAngle - minAngle;

      const assessment = assessMobility(rangeAchieved, benchmark);
      const percentOfNormal = (rangeAchieved / benchmark.normalRange.max) * 100;

      const feedback = generateFeedback(rangeAchieved, benchmark, assessment, percentOfNormal);

      results.push({
        jointType,
        side: data.side,
        minAngle: Math.round(minAngle * 10) / 10,
        maxAngle: Math.round(maxAngle * 10) / 10,
        rangeAchieved: Math.round(rangeAchieved * 10) / 10,
        benchmark,
        assessment,
        percentOfNormal: Math.round(percentOfNormal * 10) / 10,
        feedback,
      });
    });

    return results;
  }

  /**
   * Map joint type to benchmark key
   */
  private getBenchmarkKey(jointType: JointAngleType): string {
    // Direct mapping for most cases
    if (ROM_BENCHMARKS[jointType]) {
      return jointType;
    }

    // Alias mappings
    const aliasMap: Record<string, string> = {
      'torsoFlexion': 'torsoAngle',
    };

    return aliasMap[jointType] || jointType;
  }

  /**
   * Calculate overall mobility assessment from joint results
   */
  private calculateOverallMobility(jointResults: JointROMResult[]): MobilityAssessment {
    if (jointResults.length === 0) {
      return 'normal';
    }

    const limitedCount = jointResults.filter(r => r.assessment === 'limited').length;
    const hypermobileCount = jointResults.filter(r => r.assessment === 'hypermobile').length;

    // If majority are limited, overall is limited
    if (limitedCount > jointResults.length / 2) {
      return 'limited';
    }

    // If any hypermobile, note it
    if (hypermobileCount > 0) {
      return 'hypermobile';
    }

    return 'normal';
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a ROM tracker for squat exercises
 * Tracks knee, hip, and ankle flexion bilaterally
 */
export function createSquatROMTracker(): JointROMTracker {
  return new JointROMTracker(
    'squat',
    ['kneeFlexion', 'hipFlexion', 'ankleAngle'],
    true  // bilateral mode
  );
}

/**
 * Create a ROM tracker for lunge exercises
 * Tracks front leg knee and hip
 */
export function createLungeROMTracker(): JointROMTracker {
  return new JointROMTracker(
    'lunge',
    ['kneeFlexion', 'hipFlexion'],
    true  // bilateral mode
  );
}

/**
 * Create a ROM tracker for deadlift exercises
 * Tracks hip flexion and torso angle
 */
export function createDeadliftROMTracker(): JointROMTracker {
  return new JointROMTracker(
    'deadlift',
    ['hipFlexion', 'torsoAngle'],
    false  // single measurement
  );
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get ROM status with color and label information for UI display
 *
 * @param assessment - The mobility assessment
 * @returns Status object with level, color, and labels
 */
export function getROMStatus(
  assessment: MobilityAssessment
): { level: 'good' | 'warning' | 'error'; color: string; label: string; labelEn: string } {
  switch (assessment) {
    case 'normal':
      return { level: 'good', color: '#00F5A0', label: '정상', labelEn: 'Normal' };
    case 'limited':
      return { level: 'warning', color: '#FFB800', label: '제한적', labelEn: 'Limited' };
    case 'hypermobile':
      return { level: 'warning', color: '#8B5CF6', label: '과가동', labelEn: 'Hypermobile' };
  }
}

/**
 * Format ROM feedback for display
 *
 * @param result - The joint ROM result to format
 * @param language - Language preference ('ko' or 'en')
 * @returns Formatted feedback string
 */
export function formatROMFeedback(
  result: JointROMResult,
  language: 'ko' | 'en' = 'ko'
): string {
  const { benchmark, assessment, rangeAchieved, percentOfNormal } = result;
  const jointName = language === 'ko' ? benchmark.jointName : benchmark.jointNameEn;

  switch (assessment) {
    case 'normal':
      return language === 'ko'
        ? `${jointName}: ${rangeAchieved}° (정상 범위, ${Math.round(percentOfNormal)}%)`
        : `${jointName}: ${rangeAchieved}° (Normal range, ${Math.round(percentOfNormal)}%)`;
    case 'limited':
      return language === 'ko'
        ? `${jointName}: ${rangeAchieved}° (제한적, ${Math.round(percentOfNormal)}%)`
        : `${jointName}: ${rangeAchieved}° (Limited, ${Math.round(percentOfNormal)}%)`;
    case 'hypermobile':
      return language === 'ko'
        ? `${jointName}: ${rangeAchieved}° (과가동, ${Math.round(percentOfNormal)}%)`
        : `${jointName}: ${rangeAchieved}° (Hypermobile, ${Math.round(percentOfNormal)}%)`;
  }
}

/**
 * Compare current session ROM to a baseline session
 *
 * @param current - Current session summary
 * @param baseline - Baseline session summary to compare against
 * @returns Array of comparisons showing change for each joint
 */
export function compareROMToBaseline(
  current: SessionROMSummary,
  baseline: SessionROMSummary
): { jointType: JointAngleType; change: number; improved: boolean }[] {
  const comparison: { jointType: JointAngleType; change: number; improved: boolean }[] = [];

  for (const currentJoint of current.joints) {
    const baselineJoint = baseline.joints.find(
      j => j.jointType === currentJoint.jointType && j.side === currentJoint.side
    );

    if (baselineJoint) {
      const change = currentJoint.rangeAchieved - baselineJoint.rangeAchieved;
      comparison.push({
        jointType: currentJoint.jointType,
        change: Math.round(change * 10) / 10,
        improved: change > 0,
      });
    }
  }

  return comparison;
}

/**
 * Convert ROM summary to AngleData format for storage compatibility
 *
 * @param summary - Session ROM summary to convert
 * @returns Array of partial AngleData objects
 */
export function romSummaryToAngleData(summary: SessionROMSummary): Partial<AngleData>[] {
  return summary.joints.map(joint => ({
    jointType: joint.jointType,
    min: joint.minAngle,
    max: joint.maxAngle,
  }));
}
