import {
  calculateAngularVelocity,
  smoothAngularVelocity,
  classifyMovementQuality,
  determineVelocityContext,
  calculateTempoAwareThresholds,
  assessVelocityCorrelatedRisk,
  createIntegratedAnalyzerState,
  analyzeIntegrated,
} from '../integratedVelocityAngleAnalyzer';

describe('integratedVelocityAngleAnalyzer', () => {
  describe('calculateAngularVelocity', () => {
    it('should calculate angular velocity in degrees per second', () => {
      expect(calculateAngularVelocity(90, 100, 100)).toBeCloseTo(100);
    });

    it('should return 0 for zero delta time', () => {
      expect(calculateAngularVelocity(90, 100, 0)).toBe(0);
    });

    it('should handle negative angle changes', () => {
      expect(calculateAngularVelocity(100, 90, 100)).toBeCloseTo(100);
    });

    it('should return 0 for negative delta time', () => {
      expect(calculateAngularVelocity(90, 100, -10)).toBe(0);
    });

    it('should handle same angles', () => {
      expect(calculateAngularVelocity(90, 90, 100)).toBe(0);
    });
  });

  describe('smoothAngularVelocity', () => {
    it('should apply EMA smoothing', () => {
      // With EMA_ALPHA = 0.3: smoothed = 0.3 * current + 0.7 * previous
      const result = smoothAngularVelocity(100, 50);
      expect(result).toBeCloseTo(0.3 * 100 + 0.7 * 50);
    });

    it('should return current velocity when previous is 0', () => {
      const result = smoothAngularVelocity(100, 0);
      expect(result).toBeCloseTo(30); // 0.3 * 100
    });

    it('should return previous smoothed when current is 0', () => {
      const result = smoothAngularVelocity(0, 100);
      expect(result).toBeCloseTo(70); // 0.7 * 100
    });
  });

  describe('classifyMovementQuality', () => {
    it('should classify slow movements as controlled', () => {
      expect(classifyMovementQuality(30)).toBe('controlled');
      expect(classifyMovementQuality(60)).toBe('controlled');
    });

    it('should classify medium speed as moderate', () => {
      expect(classifyMovementQuality(90)).toBe('moderate');
      expect(classifyMovementQuality(120)).toBe('moderate');
    });

    it('should classify fast movements as rushed', () => {
      expect(classifyMovementQuality(150)).toBe('rushed');
      expect(classifyMovementQuality(200)).toBe('rushed');
    });

    it('should classify 0 velocity as controlled', () => {
      expect(classifyMovementQuality(0)).toBe('controlled');
    });
  });

  describe('determineVelocityContext', () => {
    const thresholds = { optimal: { min: 80, max: 150 } };

    it('should return high_velocity when above threshold', () => {
      expect(determineVelocityContext(250, thresholds)).toBe('high_velocity'); // > 150 * 1.5 = 225
    });

    it('should return low_velocity when below threshold', () => {
      expect(determineVelocityContext(30, thresholds)).toBe('low_velocity'); // < 80 * 0.5 = 40
    });

    it('should return optimal_velocity when within range', () => {
      expect(determineVelocityContext(100, thresholds)).toBe('optimal_velocity');
    });
  });

  describe('calculateTempoAwareThresholds', () => {
    it('should return strict thresholds for controlled eccentric', () => {
      const result = calculateTempoAwareThresholds('controlled', 'eccentric');
      expect(result.mode).toBe('strict');
      expect(result.strictnessMultiplier).toBe(0.8);
    });

    it('should return lenient thresholds for rushed concentric', () => {
      const result = calculateTempoAwareThresholds('rushed', 'concentric');
      expect(result.mode).toBe('lenient');
      expect(result.strictnessMultiplier).toBe(1.2);
    });

    it('should return normal thresholds by default', () => {
      const result = calculateTempoAwareThresholds('moderate', 'isometric');
      expect(result.mode).toBe('normal');
      expect(result.strictnessMultiplier).toBe(1.0);
    });

    it('should return normal thresholds for controlled concentric', () => {
      const result = calculateTempoAwareThresholds('controlled', 'concentric');
      expect(result.mode).toBe('normal');
      expect(result.strictnessMultiplier).toBe(1.0);
    });

    it('should return normal thresholds for rushed eccentric', () => {
      const result = calculateTempoAwareThresholds('rushed', 'eccentric');
      expect(result.mode).toBe('normal');
      expect(result.strictnessMultiplier).toBe(1.0);
    });
  });

  describe('assessVelocityCorrelatedRisk', () => {
    it('should escalate warning to error at high velocity', () => {
      const result = assessVelocityCorrelatedRisk(
        'knee_valgus',
        'warning',
        'high_velocity',
        150
      );
      expect(result.baseRiskLevel).toBe('warning');
      expect(result.velocityAdjustedLevel).toBe('error');
    });

    it('should not escalate good status', () => {
      const result = assessVelocityCorrelatedRisk(
        'knee_valgus',
        'good',
        'high_velocity',
        150
      );
      expect(result.velocityAdjustedLevel).toBe('good');
    });

    it('should escalate to error at very high angular velocity', () => {
      const result = assessVelocityCorrelatedRisk(
        'spine_rounding',
        'warning',
        'optimal_velocity',
        200 // Above 120 threshold
      );
      expect(result.velocityAdjustedLevel).toBe('error');
      expect(result.confidence).toBe(0.95);
    });

    it('should keep warning at normal velocity', () => {
      const result = assessVelocityCorrelatedRisk(
        'asymmetry',
        'warning',
        'optimal_velocity',
        60
      );
      expect(result.velocityAdjustedLevel).toBe('warning');
      expect(result.confidence).toBe(0.8);
    });

    it('should handle null velocity context', () => {
      const result = assessVelocityCorrelatedRisk(
        'general',
        'warning',
        null,
        60
      );
      expect(result.velocityAdjustedLevel).toBe('warning');
    });
  });

  describe('createIntegratedAnalyzerState', () => {
    it('should create initial state with correct defaults', () => {
      const state = createIntegratedAnalyzerState();
      expect(state.previousAngles).toEqual({});
      expect(state.previousTimestamp).toBe(0);
      expect(state.angularVelocityHistory).toEqual({});
      expect(state.qualityHistory).toEqual([]);
      expect(state.frameCount).toBe(0);
    });
  });

  describe('analyzeIntegrated', () => {
    it('should calculate movement quality from angles', () => {
      const state = createIntegratedAnalyzerState();
      const currentAngles = { leftKnee: 90, rightKnee: 90 };
      const jointVelocities = {};

      const { result, newState } = analyzeIntegrated(
        currentAngles,
        jointVelocities as Record<string, any>,
        1000,
        'eccentric',
        state
      );

      expect(result.movementQuality).toBeDefined();
      expect(newState.frameCount).toBe(1);
    });

    it('should track angular velocity history', () => {
      let state = createIntegratedAnalyzerState();

      const result1 = analyzeIntegrated(
        { leftKnee: 90 },
        {} as Record<string, any>,
        1000,
        'eccentric',
        state
      );
      state = result1.newState;

      const result2 = analyzeIntegrated(
        { leftKnee: 100 },
        {} as Record<string, any>,
        1033,
        'eccentric',
        state
      );

      expect(result2.result.angularVelocities.leftKnee.angularVelocity).toBeGreaterThan(0);
    });

    it('should update previous angles in state', () => {
      const state = createIntegratedAnalyzerState();
      const currentAngles = { leftKnee: 90, rightKnee: 85 };

      const { newState } = analyzeIntegrated(
        currentAngles,
        {} as Record<string, any>,
        1000,
        'concentric',
        state
      );

      expect(newState.previousAngles).toEqual(currentAngles);
    });

    it('should track quality history', () => {
      let state = createIntegratedAnalyzerState();

      for (let i = 0; i < 5; i++) {
        const { newState } = analyzeIntegrated(
          { leftKnee: 90 + i },
          {} as Record<string, any>,
          1000 + i * 33,
          'eccentric',
          state
        );
        state = newState;
      }

      expect(state.qualityHistory.length).toBe(5);
    });

    it('should determine velocity category from joint velocities', () => {
      const state = createIntegratedAnalyzerState();
      const jointVelocities = {
        leftHip: { smoothedVelocity: 250, isValid: true } as any,
        rightHip: { smoothedVelocity: 250, isValid: true } as any,
      };

      const { result } = analyzeIntegrated(
        { leftKnee: 90 },
        jointVelocities,
        1000,
        'concentric',
        state
      );

      expect(result.overallVelocityCategory).toBe('fast');
    });

    it('should return correct phase', () => {
      const state = createIntegratedAnalyzerState();

      const { result } = analyzeIntegrated(
        { leftKnee: 90 },
        {} as Record<string, any>,
        1000,
        'isometric',
        state
      );

      expect(result.phase).toBe('isometric');
    });

    it('should handle empty angles', () => {
      const state = createIntegratedAnalyzerState();

      const { result } = analyzeIntegrated(
        {},
        {} as Record<string, any>,
        1000,
        'eccentric',
        state
      );

      expect(result.movementQuality).toBe('controlled'); // 0 velocity = controlled
      expect(Object.keys(result.angularVelocities)).toHaveLength(0);
    });

    it('should limit quality history to 30 entries', () => {
      let state = createIntegratedAnalyzerState();
      state.qualityHistory = new Array(30).fill('controlled');

      const { newState } = analyzeIntegrated(
        { leftKnee: 90 },
        {} as Record<string, any>,
        1000,
        'eccentric',
        state
      );

      expect(newState.qualityHistory.length).toBe(30);
    });
  });
});
