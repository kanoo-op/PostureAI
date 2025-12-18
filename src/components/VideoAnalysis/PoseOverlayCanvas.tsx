'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { RECORDING_COLORS, RECORDING_CONFIG } from './constants';
import { drawPose } from '@/utils/drawSkeleton';
import type { Pose3D } from '@/types/pose';

interface PoseOverlayCanvasProps {
  videoElement: HTMLVideoElement | null;
  width: number;
  height: number;
  isActive: boolean;
  mirrored?: boolean;
  className?: string;
}

export default function PoseOverlayCanvas({
  videoElement,
  width,
  height,
  isActive,
  mirrored = true,
  className = '',
}: PoseOverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);
  const detectionIntervalMs = 1000 / RECORDING_CONFIG.poseDetectionFps;

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const initializeDetector = useCallback(async () => {
    if (detectorRef.current) return detectorRef.current;

    try {
      const tf = await import('@tensorflow/tfjs-core');
      await import('@tensorflow/tfjs-backend-webgl');
      await tf.setBackend('webgl');
      await tf.ready();

      const poseDetection = await import('@tensorflow-models/pose-detection');

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        {
          runtime: 'tfjs',
          modelType: 'lite',
          enableSmoothing: true,
        }
      );

      detectorRef.current = detector;
      return detector;
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      return null;
    }
  }, []);

  const runDetection = useCallback(async () => {
    if (!isActive || !videoElement || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const detector = detectorRef.current || await initializeDetector();
    if (!detector) {
      animationRef.current = requestAnimationFrame(runDetection);
      return;
    }

    // Rate limit detection
    const now = performance.now();
    if (now - lastDetectionRef.current < detectionIntervalMs) {
      animationRef.current = requestAnimationFrame(runDetection);
      return;
    }
    lastDetectionRef.current = now;

    try {
      if (videoElement.readyState >= 2) {
        const poses = await detector.estimatePoses(videoElement, {
          flipHorizontal: false,
        });

        const pose = (poses[0] as Pose3D) || null;

        // Draw pose overlay
        drawPose(ctx, pose, {
          width,
          height,
          mirrored,
          showSkeleton: true,
          showKeypoints: true,
          minKeypointScore: 0.3,
          keypointColor: RECORDING_COLORS.poseJoint,
          skeletonColor: RECORDING_COLORS.poseBone,
          keypointRadius: 5,
          lineWidth: 2,
        });
      }
    } catch (error) {
      console.error('Pose detection error:', error);
    }

    animationRef.current = requestAnimationFrame(runDetection);
  }, [isActive, videoElement, width, height, mirrored, initializeDetector, detectionIntervalMs]);

  useEffect(() => {
    if (isActive && videoElement) {
      runDetection();
    } else {
      cleanup();
      // Clear canvas when not active
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
        }
      }
    }

    return () => {
      cleanup();
    };
  }, [isActive, videoElement, runDetection, cleanup, width, height]);

  // Cleanup detector on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, [cleanup]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute top-0 left-0 w-full h-full pointer-events-none ${className}`}
      style={{
        transform: 'none', // No need to mirror - drawPose handles it
      }}
      aria-hidden="true"
    />
  );
}
