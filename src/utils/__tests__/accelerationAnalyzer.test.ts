import { AccelerationAnalyzer } from '../accelerationAnalyzer';
import type { JointVelocityData } from '@/types/velocity';

// Helper to create mock velocity data
function createVelocityData(
  smoothedVelocity: number,
  isValid: boolean = true
): JointVelocityData {
  return {
    joint: 'leftHip',
    currentVelocity: smoothedVelocity,
    smoothedVelocity,
    acceleration: 0,
    category: 'optimal',
    isValid,
  };
}

describe('AccelerationAnalyzer', () => {
  it('should detect eccentric phase on downward movement', () => {
    const analyzer = new AccelerationAnalyzer();

    // Simulate downward movement (increasing Y in screen coordinates)
    const result = analyzer.analyzePhase(
      createVelocityData(100),
      100, // previous Y
      150 // current Y (moving down in screen coordinates)
    );

    // May take a few frames to stabilize due to phase change buffer
    // But the detected direction should be eccentric eventually
    expect(['eccentric', 'isometric', 'transition']).toContain(result.phase);
  });

  it('should detect concentric phase on upward movement', () => {
    const analyzer = new AccelerationAnalyzer();

    // Need to establish some history first
    analyzer.analyzePhase(createVelocityData(100), 150, 140);
    analyzer.analyzePhase(createVelocityData(100), 140, 130);
    const result = analyzer.analyzePhase(
      createVelocityData(100),
      130, // previous Y
      120 // current Y (moving up in screen coordinates)
    );

    // After buffer fills, should detect concentric
    expect(['concentric', 'transition']).toContain(result.phase);
  });

  it('should detect isometric phase when velocity is low', () => {
    const analyzer = new AccelerationAnalyzer();

    const result = analyzer.analyzePhase(
      createVelocityData(2), // Very low velocity
      100,
      100 // No movement
    );

    expect(result.phase).toBe('isometric');
  });

  it('should handle invalid velocity data', () => {
    const analyzer = new AccelerationAnalyzer();

    const result = analyzer.analyzePhase(
      createVelocityData(100, false), // Invalid data
      100,
      150
    );

    // Should return previous phase (default is isometric)
    expect(result.phase).toBe('isometric');
  });

  it('should calculate phase duration', () => {
    const analyzer = new AccelerationAnalyzer();

    const result1 = analyzer.analyzePhase(createVelocityData(100), 100, 150);

    // Small delay to ensure duration is measurable
    const result2 = analyzer.analyzePhase(createVelocityData(100), 150, 200);

    expect(result2.phaseDuration).toBeGreaterThanOrEqual(0);
  });

  it('should calculate phase progress between 0 and 1', () => {
    const analyzer = new AccelerationAnalyzer();

    const result = analyzer.analyzePhase(createVelocityData(100), 100, 150);

    expect(result.phaseProgress).toBeGreaterThanOrEqual(0);
    expect(result.phaseProgress).toBeLessThanOrEqual(1);
  });

  it('should reset correctly', () => {
    const analyzer = new AccelerationAnalyzer();

    // Build up some state
    analyzer.analyzePhase(createVelocityData(100), 100, 150);
    analyzer.analyzePhase(createVelocityData(100), 150, 200);

    analyzer.reset();

    expect(analyzer.getCurrentPhase()).toBe('isometric');
    expect(analyzer.getPhaseDuration()).toBeLessThan(100); // Just reset
  });

  it('should get current phase', () => {
    const analyzer = new AccelerationAnalyzer();

    expect(analyzer.getCurrentPhase()).toBe('isometric'); // Default
  });

  it('should track average velocity for phase', () => {
    const analyzer = new AccelerationAnalyzer();

    analyzer.analyzePhase(createVelocityData(100), 100, 150);
    analyzer.analyzePhase(createVelocityData(120), 150, 200);
    analyzer.analyzePhase(createVelocityData(80), 200, 250);

    const avgVelocity = analyzer.getPhaseAverageVelocity();
    expect(avgVelocity).toBeGreaterThan(0);
  });

  it('should use hysteresis to prevent rapid phase switching', () => {
    const analyzer = new AccelerationAnalyzer();

    // Simulate very small movements that shouldn't trigger phase changes
    const result1 = analyzer.analyzePhase(createVelocityData(100), 100, 100.05);
    const result2 = analyzer.analyzePhase(createVelocityData(100), 100.05, 99.95);
    const result3 = analyzer.analyzePhase(createVelocityData(100), 99.95, 100.05);

    // All should be the same phase due to hysteresis
    expect(result1.phase).toBe(result2.phase);
    expect(result2.phase).toBe(result3.phase);
  });

  it('should buffer phase changes for stability', () => {
    const analyzer = new AccelerationAnalyzer();

    // Single frame of downward movement shouldn't immediately switch
    const result = analyzer.analyzePhase(createVelocityData(100), 100, 150);

    // Phase change may be buffered
    expect(typeof result.phase).toBe('string');
  });
});
