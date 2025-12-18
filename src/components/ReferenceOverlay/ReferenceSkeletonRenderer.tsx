'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SKELETON_CONNECTIONS } from '@/types/pose';
import type { ReferenceKeypoint, JointDeviation } from '@/types/referencePose';
import { REFERENCE_OVERLAY_COLORS } from './constants';

interface Props {
  referenceKeypoints: ReferenceKeypoint[];
  deviations?: JointDeviation[];
  width: number;
  height: number;
  opacity: number;
  mirrored?: boolean;
  showDeviations?: boolean;
  criticalJoints?: number[];
}

export default function ReferenceSkeletonRenderer({
  referenceKeypoints,
  deviations = [],
  width,
  height,
  opacity,
  mirrored = true,
  showDeviations = true,
  criticalJoints = [],
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = opacity;

    // Transform for mirroring
    ctx.save();
    if (mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Create deviation map for quick lookup
    const deviationMap = new Map(deviations.map(d => [d.jointIndex, d]));

    // Draw skeleton connections with glow
    ctx.shadowColor = REFERENCE_OVERLAY_COLORS.referenceSkeletonGlow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = REFERENCE_OVERLAY_COLORS.referenceSkeleton;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const startKp = referenceKeypoints[startIdx];
      const endKp = referenceKeypoints[endIdx];

      if (!startKp || !endKp) continue;
      if (startKp.visibility < 0.3 || endKp.visibility < 0.3) continue;

      const startX = startKp.x * width;
      const startY = startKp.y * height;
      const endX = endKp.x * width;
      const endY = endKp.y * height;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Draw keypoints
    ctx.shadowBlur = 0;
    for (let i = 0; i < referenceKeypoints.length; i++) {
      const kp = referenceKeypoints[i];
      if (!kp || kp.visibility < 0.3) continue;

      const x = kp.x * width;
      const y = kp.y * height;
      const isCritical = criticalJoints.includes(i);
      const deviation = deviationMap.get(i);

      // Determine color based on deviation
      let color: string = REFERENCE_OVERLAY_COLORS.referenceSkeleton;
      if (showDeviations && deviation) {
        if (deviation.severity === 'major') {
          color = REFERENCE_OVERLAY_COLORS.deviationMajor;
        } else if (deviation.severity === 'minor') {
          color = REFERENCE_OVERLAY_COLORS.deviationMinor;
        }
      }

      ctx.beginPath();
      ctx.arc(x, y, isCritical ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Draw deviation direction indicator if needed
      if (showDeviations && deviation && deviation.severity !== 'aligned') {
        const lineLength = 20;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x + deviation.direction.x * lineLength,
          y + deviation.direction.y * lineLength
        );
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [referenceKeypoints, deviations, width, height, opacity, mirrored, showDeviations, criticalJoints]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ zIndex: 15 }}
    />
  );
}
