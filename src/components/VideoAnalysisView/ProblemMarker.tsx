'use client';

import React, { useState, useRef, useCallback } from 'react';
import { VIDEO_ANALYSIS_COLORS } from './constants';
import MarkerTooltip from './MarkerTooltip';
import type { ProblemMarker as ProblemMarkerType } from './types';

interface ProblemMarkerProps {
  marker: ProblemMarkerType;
  duration: number;
  language: 'ko' | 'en';
  onSeek: (time: number) => void;
  timelineRef?: React.RefObject<HTMLDivElement | null>;
}

const MARKER_SIZE = {
  base: 8,
  increment: 2,
  min: 8,
  max: 16,
};

export default function ProblemMarkerComponent({
  marker,
  duration,
  language,
  onSeek,
  timelineRef,
}: ProblemMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const markerRef = useRef<HTMLButtonElement>(null);

  // Calculate marker position as percentage
  const positionPercent = duration > 0
    ? (marker.timestampSeconds / duration) * 100
    : 0;

  // Calculate marker size based on feedback count
  const size = Math.min(
    Math.max(
      MARKER_SIZE.base + (marker.feedbackCount - 1) * MARKER_SIZE.increment,
      MARKER_SIZE.min
    ),
    MARKER_SIZE.max
  );

  // Get marker color based on level
  const markerColor = marker.level === 'error'
    ? VIDEO_ANALYSIS_COLORS.statusError
    : VIDEO_ANALYSIS_COLORS.statusWarning;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent timeline seek
    onSeek(marker.timestampSeconds);
  }, [marker.timestampSeconds, onSeek]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onSeek(marker.timestampSeconds);
    }
  }, [marker.timestampSeconds, onSeek]);

  // Get tooltip position
  const getTooltipPosition = () => {
    if (!markerRef.current) return { x: 0, y: 0 };
    const rect = markerRef.current.getBoundingClientRect();
    return { x: rect.width / 2, y: 0 };
  };

  return (
    <button
      ref={markerRef}
      className="absolute top-1/2 -translate-y-1/2 rounded-full cursor-pointer transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={{
        left: `${positionPercent}%`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: markerColor,
        transform: `translateX(-50%) translateY(-50%)`,
        boxShadow: `0 0 ${size / 2}px ${markerColor}`,
        zIndex: isHovered ? 30 : 20,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      aria-label={`Problem at ${Math.floor(marker.timestampSeconds / 60)}:${Math.floor(marker.timestampSeconds % 60).toString().padStart(2, '0')}, score ${marker.score}, ${marker.level} level`}
      tabIndex={0}
    >
      {isHovered && (
        <MarkerTooltip
          marker={marker}
          language={language}
          position={getTooltipPosition()}
          containerRef={timelineRef}
        />
      )}
    </button>
  );
}
