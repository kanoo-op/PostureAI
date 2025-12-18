'use client';

import React from 'react';
import { TIMELINE_COLORS } from './constants';

interface TimelineZoomControlsProps {
  currentZoom: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange: (zoom: number) => void;
  className?: string;
}

export default function TimelineZoomControls({
  currentZoom,
  minZoom = 1,
  maxZoom = 10,
  onZoomChange,
  className = '',
}: TimelineZoomControlsProps) {
  const handleZoomIn = () => {
    onZoomChange(Math.min(maxZoom, currentZoom + 1));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(minZoom, currentZoom - 1));
  };

  const handleReset = () => {
    onZoomChange(1);
  };

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="group"
      aria-label="Timeline zoom controls"
    >
      <button
        onClick={handleZoomOut}
        disabled={currentZoom <= minZoom}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
        style={{
          backgroundColor: TIMELINE_COLORS.surface,
          color: TIMELINE_COLORS.textPrimary,
        }}
        aria-label="Zoom out"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>

      <button
        onClick={handleReset}
        className="px-3 h-8 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
        style={{
          backgroundColor: TIMELINE_COLORS.surface,
          color: TIMELINE_COLORS.textSecondary,
        }}
        aria-label="Reset zoom"
      >
        {currentZoom.toFixed(1)}x
      </button>

      <button
        onClick={handleZoomIn}
        disabled={currentZoom >= maxZoom}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
        style={{
          backgroundColor: TIMELINE_COLORS.surface,
          color: TIMELINE_COLORS.textPrimary,
        }}
        aria-label="Zoom in"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
