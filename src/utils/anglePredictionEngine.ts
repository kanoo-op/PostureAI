/**
 * Angle Prediction Engine
 * Predicts form breakdown before it occurs using angular velocity and acceleration
 */

import { CircularBuffer } from './circularBuffer';
import type {
  PredictionConfig,
  PredictedAngle,
  AnglePredictionData,
  PredictedThresholdCrossing,
  PredictiveWarning,
  AnglePredictionResult,
  ThresholdType,
} from '@/types/prediction';
import { DEFAULT_PREDICTION_CONFIG } from '@/types/prediction';
import type { FeedbackLevel } from './squatAnalyzer';

// History buffer size (1 second at 30fps)
const HISTORY_BUFFER_SIZE = 30;

// EMA smoothing factor (match existing angleSmoother.ts)
const EMA_ALPHA = 0.3;

// Angle thresholds for prediction (from squatAnalyzer THRESHOLDS)
const ANGLE_THRESHOLDS: Record<PredictedAngle, { ideal: { min: number; max: number }; acceptable: { min: number; max: number } }> = {
  leftKnee: { ideal: { min: 80, max: 100 }, acceptable: { min: 70, max: 110 } },
  rightKnee: { ideal: { min: 80, max: 100 }, acceptable: { min: 70, max: 110 } },
  leftHip: { ideal: { min: 70, max: 110 }, acceptable: { min: 60, max: 120 } },
  rightHip: { ideal: { min: 70, max: 110 }, acceptable: { min: 60, max: 120 } },
  torso: { ideal: { min: 0, max: 35 }, acceptable: { min: 0, max: 45 } },
  leftAnkle: { ideal: { min: 15, max: 35 }, acceptable: { min: 10, max: 45 } },
  rightAnkle: { ideal: { min: 15, max: 35 }, acceptable: { min: 10, max: 45 } },
};

// Predictive feedback messages in Korean
const PREDICTIVE_MESSAGES: Record<string, { message: string; correction: string }> = {
  'leftKnee_valgus_warning': {
    message: '속도를 줄이세요 - 왼쪽 무릎이 안쪽으로 향하고 있습니다',
    correction: '무릎을 바깥쪽으로 밀어주세요',
  },
  'rightKnee_valgus_warning': {
    message: '속도를 줄이세요 - 오른쪽 무릎이 안쪽으로 향하고 있습니다',
    correction: '무릎을 바깥쪽으로 밀어주세요',
  },
  'leftKnee_overflexion_warning': {
    message: '주의 - 왼쪽 무릎 과굴곡 예상',
    correction: '천천히 속도를 조절하세요',
  },
  'rightKnee_overflexion_warning': {
    message: '주의 - 오른쪽 무릎 과굴곡 예상',
    correction: '천천히 속도를 조절하세요',
  },
  'torso_forward_warning': {
    message: '상체가 앞으로 기울어지고 있습니다',
    correction: '가슴을 펴고 상체를 세워주세요',
  },
  'torso_forward_error': {
    message: '상체 기울기 위험 - 즉시 교정하세요',
    correction: '동작을 멈추고 자세를 바로잡으세요',
  },
  'hip_overflexion_warning': {
    message: '엉덩이 각도가 빠르게 변하고 있습니다',
    correction: '컨트롤을 유지하며 천천히 내려가세요',
  },
  'general_fast_descent': {
    message: '너무 빠릅니다 - 컨트롤을 잃을 수 있습니다',
    correction: '속도를 줄이고 동작을 조절하세요',
  },
};

export class AnglePredictionEngine {
  private config: PredictionConfig;
  private angleHistory: Map<PredictedAngle, CircularBuffer<{ value: number; timestamp: number }>>;
  private previousVelocity: Map<PredictedAngle, number>;
  private smoothedVelocity: Map<PredictedAngle, number>;
  private activeWarnings: Map<string, PredictiveWarning>;
  private lastWarningTime: Map<string, number>;
  private frameCount: number = 0;

