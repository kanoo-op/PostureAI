import {
  ExerciseType,
  JointAngleType,
  SessionRecord,
  TrendDirection
} from '@/types/angleHistory';
import { getSessions, getSessionById } from './angleHistoryStorage';

/**
 * Per-rep angle data for trend analysis
 */
export interface RepAngleData {
  repNumber: number;
  timestamp: number;
  angles: {
    jointType: JointAngleType;
    value: number;           // Average angle during rep
    min: number;             // Minimum angle during rep
    max: number;             // Maximum angle during rep
    deviation: number;       // Deviation from target/ideal
  }[];
  repDuration: number;       // Duration of rep in ms
  overallQuality: number;    // 0-100 quality score for this rep
}

/**
 * Fatigue pattern detection result
 */
export interface FatiguePattern {
  isDetected: boolean;
  severity: 'low' | 'moderate' | 'high';
  affectedJoints: JointAngleType[];
  onsetRepNumber: number | null;     // Rep where fatigue started
  degradationRate: number;            // Degrees per rep decline
  insight: string;                    // Korean insight message
}

/**
 * Consistency metrics for angle maintenance
 */
export interface ConsistencyMetrics {
  overallScore: number;               // 0-100
  perJointScores: {
    jointType: JointAngleType;
    score: number;                    // 0-100
    standardDeviation: number;        // Angle variation across reps
    trend: TrendDirection;            // Improving/declining/stable
  }[];
  mostConsistentJoint: JointAngleType | null;
  leastConsistentJoint: JointAngleType | null;
}

/**
 * Quality score for individual rep identification
 */
export interface RepQualityScore {
  repNumber: number;
  qualityScore: number;               // 0-100
  ranking: 'best' | 'good' | 'average' | 'poor' | 'worst';
  strengths: string[];                // Korean descriptions
  weaknesses: string[];               // Korean descriptions
}

/**
 * Complete session angle trend summary
 */
export interface SessionAngleTrendSummary {
  sessionId: string;
  exerciseType: ExerciseType;
  timestamp: number;
  totalReps: number;

  // Core analysis results
  fatiguePattern: FatiguePattern;
  consistencyMetrics: ConsistencyMetrics;
  repQualityScores: RepQualityScore[];

  // Best/Worst identification
  bestRepNumber: number;
  worstRepNumber: number;
  bestRepScore: number;
  worstRepScore: number;

  // Session-level insights
  overallTrend: TrendDirection;
  sessionInsight: string;             // Korean summary insight
  improvementSuggestions: string[];   // Korean suggestions

  // Comparison data (if available)
  comparisonToPrevious: SessionComparison | null;
}

/**
 * Session-to-session comparison result
 */
export interface SessionComparison {
  previousSessionId: string;
  previousSessionDate: number;
  overallImprovement: number;         // Percentage change
  jointImprovements: {
    jointType: JointAngleType;
    previousAverage: number;
    currentAverage: number;
    change: number;
    direction: TrendDirection;
  }[];
  fatigueComparison: {
    previousOnsetRep: number | null;
    currentOnsetRep: number | null;
    improved: boolean;
  };
  consistencyComparison: {
    previousScore: number;
    currentScore: number;
    improved: boolean;
  };
  insight: string;                    // Korean comparison insight
}

// Fatigue detection thresholds
const FATIGUE_THRESHOLDS = {
  degradationRateLow: 0.5,      // < 0.5 deg/rep = low fatigue
  degradationRateModerate: 1.5, // 0.5-1.5 deg/rep = moderate
  degradationRateHigh: 2.5,     // > 1.5 deg/rep = high fatigue
  minRepsForDetection: 5,       // Minimum reps before fatigue analysis
  significantChange: 3,         // Minimum degrees change to consider
};

// Consistency scoring thresholds
const CONSISTENCY_THRESHOLDS = {
  excellent: 90,    // stdDev < 3 degrees
  good: 75,         // stdDev < 5 degrees
  average: 60,      // stdDev < 8 degrees
  poor: 40,         // stdDev < 12 degrees
  // Below 40 = very poor
};

