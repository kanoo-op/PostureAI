import {
  ExerciseType,
  JointAngleType,
  SessionRecord,
  TrendAnalysis,
  JointTrendAnalysis,
  TrendDirection
} from '@/types/angleHistory';
import { getSessions } from './angleHistoryStorage';

// Minimum sessions required for meaningful analysis
const MIN_SESSIONS_FOR_TREND = 3;

// Thresholds for statistical significance
const SIGNIFICANT_CHANGE_DEGREES = 3; // 3 degrees is noticeable
const SIGNIFICANT_CHANGE_PERCENT = 5; // 5% change

// Joint-specific improvement directions (higher = better or lower = better)
const IMPROVEMENT_DIRECTIONS: Record<JointAngleType, 'higher' | 'lower' | 'closer_to_target'> = {
  kneeFlexion: 'lower',      // Deeper squat = lower knee angle at bottom
  hipFlexion: 'lower',       // Better hip hinge = lower angle
  torsoAngle: 'lower',       // More upright = closer to 0
  ankleAngle: 'higher',      // Better mobility = more dorsiflexion
  elbowAngle: 'lower',       // Deeper pushup = lower elbow angle
  shoulderAngle: 'closer_to_target',
  spineAlignment: 'lower',   // Straighter spine = closer to 0
  kneeValgus: 'lower',       // Less valgus = better
  elbowValgus: 'lower',      // Less elbow flare = better
  armSymmetry: 'higher',     // Higher symmetry score = better
};

// Target angles for "closer_to_target" joints
const TARGET_ANGLES: Partial<Record<JointAngleType, number>> = {
  shoulderAngle: 90
};

// Helper: Extract average angles for a joint from sessions
function extractJointAverages(
  jointType: JointAngleType,
  sessions: SessionRecord[]
): number[] {
  const averages: number[] = [];
  for (const session of sessions) {
    const angleData = session.angles.find(a => a.jointType === jointType);
    if (angleData) {
      averages.push(angleData.average);
    }
  }
  return averages;
}

// Helper: Get unique joint types from sessions
function getUniqueJointTypes(sessions: SessionRecord[]): JointAngleType[] {
  const types = new Set<JointAngleType>();
  for (const session of sessions) {
    for (const angle of session.angles) {
      types.add(angle.jointType);
    }
  }
  return Array.from(types);
}

// Helper: Calculate simple average
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Helper: Determine trend direction
function determineDirection(
  jointType: JointAngleType,
  changeAmount: number,
  currentValue: number,
  isSignificant: boolean
): TrendDirection {
  if (!isSignificant) return 'stable';

  const improvementDir = IMPROVEMENT_DIRECTIONS[jointType] || 'lower';

  if (improvementDir === 'higher') {
    return changeAmount > 0 ? 'improving' : 'declining';
  } else if (improvementDir === 'lower') {
    return changeAmount < 0 ? 'improving' : 'declining';
  } else {
    // closer_to_target
    const target = TARGET_ANGLES[jointType] || 90;
    const prevDistance = Math.abs((currentValue - changeAmount) - target);
    const currDistance = Math.abs(currentValue - target);
    return currDistance < prevDistance ? 'improving' : 'declining';
  }
}

// Helper: Calculate overall trend from joint trends
function calculateOverallTrend(jointTrends: JointTrendAnalysis[]): TrendDirection {
  if (jointTrends.length === 0) return 'stable';

  let improvingCount = 0;
  let decliningCount = 0;

  for (const trend of jointTrends) {
    if (trend.direction === 'improving') improvingCount++;
    else if (trend.direction === 'declining') decliningCount++;
  }

  if (improvingCount > decliningCount) return 'improving';
  if (decliningCount > improvingCount) return 'declining';
  return 'stable';
}

// Helper: Generate insight string for a joint
function generateJointInsight(
  jointType: JointAngleType,
  changeAmount: number,
  direction: TrendDirection,
  isSignificant: boolean
): string {
  const jointNames: Record<JointAngleType, string> = {
    kneeFlexion: '무릎 굽힘',
    hipFlexion: '엉덩이 굽힘',
    torsoAngle: '상체 기울기',
    ankleAngle: '발목 가동성',
    elbowAngle: '팔꿈치 각도',
    shoulderAngle: '어깨 각도',
    spineAlignment: '척추 정렬',
    kneeValgus: '무릎 정렬',
    elbowValgus: '팔꿈치 정렬',
    armSymmetry: '팔 대칭',
  };

  const jointName = jointNames[jointType] || jointType;
  const absChange = Math.abs(Math.round(changeAmount * 10) / 10);

  if (!isSignificant) {
    return `${jointName}이(가) 안정적으로 유지되고 있습니다`;
  }

  if (direction === 'improving') {
    return `${jointName}이(가) ${absChange}° 개선되었습니다`;
  } else {
    return `${jointName}이(가) ${absChange}° 후퇴했습니다. 주의가 필요합니다`;
  }
}

