'use client';

import React from 'react';
import { TIMELINE_COLORS } from './constants';
import type { ProblemMarker } from './types';

interface TimelineTooltipProps {
  timestamp: number;         // milliseconds
  markers: ProblemMarker[];
  position: { x: number; y: number };
  visible: boolean;
}

export default function TimelineTooltip({
  timestamp,
  markers,
  position,
  visible,
}: TimelineTooltipProps) {
  if (!visible) return null;

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return TIMELINE_COLORS.markerProblemCritical;
      case 'moderate': return TIMELINE_COLORS.markerProblemModerate;
      case 'minor': return TIMELINE_COLORS.markerProblemMinor;
      default: return TIMELINE_COLORS.textMuted;
    }
  };

  return (
    <div
      className="fixed z-50 px-3 py-2 rounded-lg shadow-xl pointer-events-none"
      style={{
        left: position.x,
        top: position.y - 10,
        transform: 'translate(-50%, -100%)',
        backgroundColor: TIMELINE_COLORS.backgroundElevated,
        border: `1px solid ${TIMELINE_COLORS.surface}`,
      }}
    >
      <div
        className="text-xs font-medium mb-1"
        style={{ color: TIMELINE_COLORS.textPrimary }}
      >
        {formatTime(timestamp)}
      </div>

      {markers.length > 0 && (
        <div className="space-y-1">
          {markers.slice(0, 3).map((marker) => (
            <div
              key={marker.id}
              className="flex items-center gap-2 text-xs"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getSeverityColor(marker.severity) }}
              />
              <span style={{ color: TIMELINE_COLORS.textSecondary }}>
                {marker.description}
              </span>
            </div>
          ))}
          {markers.length > 3 && (
            <div
              className="text-xs"
              style={{ color: TIMELINE_COLORS.textMuted }}
            >
              +{markers.length - 3} more
            </div>
          )}
        </div>
      )}

      {/* Arrow */}
      <div
        className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${TIMELINE_COLORS.backgroundElevated}`,
        }}
      />
    </div>
  );
}
