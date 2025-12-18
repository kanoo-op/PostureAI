/**
 * Core Velocity Calculation Engine
 * Tracks joint positions and calculates velocity, smoothed velocity, and acceleration
 */

import { CircularBuffer } from './circularBuffer';
import type { Point3D } from './pose3DUtils';
import type {
  PositionSnapshot,
  JointVelocityData,
  TrackedJoint,
  VelocityCategory,
} from '@/types/velocity';

// Configuration
const BUFFER_SIZE = 30; // 1 second at 30fps
const EMA_ALPHA = 0.3; // Smoothing factor (match angleSmoother.ts)
const MIN_SAMPLES_FOR_VELOCITY = 2;
const MIN_CONFIDENCE = 0.5;

export class VelocityTracker {
  private positionHistory: Map<TrackedJoint, CircularBuffer<PositionSnapshot>>;
  private previousSmoothedVelocity: Map<TrackedJoint, number>;
  private previousVelocity: Map<TrackedJoint, number>;

  constructor(joints: TrackedJoint[]) {
    this.positionHistory = new Map();
    this.previousSmoothedVelocity = new Map();
    this.previousVelocity = new Map();

    for (const joint of joints) {
      this.positionHistory.set(joint, new CircularBuffer(BUFFER_SIZE));
      this.previousSmoothedVelocity.set(joint, 0);
      this.previousVelocity.set(joint, 0);
    }
  }

  /**
   * Update position for a joint and calculate velocity
   * @param joint - Joint identifier
   * @param position - Current 3D position
   * @param timestamp - performance.now() timestamp
   * @param confidence - Keypoint confidence score
   */
  updatePosition(
    joint: TrackedJoint,
    position: Point3D,
    timestamp: number,
    confidence: number
  ): JointVelocityData {
    const history = this.positionHistory.get(joint);

    if (!history) {
      return this.createInvalidResult(joint);
    }

    // Check confidence threshold
    if (confidence < MIN_CONFIDENCE) {
      return this.createInvalidResult(joint);
    }

    // Create position snapshot
    const snapshot: PositionSnapshot = {
      x: position.x,
      y: position.y,
      z: position.z,
      timestamp,
      confidence,
    };

    // Get previous position before adding new one
    const previousSnapshot = history.peek();
    history.push(snapshot);

    // Need at least 2 samples for velocity
    if (history.size < MIN_SAMPLES_FOR_VELOCITY || !previousSnapshot) {
      return {
        joint,
        currentVelocity: 0,
        smoothedVelocity: 0,
        acceleration: 0,
        category: 'optimal',
        isValid: false,
      };
    }

    // Calculate raw velocity
    const currentVelocity = this.calculateVelocity(snapshot, previousSnapshot);

    // Apply EMA smoothing
    const smoothedVelocity = this.smoothVelocity(joint, currentVelocity);

    // Calculate acceleration
    const deltaTime = (snapshot.timestamp - previousSnapshot.timestamp) / 1000;
    const acceleration = this.calculateAcceleration(joint, currentVelocity, deltaTime);

    // Classify velocity (default classification - will be overridden by feedback generator)
    const category = this.classifyVelocity(smoothedVelocity);

    return {
      joint,
      currentVelocity,
      smoothedVelocity,
      acceleration,
      category,
      isValid: true,
    };
  }

  /**
   * Calculate 3D velocity between two position snapshots
   * velocity = distance / deltaTime
   */
  private calculateVelocity(
    current: PositionSnapshot,
    previous: PositionSnapshot
  ): number {
    const dist = Math.sqrt(
      Math.pow(current.x - previous.x, 2) +
        Math.pow(current.y - previous.y, 2) +
        Math.pow(current.z - previous.z, 2)
    );
    const deltaTime = (current.timestamp - previous.timestamp) / 1000; // Convert to seconds
    return deltaTime > 0 ? dist / deltaTime : 0;
  }

  /**
   * Apply EMA smoothing to reduce noise
   * smoothed = alpha * current + (1 - alpha) * previous
   */
  private smoothVelocity(joint: TrackedJoint, rawVelocity: number): number {
    const previous = this.previousSmoothedVelocity.get(joint) ?? rawVelocity;
    const smoothed = EMA_ALPHA * rawVelocity + (1 - EMA_ALPHA) * previous;
    this.previousSmoothedVelocity.set(joint, smoothed);
    return smoothed;
  }

  /**
   * Calculate acceleration (velocity derivative)
   */
  private calculateAcceleration(
    joint: TrackedJoint,
    currentVelocity: number,
    deltaTime: number
  ): number {
    const previousVel = this.previousVelocity.get(joint) ?? currentVelocity;
    this.previousVelocity.set(joint, currentVelocity);
    return deltaTime > 0 ? (currentVelocity - previousVel) / deltaTime : 0;
  }

  /**
   * Basic velocity classification (default thresholds)
   */
  private classifyVelocity(velocity: number): VelocityCategory {
    if (velocity < 20) return 'too_slow';
    if (velocity < 50) return 'slow';
    if (velocity < 200) return 'optimal';
    if (velocity < 300) return 'fast';
    return 'too_fast';
  }

  /**
   * Create an invalid result for joints with insufficient data
   */
  private createInvalidResult(joint: TrackedJoint): JointVelocityData {
    return {
      joint,
      currentVelocity: 0,
      smoothedVelocity: 0,
      acceleration: 0,
      category: 'optimal',
      isValid: false,
    };
  }

  /**
   * Reset all history and state
   */
  reset(): void {
    this.positionHistory.forEach((history, joint) => {
      history.clear();
      this.previousSmoothedVelocity.set(joint, 0);
      this.previousVelocity.set(joint, 0);
    });
  }

  /**
   * Get position history for a joint
   */
  getHistory(joint: TrackedJoint): PositionSnapshot[] {
    const history = this.positionHistory.get(joint);
    return history ? history.getLatest() : [];
  }

  /**
   * Get the latest position for a joint
   */
  getLatestPosition(joint: TrackedJoint): PositionSnapshot | undefined {
    const history = this.positionHistory.get(joint);
    return history?.peek();
  }
}
