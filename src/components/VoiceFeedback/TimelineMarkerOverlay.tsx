'use client';

import React from 'react';
import type { AudioPriority } from '@/types/audioFeedback';

// Design tokens
const COLORS = {
  priorityCritical: '#FF3D71',
  priorityCriticalGlow: 'rgba(255, 61, 113, 0.4)',
  priorityHigh: '#FFB800',
  priorityMedium: '#38BDF8',
  priorityLow: '#94A3B8',
  repBoundary: '#7C3AED',
  repBoundaryGlow: 'rgba(124, 58, 237, 0.3)',
  timelineTrack: 'rgba(75, 85, 99, 0.5)',
  timelineProgress: '#0284c7',
};

interface TimelineMarker {
  timestamp: number;
  priority: AudioPriority;
  type: 'correction' | 'rep_summary' | 'worst_moment' | 'critical_pause' | 'analysis_start' | 'analysis_end';
  repNumber?: number;
}

interface TimelineMarkerOverlayProps {
  markers: TimelineMarker[];
  videoDuration: number;
  currentTime: number;
  width?: number;
  height?: number;
  onMarkerClick?: (marker: TimelineMarker) => void;
}

function getMarkerColor(priority: AudioPriority): string {
  switch (priority) {
    case 'critical':
      return COLORS.priorityCritical;
    case 'high':
      return COLORS.priorityHigh;
    case 'medium':
      return COLORS.priorityMedium;
    case 'low':
    default:
      return COLORS.priorityLow;
  }
}

function getMarkerGlow(priority: AudioPriority): string {
  if (priority === 'critical') {
    return COLORS.priorityCriticalGlow;
  }
  return 'transparent';
}

export function TimelineMarkerOverlay({
  markers,
  videoDuration,
  currentTime,
  width = 300,
  height = 24,
  onMarkerClick,
}: TimelineMarkerOverlayProps) {
  if (videoDuration === 0) return null;

  const progressPercent = (currentTime / videoDuration) * 100;

  // Group markers by type for layering
  const repBoundaryMarkers = markers.filter(m => m.type === 'rep_summary');
  const feedbackMarkers = markers.filter(m => m.type !== 'rep_summary');

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
      }}
      role="img"
      aria-label={`Timeline with ${markers.length} feedback markers`}
    >
      {/* Track background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: COLORS.timelineTrack,
          borderRadius: '2px',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Progress fill */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          width: `${progressPercent}%`,
          height: '4px',
          backgroundColor: COLORS.timelineProgress,
          borderRadius: '2px',
          transform: 'translateY(-50%)',
          transition: 'width 0.1s linear',
        }}
      />

      {/* Rep boundary markers (vertical lines) */}
      {repBoundaryMarkers.map((marker, index) => {
        const position = (marker.timestamp / videoDuration) * 100;
        return (
          <div
            key={`rep-${index}-${marker.timestamp}`}
            style={{
              position: 'absolute',
              left: `${position}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: COLORS.repBoundary,
              boxShadow: `0 0 4px ${COLORS.repBoundaryGlow}`,
              transform: 'translateX(-50%)',
              cursor: onMarkerClick ? 'pointer' : 'default',
            }}
            onClick={() => onMarkerClick?.(marker)}
            title={`Rep ${marker.repNumber || ''} boundary`}
          />
        );
      })}

      {/* Feedback markers (dots) */}
      {feedbackMarkers.map((marker, index) => {
        const position = (marker.timestamp / videoDuration) * 100;
        const color = getMarkerColor(marker.priority);
        const glow = getMarkerGlow(marker.priority);
        const isActive = Math.abs(marker.timestamp - currentTime) < 500;

        return (
          <div
            key={`marker-${index}-${marker.timestamp}`}
            style={{
              position: 'absolute',
              left: `${position}%`,
              top: '50%',
              width: isActive ? '10px' : '8px',
              height: isActive ? '10px' : '8px',
              backgroundColor: color,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: marker.priority === 'critical' ? `0 0 8px ${glow}` : 'none',
              cursor: onMarkerClick ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              zIndex: marker.priority === 'critical' ? 2 : 1,
            }}
            onClick={() => onMarkerClick?.(marker)}
            title={`${marker.priority} feedback at ${Math.floor(marker.timestamp / 1000)}s`}
          />
        );
      })}

      {/* Current position indicator */}
      <div
        style={{
          position: 'absolute',
          left: `${progressPercent}%`,
          top: '50%',
          width: '12px',
          height: '12px',
          backgroundColor: '#FFFFFF',
          borderRadius: '50%',
          border: `2px solid ${COLORS.timelineProgress}`,
          transform: 'translate(-50%, -50%)',
          zIndex: 3,
          transition: 'left 0.1s linear',
        }}
      />
    </div>
  );
}