// Helper: Generate summary insight
function generateSummaryInsight(
  exerciseType: ExerciseType,
  jointTrends: JointTrendAnalysis[],
  overallTrend: TrendDirection,
  periodDays: number
): string {
  const exerciseNames: Record<ExerciseType, string> = {
    squat: '스쿼트',
    pushup: '푸시업',
    lunge: '런지',
    plank: '플랭크',
    deadlift: '데드리프트',
    'static-posture': '정적 자세'
  };

  const exerciseName = exerciseNames[exerciseType] || exerciseType;
  const periodText = periodDays === 7 ? '지난 1주일' : `지난 ${periodDays}일`;

  // Find the most significant improving joint
  const improvingJoints = jointTrends
    .filter(t => t.direction === 'improving' && t.isStatisticallySignificant)
    .sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount));

  if (overallTrend === 'improving' && improvingJoints.length > 0) {
    const best = improvingJoints[0];
    const jointNames: Record<string, string> = {
      kneeFlexion: '스쿼트 깊이',
      hipFlexion: '힙 힌지',
      torsoAngle: '상체 자세',
      ankleAngle: '발목 가동성',
      elbowAngle: '푸시업 깊이'
    };
    const metric = jointNames[best.jointType] || best.jointType;
    const change = Math.abs(Math.round(best.changeAmount * 10) / 10);
    return `${exerciseName} ${metric}가 ${periodText} 동안 ${change}° 향상되었습니다!`;
  }

  if (overallTrend === 'declining') {
    return `${exerciseName} 자세가 ${periodText} 동안 약간 후퇴했습니다. 폼에 집중해 주세요.`;
  }

  return `${exerciseName} 자세가 ${periodText} 동안 안정적으로 유지되고 있습니다.`;
}

// Analyze trend for a specific joint
function analyzeJointTrend(
  jointType: JointAngleType,
  currentSessions: SessionRecord[],
  previousSessions: SessionRecord[]
): JointTrendAnalysis | null {
  // Extract angle data for this joint
  const currentAngles = extractJointAverages(jointType, currentSessions);
  const previousAngles = extractJointAverages(jointType, previousSessions);

  if (currentAngles.length === 0) return null;

  const currentAverage = average(currentAngles);
  const previousAverage = previousAngles.length > 0
    ? average(previousAngles)
    : currentAverage; // No change if no previous data

  const changeAmount = currentAverage - previousAverage;
  const changePercent = previousAverage !== 0
    ? (changeAmount / previousAverage) * 100
    : 0;

  // Determine if change is significant
  const isStatisticallySignificant =
    Math.abs(changeAmount) >= SIGNIFICANT_CHANGE_DEGREES ||
    Math.abs(changePercent) >= SIGNIFICANT_CHANGE_PERCENT;

  // Determine direction based on joint-specific improvement
  const direction = determineDirection(
    jointType,
    changeAmount,
    currentAverage,
    isStatisticallySignificant
  );

  // Generate insight
  const insight = generateJointInsight(
    jointType,
    changeAmount,
    direction,
    isStatisticallySignificant
  );

  return {
    jointType,
    currentAverage: Math.round(currentAverage * 10) / 10,
    previousAverage: Math.round(previousAverage * 10) / 10,
    changeAmount: Math.round(changeAmount * 10) / 10,
    changePercent: Math.round(changePercent * 10) / 10,
    direction,
    isStatisticallySignificant,
    insight
  };
}

// Analyze trends for a specific exercise type
export function analyzeTrends(
  exerciseType: ExerciseType,
  periodDays: number = 7
): TrendAnalysis | null {
  const periodMs = periodDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Get current period sessions
  const currentPeriodStart = now - periodMs;
  const currentSessions = getSessions(exerciseType, currentPeriodStart, now);

  // Get previous period sessions for comparison
  const previousPeriodStart = currentPeriodStart - periodMs;
  const previousSessions = getSessions(exerciseType, previousPeriodStart, currentPeriodStart);

  // Check if we have enough data
  if (currentSessions.length < MIN_SESSIONS_FOR_TREND) {
    return null; // Not enough data for analysis
  }

  // Analyze each joint type present in sessions
  const jointTypes = getUniqueJointTypes(currentSessions);
  const jointTrends: JointTrendAnalysis[] = [];

  for (const jointType of jointTypes) {
    const trend = analyzeJointTrend(
      jointType,
      currentSessions,
      previousSessions
    );
    if (trend) {
      jointTrends.push(trend);
    }
  }

  // Calculate overall trend
  const overallTrend = calculateOverallTrend(jointTrends);
  const summaryInsight = generateSummaryInsight(
    exerciseType,
    jointTrends,
    overallTrend,
    periodDays
  );

  return {
    exerciseType,
    periodStart: currentPeriodStart,
    periodEnd: now,
    sessionCount: currentSessions.length,
    jointTrends,
    overallTrend,
    summaryInsight
  };
}

// Get comparison data for visualization
export function getComparisonData(
  exerciseType: ExerciseType,
  jointType: JointAngleType,
  days: number = 30
): Array<{ date: number; average: number; min: number; max: number }> {
  const endDate = Date.now();
  const startDate = endDate - (days * 24 * 60 * 60 * 1000);

  const sessions = getSessions(exerciseType, startDate, endDate);

  return sessions
    .map(session => {
      const angleData = session.angles.find(a => a.jointType === jointType);
      if (!angleData) return null;
      return {
        date: session.timestamp,
        average: angleData.average,
        min: angleData.min,
        max: angleData.max
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => a.date - b.date);
}

// Check if enough data exists for trend analysis
export function hasEnoughDataForTrends(
  exerciseType: ExerciseType,
  minSessions: number = MIN_SESSIONS_FOR_TREND
): boolean {
  const sessions = getSessions(exerciseType);
  return sessions.length >= minSessions;
}
