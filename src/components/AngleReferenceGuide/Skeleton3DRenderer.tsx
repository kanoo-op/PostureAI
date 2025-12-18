'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { KeypointPosition, ViewportControls } from './types';
import { project3DTo2D } from './utils/viewport3D';
import { ANGLE_GUIDE_COLORS } from './colors';
import { SKELETON_CONNECTIONS } from '@/types/pose';

interface Skeleton3DRendererProps {
  idealKeypoints: KeypointPosition[];
  userKeypoints?: KeypointPosition[];
  showOverlay?: boolean;
  controls: ViewportControls;
  width: number;
  height: number;
  className?: string;
}

const Skeleton3DRenderer = forwardRef<HTMLCanvasElement, Skeleton3DRendererProps>(
  function Skeleton3DRenderer(
    {
      idealKeypoints,
      userKeypoints,
      showOverlay = false,
      controls,
      width,
      height,
      className = '',
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);

    const drawGrid = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = ANGLE_GUIDE_COLORS.gridLines;
        ctx.lineWidth = 1;

        const gridSize = 20 * controls.zoom;
        const centerX = width / 2 + controls.panX * width;
        const centerY = height / 2 + controls.panY * height;

        // Vertical lines
        for (let x = centerX % gridSize; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Horizontal lines
        for (let y = centerY % gridSize; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      },
      [controls, width, height]
    );

    const drawAxes = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        const center = { x: width / 2, y: height / 2 };
        const axisLength = 50 * controls.zoom;

        // X axis (red)
        ctx.strokeStyle = ANGLE_GUIDE_COLORS.axisX;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(center.x + axisLength, center.y);
        ctx.stroke();

        // Draw X label
        ctx.fillStyle = ANGLE_GUIDE_COLORS.axisX;
        ctx.font = '10px monospace';
        ctx.fillText('X', center.x + axisLength + 5, center.y + 3);

        // Y axis (green)
        ctx.strokeStyle = ANGLE_GUIDE_COLORS.axisY;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(center.x, center.y - axisLength);
        ctx.stroke();

        // Draw Y label
        ctx.fillStyle = ANGLE_GUIDE_COLORS.axisY;
        ctx.fillText('Y', center.x + 5, center.y - axisLength - 5);

        // Z axis (blue, projected)
        const zEnd = project3DTo2D(
          { index: 0, x: 0.5, y: 0.5, z: 0.3 },
          controls,
          width,
          height
        );
        ctx.strokeStyle = ANGLE_GUIDE_COLORS.axisZ;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(zEnd.x, zEnd.y);
        ctx.stroke();

        // Draw Z label
        ctx.fillStyle = ANGLE_GUIDE_COLORS.axisZ;
        ctx.fillText('Z', zEnd.x + 5, zEnd.y + 3);
      },
      [controls, width, height]
    );

    const drawSkeleton = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        keypoints: KeypointPosition[],
        color: string,
        lineWidth: number
      ) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Project all keypoints to 2D
        const projected = keypoints.map((kp) =>
          project3DTo2D(kp, controls, width, height)
        );

        // Draw connections
        for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
          const start = projected[startIdx];
          const end = projected[endIdx];
          if (!start || !end) continue;

          // Draw with alpha based on depth
          const avgScale = (start.scale + end.scale) / 2;
          ctx.globalAlpha = Math.max(0.3, Math.min(1, avgScale));

          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }

        ctx.globalAlpha = 1;

        // Draw joints
        ctx.fillStyle = color;
        for (const point of projected) {
          const radius = Math.max(2, 4 * point.scale);
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      [controls, width, height]
    );

    const drawDeviationIndicators = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        idealKps: KeypointPosition[],
        userKps: KeypointPosition[]
      ) => {
        // Draw lines connecting corresponding keypoints when showing overlay
        const projectedIdeal = idealKps.map((kp) =>
          project3DTo2D(kp, controls, width, height)
        );
        const projectedUser = userKps.map((kp) =>
          project3DTo2D(kp, controls, width, height)
        );

        ctx.strokeStyle = ANGLE_GUIDE_COLORS.skeletonDeviation;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        for (let i = 0; i < projectedIdeal.length; i++) {
          const ideal = projectedIdeal[i];
          const user = projectedUser[i];
          if (!ideal || !user) continue;

          // Calculate distance
          const dist = Math.sqrt(
            Math.pow(ideal.x - user.x, 2) + Math.pow(ideal.y - user.y, 2)
          );

          // Only show deviation lines for significant differences
          if (dist > 10) {
            ctx.globalAlpha = Math.min(0.8, dist / 50);
            ctx.beginPath();
            ctx.moveTo(ideal.x, ideal.y);
            ctx.lineTo(user.x, user.y);
            ctx.stroke();
          }
        }

        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      },
      [controls, width, height]
    );

    const draw = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, width, height);

        // Draw grid
        drawGrid(ctx);

        // Draw axes
        drawAxes(ctx);

        // Draw ideal skeleton (blue wireframe)
        drawSkeleton(ctx, idealKeypoints, ANGLE_GUIDE_COLORS.skeletonIdeal, 3);

        // Draw user skeleton overlay if enabled
        if (showOverlay && userKeypoints && userKeypoints.length > 0) {
          drawSkeleton(
            ctx,
            userKeypoints,
            ANGLE_GUIDE_COLORS.skeletonUser,
            2
          );

          // Draw deviation indicators
          drawDeviationIndicators(ctx, idealKeypoints, userKeypoints);
        }
      },
      [
        idealKeypoints,
        userKeypoints,
        showOverlay,
        width,
        height,
        drawGrid,
        drawAxes,
        drawSkeleton,
        drawDeviationIndicators,
      ]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animationId: number;
      const animate = () => {
        draw(ctx);
        animationId = requestAnimationFrame(animate);
      };
      animate();

      return () => cancelAnimationFrame(animationId);
    }, [draw]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`${className}`}
        style={{ background: ANGLE_GUIDE_COLORS.background }}
      />
    );
  }
);

export default Skeleton3DRenderer;