  constructor(config: Partial<PredictionConfig> = {}) {
    this.config = { ...DEFAULT_PREDICTION_CONFIG, ...config };
    this.angleHistory = new Map();
    this.previousVelocity = new Map();
    this.smoothedVelocity = new Map();
    this.activeWarnings = new Map();
    this.lastWarningTime = new Map();

    // Initialize history buffers for each angle
    const angles: PredictedAngle[] = ['leftKnee', 'rightKnee', 'leftHip', 'rightHip', 'torso', 'leftAnkle', 'rightAnkle'];
    for (const angle of angles) {
      this.angleHistory.set(angle, new CircularBuffer(HISTORY_BUFFER_SIZE));
      this.previousVelocity.set(angle, 0);
      this.smoothedVelocity.set(angle, 0);
    }
  }

  /**
   * Update prediction with new angle data
   * @param angles - Current angle values
   * @param timestamp - performance.now() timestamp
   * @returns Prediction result with warnings
   */
  predict(
    angles: Partial<Record<PredictedAngle, number>>,
    timestamp: number
  ): AnglePredictionResult {
    const startTime = performance.now();
    this.frameCount++;

    const predictions: Partial<Record<PredictedAngle, AnglePredictionData>> = {};
    const thresholdCrossings: PredictedThresholdCrossing[] = [];
    const newWarnings: PredictiveWarning[] = [];

    // Process each angle
    for (const [angle, value] of Object.entries(angles) as [PredictedAngle, number][]) {
      if (value === undefined) continue;

      // Add to history
      const history = this.angleHistory.get(angle);
      if (!history) continue;
      history.push({ value, timestamp });

      // Calculate prediction
      const predictionData = this.calculatePrediction(angle, value, timestamp);
      predictions[angle] = predictionData;

      // Check for threshold crossings
      if (predictionData.isValid && predictionData.confidence >= this.config.confidenceThreshold) {
        const crossings = this.checkThresholdCrossings(angle, predictionData);
        thresholdCrossings.push(...crossings);
      }
    }

    // Generate warnings from crossings
    for (const crossing of thresholdCrossings) {
      const warning = this.generateWarning(crossing, timestamp);
      if (warning && this.shouldShowWarning(warning, timestamp)) {
        newWarnings.push(warning);
        this.activeWarnings.set(warning.id, warning);
        this.lastWarningTime.set(warning.id, timestamp);
      }
    }

    // Clean up expired warnings
    this.cleanupExpiredWarnings(timestamp);

    // Calculate overall risk level
    const overallRiskLevel = this.calculateOverallRisk(thresholdCrossings);

    // Check performance budget (1ms target)
    const elapsed = performance.now() - startTime;
    if (elapsed > 1) {
      console.warn(`AnglePredictionEngine.predict took ${elapsed.toFixed(2)}ms (budget: 1ms)`);
    }

    return {
      timestamp,
      predictions: predictions as Record<PredictedAngle, AnglePredictionData>,
      thresholdCrossings,
      warnings: Array.from(this.activeWarnings.values()),
      overallRiskLevel,
      isReliable: this.frameCount >= this.config.minSamplesForPrediction,
    };
  }

