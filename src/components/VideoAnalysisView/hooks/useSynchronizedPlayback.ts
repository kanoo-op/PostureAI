'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { VideoAnalysisResult, FramePoseData } from '@/types/video';
import type { Pose3D } from '@/types/pose';

interface UseSynchronizedPlaybackReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  currentPose: Pose3D | null;
  currentFrameIndex: number;
  totalFrames: number;
  isAtStart: boolean;
  isAtEnd: boolean;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  stepToFrame: (frameIndex: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
}

export function useSynchronizedPlayback(
  analysisResult: VideoAnalysisResult | null
): UseSynchronizedPlaybackReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [currentPose, setCurrentPose] = useState<Pose3D | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Find nearest frame by timestamp (in milliseconds)
  const findNearestFrame = useCallback(
    (timeMs: number): FramePoseData | null => {
      if (!analysisResult?.frames?.length) return null;

      let nearestFrame = analysisResult.frames[0];
      let minDiff = Math.abs(nearestFrame.timestamp - timeMs);
      let nearestIndex = 0;

      for (let i = 0; i < analysisResult.frames.length; i++) {
        const frame = analysisResult.frames[i];
        const diff = Math.abs(frame.timestamp - timeMs);
        if (diff < minDiff) {
          minDiff = diff;
          nearestFrame = frame;
          nearestIndex = i;
        }
      }

      setCurrentFrameIndex(nearestIndex);
      return nearestFrame;
    },
    [analysisResult]
  );

  // Update pose based on current time
  const updatePose = useCallback(() => {
    const timeMs = (videoRef.current?.currentTime || 0) * 1000;
    const frame = findNearestFrame(timeMs);
    if (frame?.pose) {
      setCurrentPose(frame.pose);
    }
  }, [findNearestFrame]);

  // Animation loop for smooth updates
  const startAnimationLoop = useCallback(() => {
    const loop = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        updatePose();
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [updatePose]);

  const stopAnimationLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Playback controls
  const play = useCallback(async () => {
    if (videoRef.current) {
      await videoRef.current.play();
      setIsPlaying(true);
      startAnimationLoop();
    }
  }, [startAnimationLoop]);

  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      stopAnimationLoop();
    }
  }, [stopAnimationLoop]);

  const seek = useCallback(
    (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(time);
        updatePose();
      }
    },
    [duration, updatePose]
  );

  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRateState(rate);
    }
  }, []);

  // Frame stepping controls
  const totalFrames = analysisResult?.frames?.length ?? 0;

  const stepToFrame = useCallback(
    (frameIndex: number) => {
      if (!videoRef.current || !analysisResult?.frames?.length) return;

      const clampedIndex = Math.max(
        0,
        Math.min(frameIndex, analysisResult.frames.length - 1)
      );
      const targetFrame = analysisResult.frames[clampedIndex];
      const targetTime = targetFrame.timestamp / 1000;

      videoRef.current.currentTime = targetTime;
      videoRef.current.pause();
      setCurrentTime(targetTime);
      setIsPlaying(false);
      stopAnimationLoop();
      setCurrentPose(targetFrame.pose);
      setCurrentFrameIndex(clampedIndex);
    },
    [analysisResult, stopAnimationLoop]
  );

  const stepForward = useCallback(() => {
    stepToFrame(currentFrameIndex + 1);
  }, [currentFrameIndex, stepToFrame]);

  const stepBackward = useCallback(() => {
    stepToFrame(currentFrameIndex - 1);
  }, [currentFrameIndex, stepToFrame]);

  const isAtStart = currentFrameIndex === 0;
  const isAtEnd = totalFrames > 0 ? currentFrameIndex === totalFrames - 1 : true;

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      stopAnimationLoop();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      stopAnimationLoop();
    };
  }, [stopAnimationLoop]);

  return {
    videoRef,
    currentTime,
    duration,
    isPlaying,
    playbackRate,
    currentPose,
    currentFrameIndex,
    totalFrames,
    isAtStart,
    isAtEnd,
    play,
    pause,
    seek,
    setPlaybackRate,
    stepToFrame,
    stepForward,
    stepBackward,
  };
}
