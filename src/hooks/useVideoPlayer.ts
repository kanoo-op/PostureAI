'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { VideoPlayerState } from '@/types/video';

interface UseVideoPlayerOptions {
  initialVolume?: number;
  initialPlaybackRate?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
}

export function useVideoPlayer(options: UseVideoPlayerOptions = {}) {
  const {
    initialVolume = 1,
    initialPlaybackRate = 1,
    onTimeUpdate,
    onEnded,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);

  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: initialPlaybackRate,
    isMuted: false,
    volume: initialVolume,
    isBuffering: false,
    hasEnded: false,
  });

  // Play video
  const play = useCallback(async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true, hasEnded: false }));
      } catch (error) {
        console.error('Failed to play video:', error);
      }
    }
  }, []);

  // Pause video
  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (state.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      const clampedTime = Math.max(0, Math.min(time, videoRef.current.duration || 0));
      videoRef.current.currentTime = clampedTime;
      setState(prev => ({ ...prev, currentTime: clampedTime, hasEnded: false }));
    }
  }, []);

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      seek(videoRef.current.currentTime + seconds);
    }
  }, [seek]);

  // Set playback rate
  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      const clampedRate = Math.max(0.25, Math.min(rate, 2));
      videoRef.current.playbackRate = clampedRate;
      setState(prev => ({ ...prev, playbackRate: clampedRate }));
    }
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      const clampedVolume = Math.max(0, Math.min(volume, 1));
      videoRef.current.volume = clampedVolume;
      setState(prev => ({ ...prev, volume: clampedVolume }));
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, []);

  // Reset to beginning
  const reset = useCallback(() => {
    seek(0);
    pause();
    setState(prev => ({ ...prev, hasEnded: false }));
  }, [seek, pause]);

  // Event handlers for video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: video.duration,
        playbackRate: video.playbackRate,
      }));
    };

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: video.currentTime }));
      onTimeUpdate?.(video.currentTime);
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, hasEnded: true }));
      onEnded?.();
    };

    const handleWaiting = () => {
      setState(prev => ({ ...prev, isBuffering: true }));
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isBuffering: false }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onTimeUpdate, onEnded]);

  return {
    videoRef,
    ...state,
    play,
    pause,
    togglePlayPause,
    seek,
    skip,
    setPlaybackRate,
    setVolume,
    toggleMute,
    reset,
  };
}
