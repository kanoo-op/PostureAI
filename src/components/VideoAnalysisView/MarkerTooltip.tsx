'use client';

import React, { useRef, useEffect, useState } from 'react';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from './constants';
import type { ProblemMarker } from './types';

interface MarkerTooltipProps {
  marker: ProblemMarker;
  language: 'ko' | 'en';
  position: { x: number; y: number };
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function MarkerTooltip({
  marker,
  language,
  position,
  containerRef
}: MarkerTooltipProps) {
  const t = TRANSLATIONS[language];
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();

    let newX = position.x;

    // Check right overflow
    if (rect.right > window.innerWidth - 16) {
      newX = position.x - (rect.right - window.innerWidth + 16);
    }
    // Check left overflow
    if (rect.left < 16) {
      newX = position.x + (16 - rect.left);
    }

    setAdjustedPosition({ x: newX, y: position.y });
  }, [position]);

  const levelColor = marker.level === 'error'
    ? VIDEO_ANALYSIS_COLORS.statusError
    : VIDEO_ANALYSIS_COLORS.statusWarning;

  const levelBgColor = marker.level === 'error'
    ? VIDEO_ANALYSIS_COLORS.statusErrorBg
    : VIDEO_ANALYSIS_COLORS.statusWarningBg;

  const levelText = marker.level === 'error' ? t.errorLevel : t.warningLevel;

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 p-3 rounded-lg shadow-lg min-w-[200px] max-w-[280px]"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
        left: `${adjustedPosition.x}px`,
        bottom: '24px',
        transform: 'translateX(-50%)',
      }}
      role="tooltip"
    >
      {/* Header with level badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded"
          style={{ backgroundColor: levelBgColor, color: levelColor }}
        >
          {levelText}
        </span>
        <span
          className="text-lg font-bold"
          style={{ color: levelColor }}
        >
          {marker.score}
        </span>
      </div>

      {/* Feedback list */}
      {marker.feedbacks.length > 0 && (
        <div className="space-y-1">
          <span
            className="text-xs"
            style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
          >
            {t.markerIssues}:
          </span>
          <ul className="space-y-1">
            {marker.feedbacks.slice(0, 3).map((feedback, idx) => (
              <li
                key={idx}
                className="text-xs"
                style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
              >
                • {feedback}
              </li>
            ))}
            {marker.feedbacks.length > 3 && (
              <li
                className="text-xs"
                style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
              >
                +{marker.feedbacks.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Click hint */}
      <div
        className="mt-2 pt-2 text-xs text-center"
        style={{
          borderTop: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
          color: VIDEO_ANALYSIS_COLORS.textMuted,
        }}
      >
        {t.clickToSeek}
      </div>
    </div>
  );
}