  /**
   * Calculate predicted angle using velocity and acceleration
   * Formula: predicted = current + (velocity * t) + (0.5 * acceleration * t squared)
   */
  private calculatePrediction(
    angle: PredictedAngle,
    currentValue: number,
    timestamp: number
  ): AnglePredictionData {
    const history = this.angleHistory.get(angle);
    if (!history || history.size < 2) {
      return this.createInvalidPrediction(angle, currentValue, timestamp);
    }

    // Get previous sample for velocity calculation
    const latest = history.getLatest(2);
    if (latest.length < 2) {
      return this.createInvalidPrediction(angle, currentValue, timestamp);
    }

    const [prev, curr] = latest;
    const deltaTime = (curr.timestamp - prev.timestamp) / 1000; // Convert to seconds

    if (deltaTime <= 0) {
      return this.createInvalidPrediction(angle, currentValue, timestamp);
    }

    // Calculate angular velocity (degrees/second)
    const rawVelocity = (curr.value - prev.value) / deltaTime;

    // Apply EMA smoothing
    const prevSmoothed = this.smoothedVelocity.get(angle) ?? rawVelocity;
    const smoothedVel = EMA_ALPHA * rawVelocity + (1 - EMA_ALPHA) * prevSmoothed;
    this.smoothedVelocity.set(angle, smoothedVel);

    // Calculate acceleration
    const prevVel = this.previousVelocity.get(angle) ?? smoothedVel;
    const acceleration = (smoothedVel - prevVel) / deltaTime;
    this.previousVelocity.set(angle, smoothedVel);

    // Predict future angle using kinematic equation
    const lookAheadSec = this.config.lookAheadMs / 1000;
    const predictedValue = currentValue +
      (smoothedVel * lookAheadSec) +
      (0.5 * acceleration * lookAheadSec * lookAheadSec);

    // Calculate confidence based on history consistency
    const confidence = this.calculateConfidence(angle, history.size);

    return {
      angle,
      currentValue,
      angularVelocity: smoothedVel,
      angularAcceleration: acceleration,
      predictedValue,
      confidence,
      timestamp,
      isValid: true,
    };
  }

  /**
   * Check if predicted angle will cross any thresholds
   */
  private checkThresholdCrossings(
    angle: PredictedAngle,
    prediction: AnglePredictionData
  ): PredictedThresholdCrossing[] {
    const crossings: PredictedThresholdCrossing[] = [];
    const thresholds = ANGLE_THRESHOLDS[angle];
    if (!thresholds) return crossings;

    const { currentValue, predictedValue, angularVelocity, confidence } = prediction;
    const lookAheadMs = this.config.lookAheadMs;

    // Check warning threshold (acceptable range)
    // Lower bound
    if (currentValue >= thresholds.acceptable.min && predictedValue < thresholds.acceptable.min) {
      const timeToThreshold = this.calculateTimeToThreshold(
        currentValue, thresholds.acceptable.min, angularVelocity
      );
      crossings.push({
        joint: angle,
        currentAngle: currentValue,
        predictedAngle: predictedValue,
        thresholdType: 'warning',
        thresholdValue: thresholds.acceptable.min,
        crossingDirection: 'entering',
        timeToThreshold,
        confidence,
        riskLevel: 'warning',
      });
    }

    // Upper bound
    if (currentValue <= thresholds.acceptable.max && predictedValue > thresholds.acceptable.max) {
      const timeToThreshold = this.calculateTimeToThreshold(
        currentValue, thresholds.acceptable.max, angularVelocity
      );
      crossings.push({
        joint: angle,
        currentAngle: currentValue,
        predictedAngle: predictedValue,
        thresholdType: 'warning',
        thresholdValue: thresholds.acceptable.max,
        crossingDirection: 'entering',
        timeToThreshold,
        confidence,
        riskLevel: 'warning',
      });
    }

    // Check error threshold (beyond acceptable)
    // For torso angle, upper bound is critical
    if (angle === 'torso' && predictedValue > thresholds.acceptable.max + 10) {
      crossings.push({
        joint: angle,
        currentAngle: currentValue,
        predictedAngle: predictedValue,
        thresholdType: 'error',
        thresholdValue: thresholds.acceptable.max + 10,
        crossingDirection: 'entering',
        timeToThreshold: lookAheadMs * 0.5,
        confidence,
        riskLevel: 'error',
      });
    }

    return crossings;
  }

  /**
   * Calculate time to reach threshold
   */
  private calculateTimeToThreshold(
    current: number,
    threshold: number,
    velocity: number
  ): number {
    if (Math.abs(velocity) < 0.001) return Infinity;
    const distance = threshold - current;
    const timeSeconds = distance / velocity;
    return Math.max(0, timeSeconds * 1000); // Convert to ms
  }