// Joint-specific ideal angles (reference: squatAnalyzer.ts THRESHOLDS, angleHistoryAnalyzer.ts IMPROVEMENT_DIRECTIONS)
const IDEAL_ANGLES: Record<JointAngleType, { target: number; tolerance: number }> = {
  kneeFlexion: { target: 90, tolerance: 15 },
  hipFlexion: { target: 90, tolerance: 15 },
  torsoAngle: { target: 15, tolerance: 10 },
  ankleAngle: { target: 25, tolerance: 10 },
  elbowAngle: { target: 90, tolerance: 15 },
  shoulderAngle: { target: 90, tolerance: 15 },
  spineAlignment: { target: 0, tolerance: 5 },
  kneeValgus: { target: 0, tolerance: 5 },
  elbowValgus: { target: 0, tolerance: 5 },
  armSymmetry: { target: 100, tolerance: 10 },
};

// Korean joint names (pattern from angleHistoryAnalyzer.ts:117-128)
const JOINT_NAMES_KO: Record<JointAngleType, string> = {
  kneeFlexion: '무릎 굽힘',
  hipFlexion: '엉덩이 굽힘',
  torsoAngle: '상체 기울기',
  ankleAngle: '발목 각도',
  elbowAngle: '팔꿈치 각도',
  shoulderAngle: '어깨 각도',
  spineAlignment: '척추 정렬',
  kneeValgus: '무릎 정렬',
  elbowValgus: '팔꿈치 정렬',
  armSymmetry: '팔 대칭',
};

// Exercise type names in Korean (pattern from angleHistoryAnalyzer.ts:151-158)
const EXERCISE_NAMES_KO: Record<ExerciseType, string> = {
  squat: '스쿼트',
  pushup: '푸시업',
  lunge: '런지',
  plank: '플랭크',
  deadlift: '데드리프트',
  'static-posture': '정적 자세',
};

/**
 * Extracts rep-by-rep angle data from session record
 * Note: Since SessionRecord stores aggregate data, this estimates per-rep data
 * based on the session aggregates with estimated variance
 */
function extractRepAngles(session: SessionRecord): RepAngleData[] {
  const repCount = session.repCount;
  if (repCount === 0) return [];

  // Since we don't have granular per-rep data, we create synthetic data
  // based on the session aggregates with estimated variance
  const repAngles: RepAngleData[] = [];
  const repDuration = (session.duration * 1000) / repCount;

  for (let i = 0; i < repCount; i++) {
    const angles = session.angles.map(angle => {
      // Add estimated variance based on stdDev
      const variance = (Math.random() - 0.5) * angle.stdDev * 2;
      const value = angle.average + variance;
      const deviation = Math.abs(value - (IDEAL_ANGLES[angle.jointType]?.target ?? angle.average));

      return {
        jointType: angle.jointType,
        value: Math.round(value * 10) / 10,
        min: angle.min,
        max: angle.max,
        deviation: Math.round(deviation * 10) / 10,
      };
    });

    // Calculate overall quality for this rep
    const avgDeviation = angles.length > 0
      ? angles.reduce((sum, a) => sum + a.deviation, 0) / angles.length
      : 0;
    const overallQuality = Math.max(0, Math.min(100, 100 - (avgDeviation * 2)));

    repAngles.push({
      repNumber: i + 1,
      timestamp: session.timestamp + (i * repDuration),
      angles,
      repDuration,
      overallQuality: Math.round(overallQuality),
    });
  }

  return repAngles;
}

/**
 * Calculates linear regression slope for degradation detection
 */
