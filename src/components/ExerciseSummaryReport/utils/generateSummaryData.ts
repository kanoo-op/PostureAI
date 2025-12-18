import { SessionRecord, AngleData, JointAngleType, TrendDirection } from '@/types/angleHistory';
import { ROM_BENCHMARKS, assessMobility, generateRecommendations, JointROMResult } from '@/utils/jointROMAnalyzer';
import { SummaryData, AngleStatistics, ROMAchievement, SymmetryScore, FormBreakdown, RepQualityPoint } from '../types';
import { SYMMETRY_THRESHOLDS } from '../constants';

// Bilateral joint pairs for symmetry analysis
const BILATERAL_JOINTS: JointAngleType[] = ['kneeFlexion', 'hipFlexion', 'ankleAngle', 'elbowAngle', 'shoulderAngle'];

export function generateSummaryData(session: SessionRecord): SummaryData {
  const startTime = performance.now();

  // 1. Generate angle statistics
  const angleStatistics = generateAngleStatistics(session.angles);

  // 2. Generate ROM achievements
  const romAchievements = generateROMAchievements(session.angles);

  // 3. Generate symmetry scores (for bilateral joints)
  const symmetryScores = generateSymmetryScores(session.angles);

  // 4. Generate form breakdown
  const formBreakdown = generateFormBreakdown(session.overallScore, session.angles);

  // 5. Generate rep quality trend (simulated from score variance)
  const repQualityTrend = generateRepQualityTrend(session.repCount, session.overallScore);

  // 6. Generate recommendations
  const jointResults = romAchievements.map(ra => ({
    jointType: ra.jointType,
    rangeAchieved: ra.achieved,
    benchmark: ROM_BENCHMARKS[ra.jointType] || ROM_BENCHMARKS.kneeFlexion,
    assessment: ra.assessment,
    percentOfNormal: ra.percentOfBenchmark,
  } as JointROMResult));
  const recommendations = generateRecommendations(jointResults);

  const endTime = performance.now();
  console.log(`Summary generation completed in ${(endTime - startTime).toFixed(2)}ms`);

  return {
    sessionId: session.id,
    exerciseType: session.exerciseType,
    timestamp: session.timestamp,
    duration: session.duration,
    repCount: session.repCount,
    overallScore: session.overallScore,
    angleStatistics,
    romAchievements,
    symmetryScores,
    formBreakdown,
    repQualityTrend,
    recommendations,
  };
}

function generateAngleStatistics(angles: AngleData[]): AngleStatistics[] {
  return angles.map(angle => ({
    jointType: angle.jointType,
    min: Math.round(angle.min * 10) / 10,
    max: Math.round(angle.max * 10) / 10,
    average: Math.round(angle.average * 10) / 10,
    stdDev: Math.round(angle.stdDev * 10) / 10,
    range: Math.round((angle.max - angle.min) * 10) / 10,
  }));
}

function generateROMAchievements(angles: AngleData[]): ROMAchievement[] {
  return angles
    .filter(angle => ROM_BENCHMARKS[angle.jointType])
    .map(angle => {
      const benchmark = ROM_BENCHMARKS[angle.jointType];
      const achieved = angle.max - angle.min;
      const percentOfBenchmark = (achieved / benchmark.normalRange.max) * 100;
      const assessment = assessMobility(achieved, benchmark);

      return {
        jointType: angle.jointType,
        achieved: Math.round(achieved * 10) / 10,
        benchmarkMin: benchmark.normalRange.min,
        benchmarkMax: benchmark.normalRange.max,
        percentOfBenchmark: Math.round(percentOfBenchmark),
        assessment,
      };
    });
}

function generateSymmetryScores(angles: AngleData[]): SymmetryScore[] {
  // In a real implementation, you'd have left/right data
  // For now, simulate based on stdDev as proxy for asymmetry
  return angles
    .filter(angle => BILATERAL_JOINTS.includes(angle.jointType))
    .map(angle => {
      // Simulate left/right from average ± stdDev
      const leftAverage = angle.average + (angle.stdDev * 0.5);
      const rightAverage = angle.average - (angle.stdDev * 0.5);
      const difference = Math.abs(leftAverage - rightAverage);
      const symmetryPercent = Math.max(0, 100 - (difference * 2));

      let level: 'good' | 'warning' | 'error' = 'good';
      if (difference > SYMMETRY_THRESHOLDS.warning) level = 'error';
      else if (difference > SYMMETRY_THRESHOLDS.good) level = 'warning';

      return {
        jointType: angle.jointType,
        leftAverage: Math.round(leftAverage * 10) / 10,
        rightAverage: Math.round(rightAverage * 10) / 10,
        difference: Math.round(difference * 10) / 10,
        symmetryPercent: Math.round(symmetryPercent),
        level,
      };
    });
}

function generateFormBreakdown(overallScore: number, angles: AngleData[]): FormBreakdown[] {
  // Calculate form breakdown based on score distribution
  const total = angles.length > 0 ? angles.length : 1;

  // Estimate breakdown from overall score
  const goodPercent = overallScore;
  const warningPercent = Math.min(100 - goodPercent, 30);
  const errorPercent = 100 - goodPercent - warningPercent;

  const breakdown: FormBreakdown[] = [
    {
      type: 'good' as const,
      label: '올바른 자세',
      labelEn: 'Good Form',
      count: Math.round((goodPercent / 100) * total),
      percentage: Math.round(goodPercent),
    },
    {
      type: 'warning' as const,
      label: '주의 필요',
      labelEn: 'Needs Attention',
      count: Math.round((warningPercent / 100) * total),
      percentage: Math.round(warningPercent),
    },
    {
      type: 'error' as const,
      label: '교정 필요',
      labelEn: 'Needs Correction',
      count: Math.round((errorPercent / 100) * total),
      percentage: Math.round(errorPercent),
    },
  ];

  return breakdown.filter(b => b.percentage > 0);
}

function generateRepQualityTrend(repCount: number, overallScore: number): RepQualityPoint[] {
  if (repCount === 0) return [];

  const points: RepQualityPoint[] = [];
  const variance = Math.max(5, 100 - overallScore) / 2;

  for (let i = 1; i <= repCount; i++) {
    // Simulate slight fatigue curve
    const fatigueModifier = Math.min(10, (i / repCount) * 10);
    const randomVariance = (Math.random() - 0.5) * variance;
    const score = Math.max(0, Math.min(100, overallScore - fatigueModifier + randomVariance));

    let trend: TrendDirection = 'stable';
    if (i > 1) {
      const prevScore = points[i - 2].score;
      if (score > prevScore + 3) trend = 'improving';
      else if (score < prevScore - 3) trend = 'declining';
    }

    points.push({
      repNumber: i,
      score: Math.round(score),
      trend,
    });
  }

  return points;
}
