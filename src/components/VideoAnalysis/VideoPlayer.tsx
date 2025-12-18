'use client';

import React, { forwardRef, useImperativeHandle } from 'react';
import { VIDEO_COLORS, PLAYBACK_RATES } from './constants';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { formatDuration } from '@/utils/videoProcessingUtils';
import LoadingSpinner from './LoadingSpinner';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  showControls?: boolean;
  className?: string;
}

export interface VideoPlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoElement: () => HTMLVideoElement | null;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer(
  {
    src,
    poster,
    onTimeUpdate,
    onEnded,
    showControls = true,
    className = '',
  },
  ref
) {
  const {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isBuffering,
    hasEnded,
    play,
    pause,
    togglePlayPause,
    seek,
    skip,
    setPlaybackRate,
  } = useVideoPlayer({ onTimeUpdate, onEnded });

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    play,
    pause,
    seek,
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    getVideoElement: () => videoRef.current,
  }));

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skip(-5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        skip(5);
        break;
      case 'j':
        e.preventDefault();
        skip(-10);
        break;
      case 'l':
        e.preventDefault();
        skip(10);
        break;
      case 'Home':
        e.preventDefault();
        seek(0);
        break;
      case 'End':
        e.preventDefault();
        seek(duration);
        break;
    }
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-black ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="비디오 플레이어"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        onClick={togglePlayPause}
      />

      {/* Buffering overlay */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Play button overlay when paused */}
      {!isPlaying && !isBuffering && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
          onClick={togglePlayPause}
          aria-label={hasEnded ? '다시 재생' : '재생'}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: VIDEO_COLORS.primary }}
          >
            {hasEnded ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>
      )}

      {/* Controls */}
      {showControls && (
        <div
          className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
        >
          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full cursor-pointer mb-3 group"
            style={{ backgroundColor: VIDEO_COLORS.progressTrack }}
            onClick={handleProgressClick}
            role="slider"
            aria-label="재생 위치"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
          >
            <div
              className="h-full rounded-full transition-all group-hover:h-2"
              style={{
                backgroundColor: VIDEO_COLORS.primary,
                width: `${progressPercent}%`,
              }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label={isPlaying ? '일시정지' : '재생'}
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Skip buttons */}
              <button
                onClick={() => skip(-10)}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="10초 뒤로"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </button>
              <button
                onClick={() => skip(10)}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="10초 앞으로"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                </svg>
              </button>

              {/* Time display */}
              <span className="text-white text-sm font-mono">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            {/* Playback rate */}
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="bg-transparent text-white text-sm border border-white/30 rounded px-2 py-1 cursor-pointer"
              aria-label="재생 속도"
            >
              {PLAYBACK_RATES.map((rate) => (
                <option key={rate} value={rate} className="bg-gray-800">
                  {rate}x
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
