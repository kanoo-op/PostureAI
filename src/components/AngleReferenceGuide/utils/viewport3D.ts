import { KeypointPosition, ViewportControls } from '../types';

// Project 3D point to 2D canvas coordinates
export function project3DTo2D(
  point: KeypointPosition,
  controls: ViewportControls,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; scale: number } {
  const cosX = Math.cos(controls.rotationX);
  const sinX = Math.sin(controls.rotationX);
  const cosY = Math.cos(controls.rotationY);
  const sinY = Math.sin(controls.rotationY);

  // Center the point coordinates around 0
  const centeredX = point.x - 0.5;
  const centeredY = point.y - 0.5;
  const centeredZ = point.z;

  // Rotate around Y axis (horizontal rotation)
  let x = centeredX * cosY - centeredZ * sinY;
  let z = centeredX * sinY + centeredZ * cosY;
  let y = centeredY;

  // Rotate around X axis (vertical rotation)
  const newY = y * cosX - z * sinX;
  const newZ = y * sinX + z * cosX;

  // Perspective projection
  const perspective = 1 + newZ * 0.3;
  const scale = controls.zoom / perspective;

  // Map to canvas coordinates with pan
  const screenX = (x * scale + 0.5 + controls.panX) * canvasWidth;
  const screenY = (newY * scale + 0.5 + controls.panY) * canvasHeight;

  return { x: screenX, y: screenY, scale };
}

// Interpolate between two keypoint positions (for animation)
export function interpolateKeypoints(
  from: KeypointPosition[],
  to: KeypointPosition[],
  t: number // 0 to 1
): KeypointPosition[] {
  return from.map((fromPoint, index) => {
    const toPoint = to[index];
    if (!toPoint) {
      return fromPoint;
    }
    return {
      index: fromPoint.index,
      x: fromPoint.x + (toPoint.x - fromPoint.x) * t,
      y: fromPoint.y + (toPoint.y - fromPoint.y) * t,
      z: fromPoint.z + (toPoint.z - fromPoint.z) * t,
    };
  });
}

// Easing function for smooth animations
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Calculate the bounding box of projected keypoints
export function calculateBoundingBox(
  keypoints: KeypointPosition[],
  controls: ViewportControls,
  canvasWidth: number,
  canvasHeight: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const kp of keypoints) {
    const projected = project3DTo2D(kp, controls, canvasWidth, canvasHeight);
    minX = Math.min(minX, projected.x);
    minY = Math.min(minY, projected.y);
    maxX = Math.max(maxX, projected.x);
    maxY = Math.max(maxY, projected.y);
  }

  return { minX, minY, maxX, maxY };
}

// Get depth-sorted indices for proper rendering order
export function getDepthSortedIndices(
  keypoints: KeypointPosition[],
  controls: ViewportControls
): number[] {
  const cosX = Math.cos(controls.rotationX);
  const sinX = Math.sin(controls.rotationX);
  const cosY = Math.cos(controls.rotationY);
  const sinY = Math.sin(controls.rotationY);

  const depths: { index: number; z: number }[] = keypoints.map((kp, idx) => {
    const centeredX = kp.x - 0.5;
    const centeredZ = kp.z;
    const centeredY = kp.y - 0.5;

    // Apply rotation to get final Z depth
    const rotatedZ = centeredX * sinY + centeredZ * cosY;
    const finalZ = centeredY * sinX + rotatedZ * cosX;

    return { index: idx, z: finalZ };
  });

  // Sort by Z depth (furthest first for proper occlusion)
  depths.sort((a, b) => a.z - b.z);

  return depths.map((d) => d.index);
}
