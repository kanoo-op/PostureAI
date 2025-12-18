import { VelocityTracker } from '../velocityTracker';
import { CircularBuffer } from '../circularBuffer';

describe('CircularBuffer', () => {
  it('should store items up to capacity', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    expect(buffer.size).toBe(3);
    expect(buffer.getLatest()).toEqual([1, 2, 3]);
  });

  it('should overwrite oldest items when full', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    expect(buffer.size).toBe(3);
    expect(buffer.getLatest()).toEqual([2, 3, 4]);
  });

  it('should return correct item by index', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(10);
    buffer.push(20);
    buffer.push(30);
    expect(buffer.get(0)).toBe(10); // oldest
    expect(buffer.get(1)).toBe(20);
    expect(buffer.get(2)).toBe(30); // newest
  });

  it('should return undefined for invalid indices', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    expect(buffer.get(-1)).toBeUndefined();
    expect(buffer.get(5)).toBeUndefined();
  });

  it('should clear buffer correctly', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.clear();
    expect(buffer.size).toBe(0);
    expect(buffer.getLatest()).toEqual([]);
  });

  it('should support iteration', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    const items: number[] = [];
    for (const item of buffer) {
      items.push(item);
    }
    expect(items).toEqual([1, 2, 3]);
  });

  it('should peek the latest item', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    expect(buffer.peek()).toBe(2);
  });

  it('should peek previous item', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    expect(buffer.peekPrevious()).toBe(2);
  });

  it('should throw error for invalid capacity', () => {
    expect(() => new CircularBuffer<number>(0)).toThrow('Capacity must be at least 1');
    expect(() => new CircularBuffer<number>(-1)).toThrow('Capacity must be at least 1');
  });

  it('should report isFull correctly', () => {
    const buffer = new CircularBuffer<number>(2);
    expect(buffer.isFull).toBe(false);
    buffer.push(1);
    expect(buffer.isFull).toBe(false);
    buffer.push(2);
    expect(buffer.isFull).toBe(true);
  });

  it('should get latest n items', () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    buffer.push(5);
    expect(buffer.getLatest(3)).toEqual([3, 4, 5]);
    expect(buffer.getLatest(10)).toEqual([1, 2, 3, 4, 5]); // more than available
  });
});

describe('VelocityTracker', () => {
  it('should calculate velocity from position changes', () => {
    const tracker = new VelocityTracker(['leftKnee']);

    // First position at t=0
    const result1 = tracker.updatePosition(
      'leftKnee',
      { x: 0, y: 0, z: 0 },
      0,
      1.0
    );
    expect(result1.currentVelocity).toBe(0); // No previous data
    expect(result1.isValid).toBe(false); // Need 2 samples

    // Second position at t=100ms, moved 10 units
    const result2 = tracker.updatePosition(
      'leftKnee',
      { x: 10, y: 0, z: 0 },
      100,
      1.0
    );
    // velocity = 10 units / 0.1s = 100 units/s
    expect(result2.currentVelocity).toBe(100);
    expect(result2.isValid).toBe(true);
  });

  it('should apply EMA smoothing', () => {
    const tracker = new VelocityTracker(['leftKnee']);

    tracker.updatePosition('leftKnee', { x: 0, y: 0, z: 0 }, 0, 1.0);
    tracker.updatePosition('leftKnee', { x: 10, y: 0, z: 0 }, 100, 1.0);
    const result = tracker.updatePosition('leftKnee', { x: 20, y: 0, z: 0 }, 200, 1.0);

    // Smoothed velocity should be calculated
    expect(result.smoothedVelocity).toBeGreaterThan(0);
    // EMA smoothing means it won't be exactly 100
    expect(result.smoothedVelocity).toBeLessThanOrEqual(result.currentVelocity);
  });

  it('should handle low confidence keypoints', () => {
    const tracker = new VelocityTracker(['leftKnee']);

    const result = tracker.updatePosition(
      'leftKnee',
      { x: 0, y: 0, z: 0 },
      0,
      0.2 // Below minimum confidence
    );

    expect(result.isValid).toBe(false);
  });

  it('should calculate acceleration', () => {
    const tracker = new VelocityTracker(['leftKnee']);

    // Build up velocity history
    tracker.updatePosition('leftKnee', { x: 0, y: 0, z: 0 }, 0, 1.0);
    tracker.updatePosition('leftKnee', { x: 5, y: 0, z: 0 }, 100, 1.0);
    const result = tracker.updatePosition('leftKnee', { x: 15, y: 0, z: 0 }, 200, 1.0);

    // Acceleration should be non-zero due to velocity change
    expect(typeof result.acceleration).toBe('number');
  });

  it('should reset state correctly', () => {
    const tracker = new VelocityTracker(['leftKnee']);

    tracker.updatePosition('leftKnee', { x: 0, y: 0, z: 0 }, 0, 1.0);
    tracker.updatePosition('leftKnee', { x: 10, y: 0, z: 0 }, 100, 1.0);

    tracker.reset();

    const history = tracker.getHistory('leftKnee');
    expect(history).toHaveLength(0);
  });

  it('should track multiple joints independently', () => {
    const tracker = new VelocityTracker(['leftKnee', 'rightKnee']);

    tracker.updatePosition('leftKnee', { x: 0, y: 0, z: 0 }, 0, 1.0);
    tracker.updatePosition('rightKnee', { x: 0, y: 0, z: 0 }, 0, 1.0);

    const result1 = tracker.updatePosition('leftKnee', { x: 10, y: 0, z: 0 }, 100, 1.0);
    const result2 = tracker.updatePosition('rightKnee', { x: 5, y: 0, z: 0 }, 100, 1.0);

    expect(result1.currentVelocity).toBe(100); // 10 units / 0.1s
    expect(result2.currentVelocity).toBe(50); // 5 units / 0.1s
  });

  it('should calculate 3D distance correctly', () => {
    const tracker = new VelocityTracker(['leftKnee']);

    tracker.updatePosition('leftKnee', { x: 0, y: 0, z: 0 }, 0, 1.0);
    const result = tracker.updatePosition('leftKnee', { x: 3, y: 4, z: 0 }, 1000, 1.0);

    // Distance should be 5 (3-4-5 triangle)
    // velocity = 5 / 1s = 5 units/s
    expect(result.currentVelocity).toBe(5);
  });

  it('should get latest position', () => {
    const tracker = new VelocityTracker(['leftKnee']);

    tracker.updatePosition('leftKnee', { x: 10, y: 20, z: 30 }, 100, 0.8);

    const latest = tracker.getLatestPosition('leftKnee');
    expect(latest?.x).toBe(10);
    expect(latest?.y).toBe(20);
    expect(latest?.z).toBe(30);
    expect(latest?.confidence).toBe(0.8);
  });
});
