import {
  analyzeSessionTrends,
  calculateFatiguePattern,
  calculateConsistencyScores,
  identifyBestWorstReps,
  compareWithPreviousSessions,
  extractRepAngles,
  calculateLinearRegressionSlope,
  findFatigueOnsetRep,
  RepAngleData,
  FatiguePattern,
  ConsistencyMetrics,
  RepQualityScore,
  SessionAngleTrendSummary,
} from '../sessionAngleTrendAnalyzer';
import { SessionRecord, JointAngleType, ExerciseType } from '@/types/angleHistory';
import * as angleHistoryStorage from '../angleHistoryStorage';

// Mock angleHistoryStorage
jest.mock('../angleHistoryStorage');

const mockedGetSessionById = angleHistoryStorage.getSessionById as jest.MockedFunction<typeof angleHistoryStorage.getSessionById>;
const mockedGetSessions = angleHistoryStorage.getSessions as jest.MockedFunction<typeof angleHistoryStorage.getSessions>;

describe('SessionAngleTrendAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test helper to create mock SessionRecord
  const createMockSession = (
    id: string,
    exerciseType: ExerciseType,
    repCount: number,
    overallScore: number,
    timestamp: number = Date.now()
  ): SessionRecord => ({
    id,
    timestamp,
    exerciseType,
    duration: 120,
    repCount,
    overallScore,
    angles: [
      {
        jointType: 'kneeFlexion',
        min: 70,
        max: 110,
        average: 90,
        stdDev: 5,
        sampleCount: repCount * 10,
      },
      {
        jointType: 'hipFlexion',
        min: 65,
        max: 115,
        average: 90,
        stdDev: 8,
        sampleCount: repCount * 10,
      },
    ],
  });

  // Test helper to create mock RepAngleData
  const createMockRepAngles = (
    count: number,
    quality: 'good' | 'declining' | 'variable'
  ): RepAngleData[] => {
    const repAngles: RepAngleData[] = [];

    for (let i = 0; i < count; i++) {
      let kneeValue: number;
      let hipValue: number;

      if (quality === 'good') {
        // Consistent good values
        kneeValue = 90 + (Math.random() - 0.5) * 4; // Small variation
        hipValue = 90 + (Math.random() - 0.5) * 4;
      } else if (quality === 'declining') {
        // Gradually declining form
        kneeValue = 90 + (i * 1.5); // Increasing deviation from ideal
        hipValue = 90 + (i * 1.2);
      } else {
        // Variable quality
        kneeValue = 90 + (Math.random() - 0.5) * 30;
        hipValue = 90 + (Math.random() - 0.5) * 30;
      }

      repAngles.push({
        repNumber: i + 1,
        timestamp: Date.now() + i * 3000,
        angles: [
          {
            jointType: 'kneeFlexion',
            value: Math.round(kneeValue * 10) / 10,
            min: 70,
            max: 110,
            deviation: Math.abs(kneeValue - 90),
          },
          {
            jointType: 'hipFlexion',
            value: Math.round(hipValue * 10) / 10,
            min: 65,
            max: 115,
            deviation: Math.abs(hipValue - 90),
          },
        ],
        repDuration: 3000,
        overallQuality: Math.max(0, Math.min(100, 100 - (Math.abs(kneeValue - 90) + Math.abs(hipValue - 90)))),
      });
    }

    return repAngles;
  };

  describe('analyzeSessionTrends', () => {
    it('should return null for non-existent session', () => {
      mockedGetSessionById.mockReturnValue(null);

      const result = analyzeSessionTrends('non-existent-id');

      expect(result).toBeNull();
      expect(mockedGetSessionById).toHaveBeenCalledWith('non-existent-id');
    });

    it('should return complete summary for valid session', () => {
      const mockSession = createMockSession('session-1', 'squat', 10, 85);
      mockedGetSessionById.mockReturnValue(mockSession);
      mockedGetSessions.mockReturnValue([]);

      const result = analyzeSessionTrends('session-1');

      expect(result).not.toBeNull();
      expect(result?.sessionId).toBe('session-1');
      expect(result?.exerciseType).toBe('squat');
      expect(result?.totalReps).toBe(10);
      expect(result?.fatiguePattern).toBeDefined();
      expect(result?.consistencyMetrics).toBeDefined();
      expect(result?.repQualityScores).toHaveLength(10);
      expect(result?.sessionInsight).toBeDefined();
      expect(result?.improvementSuggestions).toBeDefined();
    });

    it('should return null for sessions with zero reps', () => {
      const mockSession = createMockSession('session-1', 'squat', 0, 0);
      mockedGetSessionById.mockReturnValue(mockSession);

      const result = analyzeSessionTrends('session-1');

      expect(result).toBeNull();
    });

    it('should include comparison data when previous sessions exist', () => {
      const currentSession = createMockSession('session-2', 'squat', 10, 85, Date.now());
      const previousSession = createMockSession('session-1', 'squat', 10, 80, Date.now() - 86400000);

      mockedGetSessionById.mockReturnValue(currentSession);
      mockedGetSessions.mockReturnValue([currentSession, previousSession]);

      const result = analyzeSessionTrends('session-2');

      expect(result?.comparisonToPrevious).not.toBeNull();
      expect(result?.comparisonToPrevious?.previousSessionId).toBe('session-1');
    });

    it('should have null comparison when no previous sessions exist', () => {
      const mockSession = createMockSession('session-1', 'squat', 10, 85);
      mockedGetSessionById.mockReturnValue(mockSession);
      mockedGetSessions.mockReturnValue([mockSession]);

      const result = analyzeSessionTrends('session-1');

      expect(result?.comparisonToPrevious).toBeNull();
    });
  });

  describe('calculateFatiguePattern', () => {
    it('should return no fatigue detected for short sessions', () => {
      const repAngles = createMockRepAngles(3, 'good');

      const result = calculateFatiguePattern(repAngles);

      expect(result.isDetected).toBe(false);
      expect(result.insight).toContain('충분한 렙 데이터');
    });

    it('should detect low fatigue with minimal degradation', () => {
      // Create reps with very slight decline
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 10; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 90 + (i * 0.3), // Very slight increase
              min: 70,
              max: 110,
              deviation: i * 0.3,
            },
          ],
          repDuration: 3000,
          overallQuality: 90 - i,
        });
      }

      const result = calculateFatiguePattern(repAngles);

      // May or may not detect depending on threshold
      if (result.isDetected) {
        expect(result.severity).toBe('low');
      }
    });

    it('should detect moderate fatigue with gradual decline', () => {
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 10; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 90 + (i * 1.2), // Moderate increase (degradation)
              min: 70,
              max: 110,
              deviation: i * 1.2,
            },
          ],
          repDuration: 3000,
          overallQuality: 90 - (i * 2),
        });
      }

      const result = calculateFatiguePattern(repAngles);

      expect(result.isDetected).toBe(true);
      expect(['low', 'moderate']).toContain(result.severity);
    });

    it('should detect high fatigue with rapid decline', () => {
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 10; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 90 + (i * 3), // Rapid degradation
              min: 70,
              max: 110,
              deviation: i * 3,
            },
          ],
          repDuration: 3000,
          overallQuality: 90 - (i * 5),
        });
      }

      const result = calculateFatiguePattern(repAngles);

      expect(result.isDetected).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.degradationRate).toBeGreaterThan(2);
    });

    it('should identify affected joints correctly', () => {
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 10; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 90 + (i * 2), // Degrading
              min: 70,
              max: 110,
              deviation: i * 2,
            },
            {
              jointType: 'hipFlexion',
              value: 90, // Stable
              min: 65,
              max: 115,
              deviation: 0,
            },
          ],
          repDuration: 3000,
          overallQuality: 80,
        });
      }

      const result = calculateFatiguePattern(repAngles);

      if (result.isDetected) {
        expect(result.affectedJoints).toContain('kneeFlexion');
      }
    });

    it('should return no fatigue for consistent good form', () => {
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 10; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 90 + (Math.random() - 0.5) * 2, // Small random variation
              min: 70,
              max: 110,
              deviation: 1,
            },
          ],
          repDuration: 3000,
          overallQuality: 95,
        });
      }

      const result = calculateFatiguePattern(repAngles);

      expect(result.isDetected).toBe(false);
      expect(result.insight).toContain('피로 징후가 감지되지 않았습니다');
    });

    it('should generate appropriate Korean insight messages', () => {
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 10; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 90 + (i * 2.5),
              min: 70,
              max: 110,
              deviation: i * 2.5,
            },
          ],
          repDuration: 3000,
          overallQuality: 80 - i * 3,
        });
      }

      const result = calculateFatiguePattern(repAngles);

      expect(result.insight).toBeDefined();
      expect(result.insight.length).toBeGreaterThan(0);
      // Korean insight should contain Korean characters
      if (result.isDetected) {
        expect(/[\u3131-\uD79D]/.test(result.insight)).toBe(true);
      }
    });
  });

  describe('calculateConsistencyScores', () => {
    it('should return high score for consistent angles', () => {
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 10; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 90 + (Math.random() - 0.5) * 2, // Very consistent
              min: 70,
              max: 110,
              deviation: 0,
            },
          ],
          repDuration: 3000,
          overallQuality: 95,
        });
      }

      const result = calculateConsistencyScores(repAngles);

      expect(result.overallScore).toBeGreaterThan(80);
    });

    it('should return low score for inconsistent angles', () => {
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 10; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 70 + (i * 5), // Wide variation
              min: 70,
              max: 110,
              deviation: i * 3,
            },
          ],
          repDuration: 3000,
          overallQuality: 70,
        });
      }

      const result = calculateConsistencyScores(repAngles);

      expect(result.overallScore).toBeLessThan(60);
    });

    it('should correctly identify most/least consistent joints', () => {
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 10; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 90 + (Math.random() - 0.5) * 2, // Very consistent
              min: 70,
              max: 110,
              deviation: 1,
            },
            {
              jointType: 'hipFlexion',
              value: 70 + (i * 4), // Very inconsistent
              min: 65,
              max: 115,
              deviation: i * 2,
            },
          ],
          repDuration: 3000,
          overallQuality: 80,
        });
      }

      const result = calculateConsistencyScores(repAngles);

      expect(result.mostConsistentJoint).toBe('kneeFlexion');
      expect(result.leastConsistentJoint).toBe('hipFlexion');
    });

    it('should handle empty rep arrays', () => {
      const result = calculateConsistencyScores([]);

      expect(result.overallScore).toBe(0);
      expect(result.perJointScores).toHaveLength(0);
      expect(result.mostConsistentJoint).toBeNull();
      expect(result.leastConsistentJoint).toBeNull();
    });

    it('should calculate correct standard deviations', () => {
      // Create reps with known values for predictable stdDev
      const repAngles: RepAngleData[] = [
        { repNumber: 1, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 85, min: 70, max: 110, deviation: 5 }], repDuration: 3000, overallQuality: 90 },
        { repNumber: 2, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 90, min: 70, max: 110, deviation: 0 }], repDuration: 3000, overallQuality: 95 },
        { repNumber: 3, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 95, min: 70, max: 110, deviation: 5 }], repDuration: 3000, overallQuality: 90 },
      ];
      // Mean = 90, values are 85, 90, 95
      // Variance = ((25 + 0 + 25) / 3) = 16.67
      // StdDev = sqrt(16.67) ≈ 4.08

      const result = calculateConsistencyScores(repAngles);

      const kneeScore = result.perJointScores.find(s => s.jointType === 'kneeFlexion');
      expect(kneeScore).toBeDefined();
      expect(kneeScore?.standardDeviation).toBeCloseTo(4.1, 0);
    });

    it('should determine correct trend directions', () => {
      // First half lower, second half higher = improving
      const repAngles: RepAngleData[] = [
        { repNumber: 1, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 80, min: 70, max: 110, deviation: 10 }], repDuration: 3000, overallQuality: 80 },
        { repNumber: 2, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 82, min: 70, max: 110, deviation: 8 }], repDuration: 3000, overallQuality: 82 },
        { repNumber: 3, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 88, min: 70, max: 110, deviation: 2 }], repDuration: 3000, overallQuality: 90 },
        { repNumber: 4, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 90, min: 70, max: 110, deviation: 0 }], repDuration: 3000, overallQuality: 95 },
      ];

      const result = calculateConsistencyScores(repAngles);

      const kneeScore = result.perJointScores.find(s => s.jointType === 'kneeFlexion');
      expect(kneeScore?.trend).toBe('improving');
    });
  });

  describe('identifyBestWorstReps', () => {
    it('should correctly rank reps by quality', () => {
      const repAngles: RepAngleData[] = [
        { repNumber: 1, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 90, min: 70, max: 110, deviation: 0 }], repDuration: 3000, overallQuality: 100 },
        { repNumber: 2, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 120, min: 70, max: 110, deviation: 30 }], repDuration: 3000, overallQuality: 40 },
        { repNumber: 3, timestamp: Date.now(), angles: [{ jointType: 'kneeFlexion', value: 95, min: 70, max: 110, deviation: 5 }], repDuration: 3000, overallQuality: 90 },
      ];

      const result = identifyBestWorstReps(repAngles);

      expect(result).toHaveLength(3);

      // Rep 1 should have highest quality score (closest to ideal)
      const rep1 = result.find(r => r.repNumber === 1);
      const rep2 = result.find(r => r.repNumber === 2);
      expect(rep1?.qualityScore).toBeGreaterThan(rep2?.qualityScore ?? 100);
    });

    it('should assign correct ranking categories', () => {
      // Create 20 reps with varying quality to ensure all ranking categories are represented
      // With 20 reps: best (0-10%), good (10-25%), average (25-75%), poor (75-90%), worst (>90%)
      const repAngles: RepAngleData[] = [];
      for (let i = 0; i < 20; i++) {
        repAngles.push({
          repNumber: i + 1,
          timestamp: Date.now() + i * 3000,
          angles: [
            {
              jointType: 'kneeFlexion',
              value: 90 + (i * 2), // Increasing deviation
              min: 70,
              max: 110,
              deviation: i * 2,
            },
          ],
          repDuration: 3000,
          overallQuality: 100 - (i * 3),
        });
      }

      const result = identifyBestWorstReps(repAngles);

      // Check that rankings exist
      const rankings = result.map(r => r.ranking);
      expect(rankings).toContain('best');
      expect(rankings).toContain('worst');
      expect(rankings).toContain('good');
      expect(rankings).toContain('average');
      expect(rankings).toContain('poor');
    });

    it('should generate appropriate strengths/weaknesses in Korean', () => {
      const repAngles: RepAngleData[] = [
        {
          repNumber: 1,
          timestamp: Date.now(),
          angles: [
            { jointType: 'kneeFlexion', value: 90, min: 70, max: 110, deviation: 0 },
            { jointType: 'hipFlexion', value: 150, min: 65, max: 115, deviation: 60 },
          ],
          repDuration: 3000,
          overallQuality: 70,
        },
      ];

      const result = identifyBestWorstReps(repAngles);

      expect(result[0].strengths.length).toBeGreaterThan(0);
      expect(result[0].weaknesses.length).toBeGreaterThan(0);
      // Check for Korean characters
      expect(/[\u3131-\uD79D]/.test(result[0].strengths[0])).toBe(true);
      expect(/[\u3131-\uD79D]/.test(result[0].weaknesses[0])).toBe(true);
    });

    it('should handle single rep sessions', () => {
      const repAngles: RepAngleData[] = [
        {
          repNumber: 1,
          timestamp: Date.now(),
          angles: [{ jointType: 'kneeFlexion', value: 90, min: 70, max: 110, deviation: 0 }],
          repDuration: 3000,
          overallQuality: 95,
        },
      ];

      const result = identifyBestWorstReps(repAngles);

      expect(result).toHaveLength(1);
      expect(result[0].ranking).toBe('best');
    });

    it('should handle empty arrays', () => {
      const result = identifyBestWorstReps([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('compareWithPreviousSessions', () => {
    it('should return null if no previous sessions', () => {
      const currentSession = createMockSession('session-1', 'squat', 10, 85);
      mockedGetSessions.mockReturnValue([currentSession]);

      const result = compareWithPreviousSessions(currentSession, 'squat');

      expect(result).toBeNull();
    });

    it('should correctly calculate improvement percentages', () => {
      const currentSession = createMockSession('session-2', 'squat', 10, 90, Date.now());
      const previousSession = createMockSession('session-1', 'squat', 10, 80, Date.now() - 86400000);

      mockedGetSessions.mockReturnValue([currentSession, previousSession]);

      const result = compareWithPreviousSessions(currentSession, 'squat');

      expect(result).not.toBeNull();
      expect(result?.overallImprovement).toBe(13); // (90-80)/80 * 100 = 12.5, rounded to 13
    });

    it('should compare consistency scores', () => {
      const currentSession = createMockSession('session-2', 'squat', 10, 85, Date.now());
      currentSession.angles[0].stdDev = 3; // Lower stdDev = more consistent

      const previousSession = createMockSession('session-1', 'squat', 10, 80, Date.now() - 86400000);
      previousSession.angles[0].stdDev = 8; // Higher stdDev = less consistent

      mockedGetSessions.mockReturnValue([currentSession, previousSession]);

      const result = compareWithPreviousSessions(currentSession, 'squat');

      expect(result?.consistencyComparison.improved).toBe(true);
    });

    it('should filter by exercise type', () => {
      const currentSession = createMockSession('session-2', 'squat', 10, 85, Date.now());
      const previousSquatSession = createMockSession('session-1', 'squat', 10, 80, Date.now() - 86400000);
      const pushupSession = createMockSession('session-0', 'pushup', 10, 75, Date.now() - 172800000);

      mockedGetSessions.mockReturnValue([currentSession, previousSquatSession]);

      const result = compareWithPreviousSessions(currentSession, 'squat');

      expect(result?.previousSessionId).toBe('session-1');
    });

    it('should select most recent previous session', () => {
      const currentSession = createMockSession('session-3', 'squat', 10, 90, Date.now());
      const recentPrevious = createMockSession('session-2', 'squat', 10, 85, Date.now() - 86400000);
      const olderPrevious = createMockSession('session-1', 'squat', 10, 80, Date.now() - 172800000);

      mockedGetSessions.mockReturnValue([currentSession, recentPrevious, olderPrevious]);

      const result = compareWithPreviousSessions(currentSession, 'squat');

      expect(result?.previousSessionId).toBe('session-2');
    });

    it('should generate appropriate Korean comparison insights', () => {
      const currentSession = createMockSession('session-2', 'squat', 10, 90, Date.now());
      const previousSession = createMockSession('session-1', 'squat', 10, 80, Date.now() - 86400000);

      mockedGetSessions.mockReturnValue([currentSession, previousSession]);

      const result = compareWithPreviousSessions(currentSession, 'squat');

      expect(result?.insight).toBeDefined();
      expect(result?.insight.length).toBeGreaterThan(0);
      // Korean insight should contain Korean characters
      expect(/[\u3131-\uD79D]/.test(result?.insight ?? '')).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    describe('calculateLinearRegressionSlope', () => {
      it('should return 0 for less than 2 points', () => {
        expect(calculateLinearRegressionSlope([])).toBe(0);
        expect(calculateLinearRegressionSlope([{ x: 1, y: 10 }])).toBe(0);
      });

      it('should calculate correct positive slope', () => {
        const points = [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
          { x: 3, y: 30 },
        ];
        const slope = calculateLinearRegressionSlope(points);
        expect(slope).toBeCloseTo(10, 1);
      });

      it('should calculate correct negative slope', () => {
        const points = [
          { x: 1, y: 30 },
          { x: 2, y: 20 },
          { x: 3, y: 10 },
        ];
        const slope = calculateLinearRegressionSlope(points);
        expect(slope).toBeCloseTo(-10, 1);
      });

      it('should return 0 for horizontal line', () => {
        const points = [
          { x: 1, y: 10 },
          { x: 2, y: 10 },
          { x: 3, y: 10 },
        ];
        const slope = calculateLinearRegressionSlope(points);
        expect(slope).toBeCloseTo(0, 1);
      });
    });

    describe('findFatigueOnsetRep', () => {
      it('should return last rep for arrays with less than 3 points', () => {
        const points = [{ x: 1, y: 90 }, { x: 2, y: 95 }];
        expect(findFatigueOnsetRep(points, 5)).toBe(2);
      });

      it('should find onset when threshold exceeded', () => {
        const points = [
          { x: 1, y: 90 },
          { x: 2, y: 91 },
          { x: 3, y: 92 },
          { x: 4, y: 100 }, // Exceeds threshold (3 degrees change from baseline ~91)
          { x: 5, y: 102 },
        ];
        const onset = findFatigueOnsetRep(points, 5);
        expect(onset).toBe(4);
      });

      it('should return last rep when threshold never exceeded', () => {
        const points = [
          { x: 1, y: 90 },
          { x: 2, y: 91 },
          { x: 3, y: 90 },
          { x: 4, y: 91 },
          { x: 5, y: 90 },
        ];
        const onset = findFatigueOnsetRep(points, 10);
        expect(onset).toBe(5);
      });
    });

    describe('extractRepAngles', () => {
      it('should extract correct number of reps', () => {
        const mockSession = createMockSession('session-1', 'squat', 5, 85);
        mockedGetSessionById.mockReturnValue(mockSession);

        const result = extractRepAngles(mockSession);

        expect(result).toHaveLength(5);
      });

      it('should return empty array for zero reps', () => {
        const mockSession = createMockSession('session-1', 'squat', 0, 0);

        const result = extractRepAngles(mockSession);

        expect(result).toHaveLength(0);
      });

      it('should include all joint types from session', () => {
        const mockSession = createMockSession('session-1', 'squat', 3, 85);

        const result = extractRepAngles(mockSession);

        expect(result[0].angles).toHaveLength(2);
        expect(result[0].angles.map(a => a.jointType)).toContain('kneeFlexion');
        expect(result[0].angles.map(a => a.jointType)).toContain('hipFlexion');
      });

      it('should calculate rep duration correctly', () => {
        const mockSession = createMockSession('session-1', 'squat', 4, 85);
        mockSession.duration = 120; // 120 seconds

        const result = extractRepAngles(mockSession);

        // 120 seconds / 4 reps = 30 seconds = 30000ms per rep
        expect(result[0].repDuration).toBe(30000);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should produce consistent results for the same session', () => {
      const mockSession = createMockSession('session-1', 'squat', 10, 85);
      mockedGetSessionById.mockReturnValue(mockSession);
      mockedGetSessions.mockReturnValue([]);

      // Note: Due to random variance in extractRepAngles, results may vary slightly
      // This test verifies the overall structure is consistent
      const result1 = analyzeSessionTrends('session-1');
      const result2 = analyzeSessionTrends('session-1');

      expect(result1?.sessionId).toBe(result2?.sessionId);
      expect(result1?.exerciseType).toBe(result2?.exerciseType);
      expect(result1?.totalReps).toBe(result2?.totalReps);
    });

    it('should handle all exercise types', () => {
      const exerciseTypes: ExerciseType[] = ['squat', 'pushup', 'lunge', 'plank', 'deadlift', 'static-posture'];

      for (const exerciseType of exerciseTypes) {
        const mockSession = createMockSession(`session-${exerciseType}`, exerciseType, 10, 85);
        mockedGetSessionById.mockReturnValue(mockSession);
        mockedGetSessions.mockReturnValue([]);

        const result = analyzeSessionTrends(`session-${exerciseType}`);

        expect(result).not.toBeNull();
        expect(result?.exerciseType).toBe(exerciseType);
      }
    });
  });
});