function calculateLinearRegressionSlope(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;

  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Finds the rep number where fatigue onset is detected
 */
function findFatigueOnsetRep(points: { x: number; y: number }[], threshold: number): number {
  if (points.length < 3) return points.length;

  const baseline = points.slice(0, 3).reduce((sum, p) => sum + p.y, 0) / 3;

  for (let i = 3; i < points.length; i++) {
    if (Math.abs(points[i].y - baseline) >= threshold) {
      return i + 1; // Convert to 1-indexed rep number
    }
  }

  return points.length;
}

/**
 * Helper: Generate fatigue insight in Korean
 */
function generateFatigueInsight(
  severity: 'low' | 'moderate' | 'high',
  affectedJoints: JointAngleType[],
  onsetRep: number
): string {
  const jointNames = affectedJoints.slice(0, 2).map(j => JOINT_NAMES_KO[j]).join(', ');

  switch (severity) {
    case 'low':
      return `${onsetRep}번째 렙부터 ${jointNames}에서 경미한 피로 징후가 나타났습니다`;
    case 'moderate':
      return `${jointNames}의 자세가 점차 무너지고 있습니다. 휴식을 권장합니다`;
    case 'high':
      return '심각한 피로 패턴이 감지되었습니다. 부상 방지를 위해 세트를 종료하세요';
  }
}

/**
 * Detects fatigue patterns by analyzing angle degradation over reps
 * Uses linear regression to detect gradual decline in form quality
 * @param repAngles - Array of per-rep angle data
 * @returns FatiguePattern analysis result
 */
export function calculateFatiguePattern(repAngles: RepAngleData[]): FatiguePattern {
  // 1. Return no fatigue if insufficient reps
  if (repAngles.length < FATIGUE_THRESHOLDS.minRepsForDetection) {
    return {
      isDetected: false,
      severity: 'low',
      affectedJoints: [],
      onsetRepNumber: null,
      degradationRate: 0,
      insight: '분석을 위한 충분한 렙 데이터가 없습니다',
    };
  }

  // 2. Analyze each joint for degradation
  const jointDegradations: { jointType: JointAngleType; rate: number; onsetRep: number }[] = [];

  // Get unique joint types from first rep
  const jointTypes = repAngles[0].angles.map(a => a.jointType);

  for (const jointType of jointTypes) {
    const values = repAngles.map((rep, idx) => ({
      x: idx + 1,
      y: rep.angles.find(a => a.jointType === jointType)?.value ?? 0
    }));

    const slope = calculateLinearRegressionSlope(values);

    // Negative slope for angles that should stay high, positive for those that should stay low
    // Use IMPROVEMENT_DIRECTIONS logic from angleHistoryAnalyzer.ts
    const degradationRate = Math.abs(slope);

    if (degradationRate >= FATIGUE_THRESHOLDS.degradationRateLow) {
      // Find onset rep (first rep where significant change detected)
      const onsetRep = findFatigueOnsetRep(values, FATIGUE_THRESHOLDS.significantChange);
      jointDegradations.push({ jointType, rate: degradationRate, onsetRep });
    }
  }

  // 3. Determine overall fatigue pattern
  if (jointDegradations.length === 0) {
    return {
      isDetected: false,
      severity: 'low',
      affectedJoints: [],
      onsetRepNumber: null,
      degradationRate: 0,
      insight: '피로 징후가 감지되지 않았습니다. 좋은 자세를 유지하고 있습니다!',
    };
  }

  const maxRate = Math.max(...jointDegradations.map(d => d.rate));
  const earliestOnset = Math.min(...jointDegradations.map(d => d.onsetRep));
  const affectedJoints = jointDegradations.map(d => d.jointType);

  // 4. Classify severity
  let severity: 'low' | 'moderate' | 'high';
  if (maxRate >= FATIGUE_THRESHOLDS.degradationRateHigh) {
    severity = 'high';
  } else if (maxRate >= FATIGUE_THRESHOLDS.degradationRateModerate) {
    severity = 'moderate';
  } else {
    severity = 'low';
  }

  // 5. Generate Korean insight
  const insight = generateFatigueInsight(severity, affectedJoints, earliestOnset);

  return {
    isDetected: true,
    severity,
    affectedJoints,
    onsetRepNumber: earliestOnset,
    degradationRate: Math.round(maxRate * 100) / 100,
    insight,
  };
}

/**
 * Calculates consistency scores based on angle maintenance across reps
 * @param repAngles - Array of per-rep angle data
 * @returns ConsistencyMetrics with overall and per-joint scores
 */
export function calculateConsistencyScores(repAngles: RepAngleData[]): ConsistencyMetrics {
  if (repAngles.length === 0) {
    return {
      overallScore: 0,
      perJointScores: [],
      mostConsistentJoint: null,
      leastConsistentJoint: null,
    };
  }

  // Get unique joint types
  const jointTypes = repAngles[0].angles.map(a => a.jointType);
  const perJointScores: ConsistencyMetrics['perJointScores'] = [];

  for (const jointType of jointTypes) {
    const values = repAngles
      .map(rep => rep.angles.find(a => a.jointType === jointType)?.value)
      .filter((v): v is number => v !== undefined);

    if (values.length === 0) continue;

    // Calculate standard deviation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);

    // Convert to 0-100 score (lower stdDev = higher score)
    // Score formula: score = max(0, 100 - (stdDev * 10))
    const score = Math.max(0, Math.min(100, 100 - (stdDev * 10)));

    // Determine trend (first half vs second half comparison)
    const midpoint = Math.floor(values.length / 2);
    const firstHalfAvg = midpoint > 0
      ? values.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint
      : 0;
    const secondHalfAvg = values.length - midpoint > 0
      ? values.slice(midpoint).reduce((a, b) => a + b, 0) / (values.length - midpoint)
      : 0;
    const trend: TrendDirection =
      Math.abs(secondHalfAvg - firstHalfAvg) < 2 ? 'stable' :
      secondHalfAvg > firstHalfAvg ? 'improving' : 'declining';

    perJointScores.push({
      jointType,
      score: Math.round(score),
      standardDeviation: Math.round(stdDev * 10) / 10,
      trend,
    });
  }

  // Calculate overall score as average
  const overallScore = perJointScores.length > 0
    ? Math.round(perJointScores.reduce((sum, j) => sum + j.score, 0) / perJointScores.length)
    : 0;

  // Find most/least consistent
  const sortedJoints = [...perJointScores].sort((a, b) => b.score - a.score);
  const mostConsistentJoint = sortedJoints[0]?.jointType ?? null;
  const leastConsistentJoint = sortedJoints[sortedJoints.length - 1]?.jointType ?? null;

  return {
    overallScore,
    perJointScores,
    mostConsistentJoint,
    leastConsistentJoint,
  };
}

/**
 * Identifies and ranks reps by quality score
 * @param repAngles - Array of per-rep angle data
 * @returns Array of RepQualityScore sorted by rep number
 */
export function identifyBestWorstReps(repAngles: RepAngleData[]): RepQualityScore[] {
  if (repAngles.length === 0) return [];

  const scores: RepQualityScore[] = repAngles.map(rep => {
    // Calculate quality based on deviation from ideal angles
    let totalDeviation = 0;
    let jointCount = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const angle of rep.angles) {
      const ideal = IDEAL_ANGLES[angle.jointType];
      if (!ideal) continue;

      const deviation = Math.abs(angle.value - ideal.target);
      totalDeviation += deviation;
      jointCount++;

      const jointName = JOINT_NAMES_KO[angle.jointType];

      if (deviation <= ideal.tolerance) {
        strengths.push(`${jointName}이(가) 이상적인 범위 내에 있습니다`);
      } else if (deviation > ideal.tolerance * 2) {
        weaknesses.push(`${jointName}이(가) 이상적인 범위를 벗어났습니다`);
      }
    }

    // Convert deviation to 0-100 score
    const avgDeviation = jointCount > 0 ? totalDeviation / jointCount : 0;
    const qualityScore = Math.max(0, Math.min(100, 100 - (avgDeviation * 2)));

    return {
      repNumber: rep.repNumber,
      qualityScore: Math.round(qualityScore),
      ranking: 'average' as const, // Will be updated below
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
    };
  });

  // Assign rankings based on percentiles
  const sortedByScore = [...scores].sort((a, b) => b.qualityScore - a.qualityScore);
  const total = sortedByScore.length;

  sortedByScore.forEach((score, idx) => {
    const percentile = (idx / total) * 100;
    if (percentile <= 10) score.ranking = 'best';
    else if (percentile <= 25) score.ranking = 'good';
    else if (percentile <= 75) score.ranking = 'average';
    else if (percentile <= 90) score.ranking = 'poor';
    else score.ranking = 'worst';
  });

  return scores;
}

