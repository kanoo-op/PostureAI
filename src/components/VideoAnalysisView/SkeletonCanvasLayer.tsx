'use client';

import React, { useRef, useEffect } from 'react';
import { drawPose } from '@/utils/drawSkeleton';
import { VIDEO_ANALYSIS_COLORS } from './constants';
import type { Pose3D } from '@/types/pose';
import type { ProblematicJoint } from './types';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';

interface SkeletonCanvasLayerProps {
  pose: Pose3D | null;
  width: number;
  height: number;
  opacity: number;
  showJointAngles: boolean;
  focusModeEnabled: boolean;
  problematicJoints: ProblematicJoint[];
}

// Calculate angle between three points
function calculateAngle(
  p1: { x: number; y: number },
  vertex: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

// Joint angle definitions: [point1Index, vertexIndex, point2Index, label]
const JOINT_ANGLES: [number, number, number, string][] = [
  [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER, BLAZEPOSE_KEYPOINTS.LEFT_ELBOW, BLAZEPOSE_KEYPOINTS.LEFT_WRIST, 'L.Elbow'],
  [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER, BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW, BLAZEPOSE_KEYPOINTS.RIGHT_WRIST, 'R.Elbow'],
  [BLAZEPOSE_KEYPOINTS.LEFT_HIP, BLAZEPOSE_KEYPOINTS.LEFT_KNEE, BLAZEPOSE_KEYPOINTS.LEFT_ANKLE, 'L.Knee'],
  [BLAZEPOSE_KEYPOINTS.RIGHT_HIP, BLAZEPOSE_KEYPOINTS.RIGHT_KNEE, BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE, 'R.Knee'],
  [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER, BLAZEPOSE_KEYPOINTS.LEFT_HIP, BLAZEPOSE_KEYPOINTS.LEFT_KNEE, 'L.Hip'],
  [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER, BLAZEPOSE_KEYPOINTS.RIGHT_HIP, BLAZEPOSE_KEYPOINTS.RIGHT_KNEE, 'R.Hip'],
];

export default function SkeletonCanvasLayer({
  pose,
  width,
  height,
  opacity,
  showJointAngles,
  focusModeEnabled,
  problematicJoints,
}: SkeletonCanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas (transparent for overlay)
    ctx.clearRect(0, 0, width, height);

    if (!pose) return;

    // Set global alpha for skeleton opacity
    ctx.globalAlpha = opacity;

    // Determine skeleton colors based on focus mode
    const problematicIndices = new Set(problematicJoints.map(j => j.jointIndex));

    // Draw skeleton with custom coloring for focus mode
    if (focusModeEnabled && problematicJoints.length > 0) {
      // Draw dimmed skeleton first
      ctx.globalAlpha = opacity * 0.3;
      drawPose(ctx, pose, {
        width,
        height,
        mirrored: false,
        showSkeleton: true,
        showKeypoints: true,
        minKeypointScore: 0.3,
        keypointColor: VIDEO_ANALYSIS_COLORS.textMuted,
        skeletonColor: VIDEO_ANALYSIS_COLORS.textMuted,
        keypointRadius: 4,
        lineWidth: 2,
      });

      // Highlight problematic joints
      ctx.globalAlpha = opacity;
      problematicJoints.forEach((joint) => {
        const keypoint = pose.keypoints[joint.jointIndex];
        if (!keypoint || (keypoint.score ?? 0) < 0.3) return;

        const color = joint.severity === 'error'
          ? VIDEO_ANALYSIS_COLORS.statusError
          : VIDEO_ANALYSIS_COLORS.statusWarning;
        const glowColor = joint.severity === 'error'
          ? VIDEO_ANALYSIS_COLORS.problemJointPulse
          : VIDEO_ANALYSIS_COLORS.statusWarningBg;

        // Draw glow effect
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 16, 0, 2 * Math.PI);
        ctx.fillStyle = glowColor;
        ctx.fill();

        // Draw highlighted joint
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    } else {
      // Normal skeleton drawing
      drawPose(ctx, pose, {
        width,
        height,
        mirrored: false,
        showSkeleton: true,
        showKeypoints: true,
        minKeypointScore: 0.3,
        keypointColor: VIDEO_ANALYSIS_COLORS.skeletonOverlayActive,
        skeletonColor: VIDEO_ANALYSIS_COLORS.skeletonOverlayBase,
        keypointRadius: 6,
        lineWidth: 3,
      });
    }

    // Draw joint angle labels
    if (showJointAngles && pose.keypoints) {
      ctx.globalAlpha = 1; // Full opacity for labels

      JOINT_ANGLES.forEach(([p1Idx, vertexIdx, p2Idx]) => {
        const p1 = pose.keypoints[p1Idx];
        const vertex = pose.keypoints[vertexIdx];
        const p2 = pose.keypoints[p2Idx];

        if (!p1 || !vertex || !p2) return;
        if ((p1.score ?? 0) < 0.3 || (vertex.score ?? 0) < 0.3 || (p2.score ?? 0) < 0.3) return;

        const angle = calculateAngle(p1, vertex, p2);
        const isProblematic = problematicIndices.has(vertexIdx);

        // Position label offset from joint
        const labelX = vertex.x + 15;
        const labelY = vertex.y - 10;

        // Draw label background
        const text = `${angle}\u00B0`;
        ctx.font = 'bold 11px monospace';
        const textMetrics = ctx.measureText(text);
        const padding = 4;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 16;

        ctx.fillStyle = isProblematic && focusModeEnabled
          ? 'rgba(255, 61, 113, 0.9)'
          : 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(labelX - padding, labelY - bgHeight + 4, bgWidth, bgHeight, 3);
        ctx.fill();

        // Draw label text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, labelX, labelY);
      });
    }

    // Reset global alpha
    ctx.globalAlpha = 1;
  }, [pose, width, height, opacity, showJointAngles, focusModeEnabled, problematicJoints]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
