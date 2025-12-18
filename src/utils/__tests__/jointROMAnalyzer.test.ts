import {
  JointROMTracker,
  assessMobility,
  generateRecommendations,
  createSquatROMTracker,
  createLungeROMTracker,
  createDeadliftROMTracker,
  ROM_BENCHMARKS,
  getROMStatus,
  formatROMFeedback,
  compareROMToBaseline,
  romSummaryToAngleData,
  JointROMResult,
  SessionROMSummary,
  MobilityAssessment,
} from '../jointROMAnalyzer';

describe('JointROMAnalyzer', () => {
  describe('JointROMTracker', () => {
    it('should track min and max angles during session', () => {
      const tracker = createSquatROMTracker();
      tracker.startTracking();

      // Record various knee angles
      tracker.recordAngle('kneeFlexion', 160, 'left');
      tracker.recordAngle('kneeFlexion', 90, 'left');
      tracker.recordAngle('kneeFlexion', 120, 'left');

      const summary = tracker.getSessionSummary();
      expect(summary).not.toBeNull();

      const kneeResult = summary!.joints.find(
        j => j.jointType === 'kneeFlexion' && j.side === 'left'
      );
      expect(kneeResult?.minAngle).toBe(90);
      expect(kneeResult?.maxAngle).toBe(160);
      expect(kneeResult?.rangeAchieved).toBe(70);
    });

    it('should handle bilateral tracking', () => {
      const tracker = createSquatROMTracker();
      tracker.startTracking();

      tracker.recordAngle('kneeFlexion', 90, 'left');
      tracker.recordAngle('kneeFlexion', 130, 'left');
      tracker.recordAngle('kneeFlexion', 95, 'right');
      tracker.recordAngle('kneeFlexion', 135, 'right');

      const summary = tracker.getSessionSummary();

      // Should have separate results for left and right
      const leftKnee = summary!.joints.find(
        j => j.jointType === 'kneeFlexion' && j.side === 'left'
      );
      const rightKnee = summary!.joints.find(
        j => j.jointType === 'kneeFlexion' && j.side === 'right'
      );

      expect(leftKnee).toBeDefined();
      expect(rightKnee).toBeDefined();
      expect(leftKnee?.rangeAchieved).toBe(40);
      expect(rightKnee?.rangeAchieved).toBe(40);
    });

    it('should not record when not tracking', () => {
      const tracker = createSquatROMTracker();
      // Don't call startTracking()

      tracker.recordAngle('kneeFlexion', 90);

      expect(tracker.getSessionSummary()).toBeNull();
    });

    it('should not record invalid angles', () => {
      const tracker = createSquatROMTracker();
      tracker.startTracking();

      tracker.recordAngle('kneeFlexion', NaN);
      tracker.recordAngle('kneeFlexion', -10);
      tracker.recordAngle('kneeFlexion', 400);
      tracker.recordAngle('kneeFlexion', Infinity);

      expect(tracker.getSessionSummary()).toBeNull();
    });

    it('should only track specified joint types', () => {
      const tracker = createDeadliftROMTracker(); // tracks hipFlexion, torsoAngle
      tracker.startTracking();

      tracker.recordAngle('kneeFlexion', 90); // Not tracked
      tracker.recordAngle('hipFlexion', 100);

      const summary = tracker.getSessionSummary();
      expect(summary).not.toBeNull();

      const kneeResult = summary!.joints.find(j => j.jointType === 'kneeFlexion');
      const hipResult = summary!.joints.find(j => j.jointType === 'hipFlexion');

      expect(kneeResult).toBeUndefined();
      expect(hipResult).toBeDefined();
    });

    it('should return correct isTracking status', () => {
      const tracker = createSquatROMTracker();

      expect(tracker.getIsTracking()).toBe(false);

      tracker.startTracking();
      expect(tracker.getIsTracking()).toBe(true);

      tracker.stopTracking();
      expect(tracker.getIsTracking()).toBe(false);
    });

    it('should return current stats for UI display', () => {
      const tracker = createSquatROMTracker();
      tracker.startTracking();

      tracker.recordAngle('kneeFlexion', 100, 'left');
      tracker.recordAngle('kneeFlexion', 80, 'left');
      tracker.recordAngle('kneeFlexion', 120, 'left');

      const stats = tracker.getCurrentStats();
      const kneeStat = stats.find(s => s.jointType === 'kneeFlexion' && s.side === 'left');

      expect(kneeStat).toBeDefined();
      expect(kneeStat?.min).toBe(80);
      expect(kneeStat?.max).toBe(120);
      expect(kneeStat?.current).toBe(120); // Last recorded value
    });

    it('should stop tracking and return final summary', () => {
      const tracker = createSquatROMTracker();
      tracker.startTracking();

      tracker.recordAngle('kneeFlexion', 90, 'left');
      tracker.recordAngle('kneeFlexion', 130, 'left');

      const summary = tracker.stopTracking();

      expect(summary).not.toBeNull();
      expect(summary?.exerciseType).toBe('squat');
      expect(summary?.joints.length).toBeGreaterThan(0);
      expect(tracker.getIsTracking()).toBe(false);
    });

    it('should calculate overall mobility correctly', () => {
      const tracker = createSquatROMTracker();
      tracker.startTracking();

      // Record limited mobility (small range)
      tracker.recordAngle('kneeFlexion', 100, 'left');
      tracker.recordAngle('kneeFlexion', 110, 'left');

      const summary = tracker.getSessionSummary();
      expect(summary).not.toBeNull();
    });
  });

  describe('assessMobility', () => {
    it('should return normal for values within normal range', () => {
      const benchmark = ROM_BENCHMARKS.kneeFlexion;
      // Normal range max is 135, limited threshold is 120
      expect(assessMobility(130, benchmark)).toBe('normal');
      expect(assessMobility(120, benchmark)).toBe('normal');
    });

    it('should return limited for values below threshold', () => {
      const benchmark = ROM_BENCHMARKS.kneeFlexion;
      // Limited threshold is 120
      expect(assessMobility(100, benchmark)).toBe('limited');
      expect(assessMobility(50, benchmark)).toBe('limited');
    });

    it('should return hypermobile for values above threshold', () => {
      const benchmark = ROM_BENCHMARKS.kneeFlexion;
      // Hypermobile threshold is 145
      expect(assessMobility(150, benchmark)).toBe('hypermobile');
      expect(assessMobility(160, benchmark)).toBe('hypermobile');
    });

    it('should handle edge cases at thresholds', () => {
      const benchmark = ROM_BENCHMARKS.kneeFlexion;
      // Exactly at hypermobile threshold
      expect(assessMobility(145, benchmark)).toBe('hypermobile');
      // Just below hypermobile threshold
      expect(assessMobility(144, benchmark)).toBe('normal');
    });
  });

  describe('generateRecommendations', () => {
    it('should recommend stretching for limited mobility', () => {
      const results: JointROMResult[] = [
        {
          jointType: 'kneeFlexion',
          minAngle: 30,
          maxAngle: 100,
          rangeAchieved: 70,
          benchmark: ROM_BENCHMARKS.kneeFlexion,
          assessment: 'limited',
          percentOfNormal: 52,
          feedback: {
            level: 'warning',
            message: '무릎 굴곡 가동성이 제한적입니다',
            messageEn: 'Knee Flexion mobility is limited',
            assessment: 'limited',
            value: 70,
            benchmarkRange: { min: 0, max: 135 },
          },
        },
      ];

      const recommendations = generateRecommendations(results);
      expect(recommendations[0].type).toBe('stretch');
      expect(recommendations[0].priority).toBe('high'); // < 70% is high priority
    });

    it('should recommend strengthening for hypermobility', () => {
      const results: JointROMResult[] = [
        {
          jointType: 'kneeFlexion',
          minAngle: 0,
          maxAngle: 150,
          rangeAchieved: 150,
          benchmark: ROM_BENCHMARKS.kneeFlexion,
          assessment: 'hypermobile',
          percentOfNormal: 111,
          feedback: {
            level: 'warning',
            message: '무릎 굴곡 과가동성이 있습니다',
            messageEn: 'Knee Flexion shows hypermobility',
            assessment: 'hypermobile',
            value: 150,
            benchmarkRange: { min: 0, max: 135 },
          },
        },
      ];

      const recommendations = generateRecommendations(results);
      expect(recommendations[0].type).toBe('strengthen');
      expect(recommendations[0].priority).toBe('medium');
    });

    it('should recommend maintain for normal mobility', () => {
      const results: JointROMResult[] = [
        {
          jointType: 'kneeFlexion',
          minAngle: 0,
          maxAngle: 130,
          rangeAchieved: 130,
          benchmark: ROM_BENCHMARKS.kneeFlexion,
          assessment: 'normal',
          percentOfNormal: 96,
          feedback: {
            level: 'good',
            message: '무릎 굴곡 가동성이 정상입니다',
            messageEn: 'Knee Flexion mobility is normal',
            assessment: 'normal',
            value: 130,
            benchmarkRange: { min: 0, max: 135 },
          },
        },
      ];

      const recommendations = generateRecommendations(results);
      expect(recommendations[0].type).toBe('maintain');
      expect(recommendations[0].priority).toBe('low');
    });

    it('should sort recommendations by priority', () => {
      const results: JointROMResult[] = [
        {
          jointType: 'kneeFlexion',
          minAngle: 0,
          maxAngle: 130,
          rangeAchieved: 130,
          benchmark: ROM_BENCHMARKS.kneeFlexion,
          assessment: 'normal',
          percentOfNormal: 96,
          feedback: {} as any,
        },
        {
          jointType: 'hipFlexion',
          minAngle: 30,
          maxAngle: 60,
          rangeAchieved: 30,
          benchmark: ROM_BENCHMARKS.hipFlexion,
          assessment: 'limited',
          percentOfNormal: 25,
          feedback: {} as any,
        },
      ];

      const recommendations = generateRecommendations(results);

      // High priority (limited with <70%) should come first
      expect(recommendations[0].jointType).toBe('hipFlexion');
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[1].priority).toBe('low');
    });

    it('should include exercise suggestions', () => {
      const results: JointROMResult[] = [
        {
          jointType: 'kneeFlexion',
          minAngle: 30,
          maxAngle: 100,
          rangeAchieved: 70,
          benchmark: ROM_BENCHMARKS.kneeFlexion,
          assessment: 'limited',
          percentOfNormal: 52,
          feedback: {} as any,
        },
      ];

      const recommendations = generateRecommendations(results);
      expect(recommendations[0].exercises).toBeDefined();
      expect(recommendations[0].exercises!.length).toBeGreaterThan(0);
    });
  });

  describe('getROMStatus', () => {
    it('should return correct status for normal assessment', () => {
      const status = getROMStatus('normal');
      expect(status.level).toBe('good');
      expect(status.color).toBe('#00F5A0');
      expect(status.label).toBe('정상');
      expect(status.labelEn).toBe('Normal');
    });

    it('should return correct status for limited assessment', () => {
      const status = getROMStatus('limited');
      expect(status.level).toBe('warning');
      expect(status.color).toBe('#FFB800');
      expect(status.label).toBe('제한적');
      expect(status.labelEn).toBe('Limited');
    });

    it('should return correct status for hypermobile assessment', () => {
      const status = getROMStatus('hypermobile');
      expect(status.level).toBe('warning');
      expect(status.color).toBe('#8B5CF6');
      expect(status.label).toBe('과가동');
      expect(status.labelEn).toBe('Hypermobile');
    });
  });

  describe('formatROMFeedback', () => {
    const mockResult: JointROMResult = {
      jointType: 'kneeFlexion',
      minAngle: 0,
      maxAngle: 130,
      rangeAchieved: 130,
      benchmark: ROM_BENCHMARKS.kneeFlexion,
      assessment: 'normal',
      percentOfNormal: 96.3,
      feedback: {} as any,
    };

    it('should format feedback in Korean by default', () => {
      const feedback = formatROMFeedback(mockResult);
      expect(feedback).toContain('무릎 굴곡');
      expect(feedback).toContain('130°');
      expect(feedback).toContain('96%');
    });

    it('should format feedback in English when specified', () => {
      const feedback = formatROMFeedback(mockResult, 'en');
      expect(feedback).toContain('Knee Flexion');
      expect(feedback).toContain('130°');
      expect(feedback).toContain('Normal range');
    });

    it('should format limited assessment correctly', () => {
      const limitedResult: JointROMResult = {
        ...mockResult,
        rangeAchieved: 70,
        assessment: 'limited',
        percentOfNormal: 52,
      };

      const feedbackKo = formatROMFeedback(limitedResult, 'ko');
      expect(feedbackKo).toContain('제한적');

      const feedbackEn = formatROMFeedback(limitedResult, 'en');
      expect(feedbackEn).toContain('Limited');
    });

    it('should format hypermobile assessment correctly', () => {
      const hypermobileResult: JointROMResult = {
        ...mockResult,
        rangeAchieved: 150,
        assessment: 'hypermobile',
        percentOfNormal: 111,
      };

      const feedbackKo = formatROMFeedback(hypermobileResult, 'ko');
      expect(feedbackKo).toContain('과가동');

      const feedbackEn = formatROMFeedback(hypermobileResult, 'en');
      expect(feedbackEn).toContain('Hypermobile');
    });
  });

  describe('compareROMToBaseline', () => {
    const createMockSummary = (rangeAchieved: number): SessionROMSummary => ({
      exerciseType: 'squat',
      timestamp: Date.now(),
      duration: 300,
      joints: [
        {
          jointType: 'kneeFlexion',
          side: 'left',
          minAngle: 0,
          maxAngle: rangeAchieved,
          rangeAchieved,
          benchmark: ROM_BENCHMARKS.kneeFlexion,
          assessment: 'normal',
          percentOfNormal: (rangeAchieved / 135) * 100,
          feedback: {} as any,
        },
      ],
      overallMobility: 'normal',
      recommendations: [],
    });

    it('should detect improvement when ROM increases', () => {
      const baseline = createMockSummary(100);
      const current = createMockSummary(120);

      const comparison = compareROMToBaseline(current, baseline);

      expect(comparison).toHaveLength(1);
      expect(comparison[0].change).toBe(20);
      expect(comparison[0].improved).toBe(true);
    });

    it('should detect decline when ROM decreases', () => {
      const baseline = createMockSummary(120);
      const current = createMockSummary(100);

      const comparison = compareROMToBaseline(current, baseline);

      expect(comparison).toHaveLength(1);
      expect(comparison[0].change).toBe(-20);
      expect(comparison[0].improved).toBe(false);
    });

    it('should handle no change', () => {
      const baseline = createMockSummary(100);
      const current = createMockSummary(100);

      const comparison = compareROMToBaseline(current, baseline);

      expect(comparison[0].change).toBe(0);
      expect(comparison[0].improved).toBe(false);
    });

    it('should match joints by type and side', () => {
      const baseline: SessionROMSummary = {
        ...createMockSummary(100),
        joints: [
          {
            jointType: 'kneeFlexion',
            side: 'left',
            minAngle: 0,
            maxAngle: 100,
            rangeAchieved: 100,
            benchmark: ROM_BENCHMARKS.kneeFlexion,
            assessment: 'normal',
            percentOfNormal: 74,
            feedback: {} as any,
          },
          {
            jointType: 'kneeFlexion',
            side: 'right',
            minAngle: 0,
            maxAngle: 90,
            rangeAchieved: 90,
            benchmark: ROM_BENCHMARKS.kneeFlexion,
            assessment: 'limited',
            percentOfNormal: 67,
            feedback: {} as any,
          },
        ],
      };

      const current: SessionROMSummary = {
        ...createMockSummary(100),
        joints: [
          {
            jointType: 'kneeFlexion',
            side: 'left',
            minAngle: 0,
            maxAngle: 110,
            rangeAchieved: 110,
            benchmark: ROM_BENCHMARKS.kneeFlexion,
            assessment: 'normal',
            percentOfNormal: 81,
            feedback: {} as any,
          },
          {
            jointType: 'kneeFlexion',
            side: 'right',
            minAngle: 0,
            maxAngle: 100,
            rangeAchieved: 100,
            benchmark: ROM_BENCHMARKS.kneeFlexion,
            assessment: 'normal',
            percentOfNormal: 74,
            feedback: {} as any,
          },
        ],
      };

      const comparison = compareROMToBaseline(current, baseline);

      expect(comparison).toHaveLength(2);
      // Both should show improvement
      expect(comparison.every(c => c.improved)).toBe(true);
    });
  });

  describe('romSummaryToAngleData', () => {
    it('should convert ROM summary to AngleData format', () => {
      const summary: SessionROMSummary = {
        exerciseType: 'squat',
        timestamp: Date.now(),
        duration: 300,
        joints: [
          {
            jointType: 'kneeFlexion',
            minAngle: 80,
            maxAngle: 130,
            rangeAchieved: 50,
            benchmark: ROM_BENCHMARKS.kneeFlexion,
            assessment: 'normal',
            percentOfNormal: 37,
            feedback: {} as any,
          },
          {
            jointType: 'hipFlexion',
            minAngle: 60,
            maxAngle: 110,
            rangeAchieved: 50,
            benchmark: ROM_BENCHMARKS.hipFlexion,
            assessment: 'normal',
            percentOfNormal: 42,
            feedback: {} as any,
          },
        ],
        overallMobility: 'normal',
        recommendations: [],
      };

      const angleData = romSummaryToAngleData(summary);

      expect(angleData).toHaveLength(2);
      expect(angleData[0].jointType).toBe('kneeFlexion');
      expect(angleData[0].min).toBe(80);
      expect(angleData[0].max).toBe(130);
      expect(angleData[1].jointType).toBe('hipFlexion');
      expect(angleData[1].min).toBe(60);
      expect(angleData[1].max).toBe(110);
    });
  });

  describe('ROM_BENCHMARKS', () => {
    it('should have all required benchmarks', () => {
      expect(ROM_BENCHMARKS.kneeFlexion).toBeDefined();
      expect(ROM_BENCHMARKS.hipFlexion).toBeDefined();
      expect(ROM_BENCHMARKS.torsoAngle).toBeDefined();
      expect(ROM_BENCHMARKS.ankleAngle).toBeDefined();
    });

    it('should have valid threshold relationships', () => {
      for (const key of Object.keys(ROM_BENCHMARKS)) {
        const benchmark = ROM_BENCHMARKS[key];
        // Limited threshold should be less than hypermobile threshold
        expect(benchmark.limitedThreshold).toBeLessThan(benchmark.hypermobileThreshold);
        // Normal range max should be between limited and hypermobile thresholds
        expect(benchmark.normalRange.max).toBeGreaterThanOrEqual(benchmark.limitedThreshold);
        expect(benchmark.normalRange.max).toBeLessThanOrEqual(benchmark.hypermobileThreshold);
      }
    });

    it('should have bilingual names', () => {
      for (const key of Object.keys(ROM_BENCHMARKS)) {
        const benchmark = ROM_BENCHMARKS[key];
        expect(benchmark.jointName).toBeDefined();
        expect(benchmark.jointNameEn).toBeDefined();
        expect(benchmark.jointName.length).toBeGreaterThan(0);
        expect(benchmark.jointNameEn.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Factory Functions', () => {
    it('createSquatROMTracker should track correct joints', () => {
      const tracker = createSquatROMTracker();
      tracker.startTracking();

      tracker.recordAngle('kneeFlexion', 100);
      tracker.recordAngle('hipFlexion', 90);
      tracker.recordAngle('ankleAngle', 15);
      tracker.recordAngle('elbowAngle', 90); // Should be ignored

      const summary = tracker.getSessionSummary();
      const jointTypes = summary?.joints.map(j => j.jointType) || [];

      expect(jointTypes).toContain('kneeFlexion');
      expect(jointTypes).toContain('hipFlexion');
      expect(jointTypes).toContain('ankleAngle');
      expect(jointTypes).not.toContain('elbowAngle');
    });

    it('createLungeROMTracker should track correct joints', () => {
      const tracker = createLungeROMTracker();
      tracker.startTracking();

      tracker.recordAngle('kneeFlexion', 100);
      tracker.recordAngle('hipFlexion', 90);
      tracker.recordAngle('ankleAngle', 15); // Should be ignored

      const summary = tracker.getSessionSummary();
      const jointTypes = summary?.joints.map(j => j.jointType) || [];

      expect(jointTypes).toContain('kneeFlexion');
      expect(jointTypes).toContain('hipFlexion');
      expect(jointTypes).not.toContain('ankleAngle');
    });

    it('createDeadliftROMTracker should track correct joints', () => {
      const tracker = createDeadliftROMTracker();
      tracker.startTracking();

      tracker.recordAngle('hipFlexion', 90);
      tracker.recordAngle('torsoAngle', 45);
      tracker.recordAngle('kneeFlexion', 100); // Should be ignored

      const summary = tracker.getSessionSummary();
      const jointTypes = summary?.joints.map(j => j.jointType) || [];

      expect(jointTypes).toContain('hipFlexion');
      expect(jointTypes).toContain('torsoAngle');
      expect(jointTypes).not.toContain('kneeFlexion');
    });
  });
});