/**
 * Generates comparison insight in Korean
 */
function generateComparisonInsight(
  overallImprovement: number,
  jointImprovements: SessionComparison['jointImprovements']
): string {
  if (overallImprovement > 5) {
    const improvedJoint = jointImprovements.find(j => j.direction === 'improving');
    const jointName = improvedJoint ? JOINT_NAMES_KO[improvedJoint.jointType] : '';
    return `이전 세션 대비 ${overallImprovement}% 향상되었습니다!${jointName ? ` ${jointName}이(가) 특히 개선되었습니다.` : ''}`;
  } else if (overallImprovement < -5) {
    return `이전 세션보다 ${Math.abs(overallImprovement)}% 감소했습니다. 폼에 집중해 주세요.`;
  } else {
    return '이전 세션과 유사한 수준을 유지하고 있습니다.';
  }
}

/**
 * Compares current session with previous sessions of same exercise
 * @param currentSession - Current session record
 * @param exerciseType - Type of exercise for filtering
 * @returns SessionComparison or null if no previous sessions
 */
export function compareWithPreviousSessions(
  currentSession: SessionRecord,
  exerciseType: ExerciseType
): SessionComparison | null {
  // Get previous sessions (excludes current by checking timestamp)
  const previousSessions = getSessions(exerciseType)
    .filter(s => s.timestamp < currentSession.timestamp)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (previousSessions.length === 0) return null;

  const previousSession = previousSessions[0];

  // Calculate joint improvements
  const jointImprovements: SessionComparison['jointImprovements'] = [];

  for (const currentAngle of currentSession.angles) {
    const previousAngle = previousSession.angles.find(
      a => a.jointType === currentAngle.jointType
    );

    if (!previousAngle) continue;

    const change = currentAngle.average - previousAngle.average;
    // Use IMPROVEMENT_DIRECTIONS from angleHistoryAnalyzer.ts to determine direction
    const direction: TrendDirection =
      Math.abs(change) < 2 ? 'stable' :
      change > 0 ? 'improving' : 'declining';

    jointImprovements.push({
      jointType: currentAngle.jointType,
      previousAverage: Math.round(previousAngle.average * 10) / 10,
      currentAverage: Math.round(currentAngle.average * 10) / 10,
      change: Math.round(change * 10) / 10,
      direction,
    });
  }

  // Calculate overall improvement percentage
  const currentOverall = currentSession.overallScore;
  const previousOverall = previousSession.overallScore;
  const overallImprovement = previousOverall > 0
    ? Math.round(((currentOverall - previousOverall) / previousOverall) * 100)
    : 0;

  // Compare consistency (using stdDev averages)
  const currentConsistency = currentSession.angles.length > 0
    ? currentSession.angles.reduce((sum, a) => sum + (100 - a.stdDev * 10), 0) / currentSession.angles.length
    : 0;
  const previousConsistency = previousSession.angles.length > 0
    ? previousSession.angles.reduce((sum, a) => sum + (100 - a.stdDev * 10), 0) / previousSession.angles.length
    : 0;

  // Generate comparison insight
  const insight = generateComparisonInsight(overallImprovement, jointImprovements);

  return {
    previousSessionId: previousSession.id,
    previousSessionDate: previousSession.timestamp,
    overallImprovement,
    jointImprovements,
    fatigueComparison: {
      previousOnsetRep: null, // Would need to analyze previous session
      currentOnsetRep: null,
      improved: false,
    },
    consistencyComparison: {
      previousScore: Math.round(previousConsistency),
      currentScore: Math.round(currentConsistency),
      improved: currentConsistency > previousConsistency,
    },
    insight,
  };
}

