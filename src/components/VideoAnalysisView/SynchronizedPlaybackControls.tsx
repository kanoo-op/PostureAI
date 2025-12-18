'use client';

import React, { useRef } from 'react';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from './constants';
import type { RepAnalysisResult, FramePoseData, VideoRepAnalysisResult } from '@/types/video';
import ProblemMarkerComponent from './ProblemMarker';
import { useProblemMarkers } from './hooks/useProblemMarkers';
import {
  PlaybackSpeedSelector,
  FrameStepControls,
  PlaybackRateIndicator,
  KeyboardShortcutHints,
  usePlaybackKeyboard,
} from '@/components/PlaybackControls';
import type { PlaybackSpeed } from '@/components/PlaybackControls';

interface SynchronizedPlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  currentFrameIndex: number;
  totalFrames: number;
  isAtStart: boolean;
  isAtEnd: boolean;
  repBoundaries: RepAnalysisResult[];
  frames?: FramePoseData[];
  language: 'ko' | 'en';
  repAnalysisResult?: VideoRepAnalysisResult;
}

export default function SynchronizedPlaybackControls({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onSetPlaybackRate,
  onStepForward,
  onStepBackward,
  currentFrameIndex,
  totalFrames,
  isAtStart,
  isAtEnd,
  repBoundaries,
  frames,
  language,
  repAnalysisResult,
}: SynchronizedPlaybackControlsProps) {
  const t = TRANSLATIONS[language];
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize playback rate to valid speed type
  const normalizedSpeed = [0.25, 0.5, 0.75, 1, 1.5, 2].includes(playbackRate)
    ? (playbackRate as PlaybackSpeed)
    : 1;

  // Keyboard shortcuts integration
  usePlaybackKeyboard({
    containerRef,
    onFramePrevious: onStepBackward,
    onFrameNext: onStepForward,
    onPlayPause: isPlaying ? onPause : onPlay,
    onSpeedChange: onSetPlaybackRate,
    currentSpeed: normalizedSpeed,
  });

  // Use problem markers hook with rep analysis data
  const { markers: problemMarkers } = useProblemMarkers(frames, duration, repAnalysisResult);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  };

  return (
    <div
      ref={containerRef}
      className="mt-4 p-4 rounded-2xl"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
      }}
      tabIndex={0}
    >
      {/* Progress bar */}
      <div
        ref={timelineRef}
        className="h-3 rounded-full cursor-pointer mb-4 relative"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.timelineTrack }}
        onClick={handleProgressClick}
      >
        {/* Progress fill */}
        <div
          className="h-full rounded-full transition-all"
          style={{
            backgroundColor: VIDEO_ANALYSIS_COLORS.timelineProgress,
            width: `${progressPercent}%`,
          }}
        />

        {/* Rep markers */}
        {repBoundaries.map((rep, i) => {
          const startPercent =
            duration > 0 ? (rep.startTimestamp / 1000 / duration) * 100 : 0;
          return (
            <div
              key={i}
              className="absolute top-0 w-0.5 h-full"
              style={{
                left: `${startPercent}%`,
                backgroundColor: VIDEO_ANALYSIS_COLORS.accentViolet,
              }}
            />
          );
        })}

        {/* Worst moment markers */}
        {repBoundaries.map((rep, i) => {
          if (rep.worstMoment.score < 60) {
            const markerPercent =
              duration > 0
                ? (rep.worstMoment.timestamp / 1000 / duration) * 100
                : 0;
            return (
              <div
                key={`worst-${i}`}
                className="absolute top-0 w-1.5 h-full rounded-full"
                style={{
                  left: `${markerPercent}%`,
                  backgroundColor: VIDEO_ANALYSIS_COLORS.timelineMarker,
                }}
              />
            );
          }
          return null;
        })}

        {/* Problem markers */}
        {problemMarkers.map((marker, idx) => (
          <ProblemMarkerComponent
            key={`problem-${idx}-${marker.timestamp}`}
            marker={marker}
            duration={duration}
            language={language}
            onSeek={onSeek}
            timelineRef={timelineRef}
          />
        ))}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Play/Pause button */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.primary }}
            aria-label={isPlaying ? t.pause : t.play}
          >
            {isPlaying ? (
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-white ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Frame step controls */}
          <FrameStepControls
            onStepBackward={onStepBackward}
            onStepForward={onStepForward}
            isAtStart={isAtStart}
            isAtEnd={isAtEnd}
            currentFrame={currentFrameIndex}
            totalFrames={totalFrames}
            language={language}
          />

          {/* Time display */}
          <span
            className="font-mono text-sm"
            style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Center - Playback rate indicator */}
        <div className="flex items-center">
          <PlaybackRateIndicator
            currentSpeed={normalizedSpeed}
            isPlaying={isPlaying}
          />
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Playback speed selector */}
          <PlaybackSpeedSelector
            currentSpeed={normalizedSpeed}
            onSpeedChange={onSetPlaybackRate}
            language={language}
            variant="buttons"
          />

          {/* Keyboard shortcuts hint */}
          <KeyboardShortcutHints language={language} />
        </div>
      </div>
    </div>
  );
}