  /**
   * Generate warning from threshold crossing
   */
  private generateWarning(
    crossing: PredictedThresholdCrossing,
    timestamp: number
  ): PredictiveWarning | null {
    const messageKey = this.getMessageKey(crossing);
    const messageData = PREDICTIVE_MESSAGES[messageKey] ?? PREDICTIVE_MESSAGES['general_fast_descent'];

    if (!messageData) return null;

    const urgency = crossing.riskLevel === 'error' ? 'high' :
                   crossing.timeToThreshold < 150 ? 'high' :
                   crossing.timeToThreshold < 250 ? 'medium' : 'low';

    return {
      id: `${crossing.joint}_${crossing.thresholdType}_${Math.floor(timestamp / 500)}`,
      joint: crossing.joint,
      message: messageData.message,
      correction: messageData.correction,
      urgency,
      timeToIssue: crossing.timeToThreshold,
      confidence: crossing.confidence,
      timestamp,
      expiresAt: timestamp + 1000, // Warning lasts 1 second
    };
  }

  /**
   * Get message key based on crossing type
   */
  private getMessageKey(crossing: PredictedThresholdCrossing): string {
    const { joint, thresholdType, predictedAngle, thresholdValue } = crossing;

    if (joint === 'torso') {
      return thresholdType === 'error' ? 'torso_forward_error' : 'torso_forward_warning';
    }

    if (joint.includes('Knee')) {
      if (predictedAngle < thresholdValue) {
        return `${joint}_overflexion_warning`;
      }
      return `${joint}_valgus_warning`;
    }

    if (joint.includes('Hip')) {
      return 'hip_overflexion_warning';
    }

    return 'general_fast_descent';
  }

  /**
   * Check hysteresis to prevent rapid warning toggling
   */
  private shouldShowWarning(warning: PredictiveWarning, timestamp: number): boolean {
    const lastTime = this.lastWarningTime.get(warning.id);
    if (!lastTime) return true;
    return (timestamp - lastTime) >= this.config.hysteresisMs;
  }

  /**
   * Remove expired warnings
   */
  private cleanupExpiredWarnings(timestamp: number): void {
    const toDelete: string[] = [];
    this.activeWarnings.forEach((warning, id) => {
      if (timestamp > warning.expiresAt) {
        toDelete.push(id);
      }
    });
    toDelete.forEach(id => this.activeWarnings.delete(id));
  }

  /**
   * Calculate confidence based on data quality
   */
  private calculateConfidence(angle: PredictedAngle, historySize: number): number {
    // Base confidence on history size
    const historyConfidence = Math.min(historySize / 10, 1);

    // Higher confidence when velocity is consistent
    const velocity = this.smoothedVelocity.get(angle) ?? 0;
    const prevVelocity = this.previousVelocity.get(angle) ?? 0;
    const velocityStability = 1 - Math.min(Math.abs(velocity - prevVelocity) / 100, 0.5);

    return historyConfidence * velocityStability;
  }

  /**
   * Calculate overall risk from all crossings
   */
  private calculateOverallRisk(crossings: PredictedThresholdCrossing[]): FeedbackLevel {
    if (crossings.some(c => c.riskLevel === 'error')) return 'error';
    if (crossings.some(c => c.riskLevel === 'warning')) return 'warning';
    return 'good';
  }

  /**
   * Create invalid prediction result
   */
  private createInvalidPrediction(
    angle: PredictedAngle,
    currentValue: number,
    timestamp: number
  ): AnglePredictionData {
    return {
      angle,
      currentValue,
      angularVelocity: 0,
      angularAcceleration: 0,
      predictedValue: currentValue,
      confidence: 0,
      timestamp,
      isValid: false,
    };
  }

  /**
   * Reset all prediction state
   */
  reset(): void {
    this.angleHistory.forEach(history => history.clear());
    this.previousVelocity.clear();
    this.smoothedVelocity.clear();
    this.activeWarnings.clear();
    this.lastWarningTime.clear();
    this.frameCount = 0;
  }

  /**
   * Get current active warnings
   */
  getActiveWarnings(): PredictiveWarning[] {
    return Array.from(this.activeWarnings.values());
  }
}