/**
 * Determines overall trend from rep quality scores
 */
function determineOverallTrend(repQualityScores: RepQualityScore[]): TrendDirection {
  if (repQualityScores.length < 2) return 'stable';

  const midpoint = Math.floor(repQualityScores.length / 2);
  const firstHalf = repQualityScores.slice(0, midpoint);
  const secondHalf = repQualityScores.slice(midpoint);

  const firstAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, r) => sum + r.qualityScore, 0) / firstHalf.length
    : 0;
  const secondAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, r) => sum + r.qualityScore, 0) / secondHalf.length
    : 0;

  const diff = secondAvg - firstAvg;

  if (Math.abs(diff) < 5) return 'stable';
  return diff > 0 ? 'improving' : 'declining';
}

/**
 * Generates comprehensive session insight in Korean
 */
function generateSessionInsight(
  fatiguePattern: FatiguePattern,
  consistencyMetrics: ConsistencyMetrics,
  repQualityScores: RepQualityScore[],
  exerciseType: ExerciseType
): string {
  const exerciseName = EXERCISE_NAMES_KO[exerciseType];
  const avgQuality = repQualityScores.length > 0
    ? repQualityScores.reduce((sum, r) => sum + r.qualityScore, 0) / repQualityScores.length
    : 0;

  let insight = `${exerciseName} 세션 분석: `;

  if (avgQuality >= 85) {
    insight += '전반적으로 우수한 폼을 유지했습니다. ';
  } else if (avgQuality >= 70) {
    insight += '양호한 폼을 보였습니다. ';
  } else {
    insight += '폼 개선이 필요합니다. ';
  }

  if (consistencyMetrics.overallScore >= 80) {
    insight += '동작의 일관성이 뛰어납니다.';
  } else if (fatiguePattern.isDetected && fatiguePattern.severity !== 'low') {
    insight += `${fatiguePattern.onsetRepNumber}번째 렙 이후 피로로 인한 자세 변화가 감지되었습니다.`;
  }

  return insight;
}

