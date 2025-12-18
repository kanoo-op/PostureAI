'use client';

import { useCallback, useMemo } from 'react';
import type { VideoAnalysisResult } from '@/types/video';

interface UseFrameSteppingOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  analysisResult: VideoAnalysisResult | null;
  onTimeUpdate?: (time: number) => void;
}

export function useFrameStepping(options: UseFrameSteppingOptions) {
  const { videoRef, analysisResult, onTimeUpdate } = options;

  // Calculate frame duration from video metadata or analysis config
  const frameDuration = useMemo(() => {
    if (analysisResult?.config?.frameRate) {
      return 1000 / analysisResult.config.frameRate; // ms per frame
    }
    // Default fallback: assume 30fps
    return 1000 / 30;
  }, [analysisResult]);

  // Get current frame index based on video time
  const getCurrentFrameIndex = useCallback(() => {
    if (!videoRef.current || !analysisResult?.frames?.length) return 0;
    const currentTimeMs = videoRef.current.currentTime * 1000;
    // Find nearest frame
    let nearestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < analysisResult.frames.length; i++) {
      const diff = Math.abs(analysisResult.frames[i].timestamp - currentTimeMs);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    }
    return nearestIndex;
  }, [videoRef, analysisResult]);

  // Step to specific frame by index
  const stepToFrame = useCallback(
    (frameIndex: number) => {
      if (!videoRef.current || !analysisResult?.frames?.length) return;

      const clampedIndex = Math.max(
        0,
        Math.min(frameIndex, analysisResult.frames.length - 1)
      );
      const targetFrame = analysisResult.frames[clampedIndex];
      const targetTime = targetFrame.timestamp / 1000; // Convert to seconds

      videoRef.current.currentTime = targetTime;
      videoRef.current.pause(); // Pause when frame stepping
      onTimeUpdate?.(targetTime);
    },
    [videoRef, analysisResult, onTimeUpdate]
  );

  // Step forward one frame
  const stepForward = useCallback(() => {
    const currentIndex = getCurrentFrameIndex();
    stepToFrame(currentIndex + 1);
  }, [getCurrentFrameIndex, stepToFrame]);

  // Step backward one frame
  const stepBackward = useCallback(() => {
    const currentIndex = getCurrentFrameIndex();
    stepToFrame(currentIndex - 1);
  }, [getCurrentFrameIndex, stepToFrame]);

  // Check if at boundaries
  const isAtStart = useMemo(() => {
    if (!analysisResult?.frames?.length) return true;
    return getCurrentFrameIndex() === 0;
  }, [analysisResult, getCurrentFrameIndex]);

  const isAtEnd = useMemo(() => {
    if (!analysisResult?.frames?.length) return true;
    return getCurrentFrameIndex() === analysisResult.frames.length - 1;
  }, [analysisResult, getCurrentFrameIndex]);

  return {
    frameDuration,
    getCurrentFrameIndex,
    stepToFrame,
    stepForward,
    stepBackward,
    isAtStart,
    isAtEnd,
    totalFrames: analysisResult?.frames?.length ?? 0,
  };
}
