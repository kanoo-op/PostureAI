import { AnglePredictionEngine } from '../anglePredictionEngine';
import type { PredictedAngle } from '@/types/prediction';

describe('AnglePredictionEngine', () => {
  let engine: AnglePredictionEngine;

  beforeEach(() => {
    engine = new AnglePredictionEngine({
      lookAheadMs: 300,
      confidenceThreshold: 0.7,
      hysteresisMs: 100,
      minSamplesForPrediction: 5,
    });
  });

  afterEach(() => {
    engine.reset();
  });

  describe('Stationary angles', () => {
    it('should predict same angle when stationary', () => {
      const angles: Partial<Record<PredictedAngle, number>> = {
        leftKnee: 90,
        rightKnee: 90,
      };

      // Feed several frames with same angle
      for (let i = 0; i < 10; i++) {
        engine.predict(angles, 1000 + i * 33);
      }

      const result = engine.predict(angles, 1330);

      expect(result.predictions.leftKnee.predictedValue).toBeCloseTo(90, 1);
      expect(result.thresholdCrossings.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Controlled fast movement', () => {
    it('should detect approaching threshold during controlled descent', () => {
      const timestamps = [1000, 1033, 1066, 1099, 1132, 1165, 1198];
      const kneeAngles = [160, 150, 135, 120, 105, 90, 78];

      let result;
      for (let i = 0; i < timestamps.length; i++) {
        result = engine.predict(
          { leftKnee: kneeAngles[i] },
          timestamps[i]
        );
      }

      expect(result!.isReliable).toBe(true);
      expect(result!.predictions.leftKnee.angularVelocity).toBeLessThan(0);
    });
  });

  describe('Loss of control detection', () => {
    it('should generate warning when angle changes too rapidly', () => {
      const timestamps = [1000, 1033, 1066, 1099, 1132];
      const torsoAngles = [10, 20, 35, 50, 60];

      let result;
      for (let i = 0; i < timestamps.length; i++) {
        result = engine.predict(
          { torso: torsoAngles[i] },
          timestamps[i]
        );
      }

      expect(result!.thresholdCrossings.length).toBeGreaterThan(0);
      expect(result!.overallRiskLevel).not.toBe('good');
    });
  });

  describe('Confidence calculation', () => {
    it('should have low confidence with insufficient history', () => {
      const result = engine.predict({ leftKnee: 90 }, 1000);
      expect(result.predictions.leftKnee.confidence).toBeLessThan(0.7);
      expect(result.isReliable).toBe(false);
    });

    it('should increase confidence with more history', () => {
      for (let i = 0; i < 10; i++) {
        engine.predict({ leftKnee: 90 }, 1000 + i * 33);
      }

      const result = engine.predict({ leftKnee: 90 }, 1330);
      expect(result.predictions.leftKnee.confidence).toBeGreaterThan(0.5);
      expect(result.isReliable).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete prediction within 1ms', () => {
      for (let i = 0; i < 30; i++) {
        engine.predict(
          {
            leftKnee: 90 + Math.sin(i * 0.1) * 10,
            rightKnee: 90 + Math.sin(i * 0.1) * 10,
            torso: 20 + Math.sin(i * 0.1) * 5,
          },
          1000 + i * 33
        );
      }

      const start = performance.now();
      engine.predict(
        {
          leftKnee: 95,
          rightKnee: 95,
          leftHip: 85,
          rightHip: 85,
          torso: 25,
          leftAnkle: 25,
          rightAnkle: 25,
        },
        2000
      );
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1);
    });
  });

  describe('Reset functionality', () => {
    it('should clear all state on reset', () => {
      for (let i = 0; i < 10; i++) {
        engine.predict({ leftKnee: 90 }, 1000 + i * 33);
      }

      engine.reset();

      const result = engine.predict({ leftKnee: 90 }, 2000);
      expect(result.isReliable).toBe(false);
      expect(result.warnings.length).toBe(0);
    });
  });
});