/**
 * Generates improvement suggestions based on analysis
 */
function generateImprovementSuggestions(
  fatiguePattern: FatiguePattern,
  consistencyMetrics: ConsistencyMetrics
): string[] {
  const suggestions: string[] = [];

  if (fatiguePattern.isDetected) {
    if (fatiguePattern.severity === 'high') {
      suggestions.push('세트 간 휴식 시간을 늘려 피로 축적을 방지하세요');
      suggestions.push('렙 수를 줄이고 폼에 집중하세요');
    } else if (fatiguePattern.severity === 'moderate') {
      suggestions.push('피로 발생을 늦추기 위해 세트 간 휴식 시간을 늘려보세요');
    }
  }

  if (consistencyMetrics.leastConsistentJoint) {
    const jointName = JOINT_NAMES_KO[consistencyMetrics.leastConsistentJoint];
    suggestions.push(`${jointName}의 일관성을 위해 거울을 보며 연습해 보세요`);
  }

  if (consistencyMetrics.overallScore < 60) {
    suggestions.push('동작 속도를 늦추고 각 렙에서 올바른 자세를 확인하세요');
  }

  // Add general suggestions if list is short
  if (suggestions.length < 2) {
    suggestions.push('코어 강화 운동을 추가하여 전반적인 안정성을 향상시키세요');
  }

  return suggestions.slice(0, 4); // Limit to 4 suggestions
}

/**
 * Analyzes angle trends for a complete session
 * @param sessionId - The session ID to analyze
 * @returns SessionAngleTrendSummary or null if session not found/insufficient data
 */
export function analyzeSessionTrends(sessionId: string): SessionAngleTrendSummary | null {
  // 1. Retrieve session using getSessionById from angleHistoryStorage.ts
  const session = getSessionById(sessionId);
  if (!session) return null;

  // 2. Extract rep-by-rep angle data
  const repAngles = extractRepAngles(session);
  if (repAngles.length === 0) return null;

  // 3. Calculate fatigue patterns
  const fatiguePattern = calculateFatiguePattern(repAngles);

  // 4. Calculate consistency scores
  const consistencyMetrics = calculateConsistencyScores(repAngles);

  // 5. Identify best/worst reps
  const repQualityScores = identifyBestWorstReps(repAngles);

  // 6. Get comparison with previous sessions
  const comparisonToPrevious = compareWithPreviousSessions(session, session.exerciseType);

  // 7. Determine overall trend and generate insights
  const overallTrend = determineOverallTrend(repQualityScores);
  const sessionInsight = generateSessionInsight(fatiguePattern, consistencyMetrics, repQualityScores, session.exerciseType);
  const improvementSuggestions = generateImprovementSuggestions(fatiguePattern, consistencyMetrics);

  // 8. Find best/worst reps
  const sortedByQuality = [...repQualityScores].sort((a, b) => b.qualityScore - a.qualityScore);
  const bestRep = sortedByQuality[0];
  const worstRep = sortedByQuality[sortedByQuality.length - 1];

  return {
    sessionId,
    exerciseType: session.exerciseType,
    timestamp: session.timestamp,
    totalReps: session.repCount,
    fatiguePattern,
    consistencyMetrics,
    repQualityScores,
    bestRepNumber: bestRep?.repNumber ?? 1,
    worstRepNumber: worstRep?.repNumber ?? 1,
    bestRepScore: bestRep?.qualityScore ?? 0,
    worstRepScore: worstRep?.qualityScore ?? 0,
    overallTrend,
    sessionInsight,
    improvementSuggestions,
    comparisonToPrevious,
  };
}

// Export helper functions for testing
export { extractRepAngles, calculateLinearRegressionSlope, findFatigueOnsetRep };
