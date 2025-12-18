'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { TIMELINE_COLORS } from './constants';
import { SKELETON_CONNECTIONS } from '@/types/pose';
import type { Keypoint3D } from '@/types/pose';

interface PosePreviewPanelProps {
  keypoints: Keypoint3D[] | null;
  timestamp: number;
  confidence: number;
  width?: number;
  height?: number;
  className?: string;
}

export default function PosePreviewPanel({
  keypoints,
  timestamp,
  confidence,
  width = 120,
  height = 160,
  className = '',
}: PosePreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Format timestamp for display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  // Draw skeleton on canvas
  const drawSkeleton = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);

    if (!keypoints || keypoints.length === 0) {
      // Draw placeholder
      ctx.fillStyle = TIMELINE_COLORS.textMuted;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No pose', width / 2, height / 2);
      return;
    }

    // Find bounds of keypoints
    const validKeypoints = keypoints.filter(kp => (kp.score ?? 0) > 0.3);
    if (validKeypoints.length === 0) return;

    const minX = Math.min(...validKeypoints.map(kp => kp.x));
    const maxX = Math.max(...validKeypoints.map(kp => kp.x));
    const minY = Math.min(...validKeypoints.map(kp => kp.y));
    const maxY = Math.max(...validKeypoints.map(kp => kp.y));

    // Calculate scale to fit in preview
    const padding = 10;
    const scaleX = (width - padding * 2) / (maxX - minX || 1);
    const scaleY = (height - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    // Transform function
    const transform = (kp: Keypoint3D): { x: number; y: number } => ({
      x: (kp.x - minX) * scale + padding,
      y: (kp.y - minY) * scale + padding,
    });

    // Draw connections
    ctx.strokeStyle = TIMELINE_COLORS.poseSkeleton;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const startKp = keypoints[startIdx];
      const endKp = keypoints[endIdx];

      if (!startKp || !endKp) continue;
      if ((startKp.score ?? 0) < 0.3 || (endKp.score ?? 0) < 0.3) continue;

      const start = transform(startKp);
      const end = transform(endKp);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    // Draw joints
    for (const kp of keypoints) {
      if ((kp.score ?? 0) < 0.3) continue;

      const pos = transform(kp);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = TIMELINE_COLORS.poseJoint;
      ctx.fill();
    }
  }, [keypoints, width, height]);

  // Redraw when keypoints change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Request animation frame for smooth rendering < 50ms
    requestAnimationFrame(() => drawSkeleton(ctx));
  }, [drawSkeleton]);

  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ backgroundColor: TIMELINE_COLORS.backgroundElevated }}
    >
      {/* Canvas for skeleton */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />

      {/* Info footer */}
      <div
        className="px-2 py-1 flex items-center justify-between text-xs"
        style={{ backgroundColor: TIMELINE_COLORS.surface }}
      >
        <span style={{ color: TIMELINE_COLORS.textSecondary }}>
          {formatTime(timestamp)}
        </span>
        <span
          style={{
            color: confidence > 0.7
              ? TIMELINE_COLORS.success
              : confidence > 0.4
              ? TIMELINE_COLORS.warning
              : TIMELINE_COLORS.error,
          }}
        >
          {Math.round(confidence * 100)}%
        </span>
      </div>
    </div>
  );
}
