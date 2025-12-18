'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { CLIP_EDITOR_COLORS } from './constants';

interface VideoPreviewCanvasProps {
  videoElement: HTMLVideoElement | null;
  previewTime: number;  // milliseconds
  width?: number;
  height?: number;
  className?: string;
}

export default function VideoPreviewCanvas({
  videoElement,
  previewTime,
  width = 320,
  height = 180,
  className = '',
}: VideoPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx || !videoElement) return;

    // Draw current video frame to canvas
    ctx.drawImage(videoElement, 0, 0, width, height);
  }, [videoElement, width, height]);

  // Seek and draw frame when preview time changes
  useEffect(() => {
    if (!videoElement) return;

    const seekTime = previewTime / 1000;

    // Only seek if significantly different
    if (Math.abs(videoElement.currentTime - seekTime) > 0.033) {
      videoElement.currentTime = seekTime;
    }

    const handleSeeked = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    videoElement.addEventListener('seeked', handleSeeked);

    return () => {
      videoElement.removeEventListener('seeked', handleSeeked);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoElement, previewTime, drawFrame]);

  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{
        backgroundColor: CLIP_EDITOR_COLORS.background,
        border: `1px solid ${CLIP_EDITOR_COLORS.border}`,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />
    </div>
  );
}
