'use client';

import React from 'react';
import { ROM_COLORS, ROM_LABELS } from './constants';
import { PanelHeaderProps } from './types';

export default function PanelHeader({
  isCollapsed,
  onToggleCollapse,
  onClose,
  sessionDuration = 0,
}: PanelHeaderProps) {
  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{
        backgroundColor: ROM_COLORS.surfaceElevated,
        borderBottom: `1px solid ${ROM_COLORS.border}`,
      }}
    >
      {/* Left: Title + Session duration */}
      <div className="flex items-center gap-3">
        {/* Activity indicator */}
        <div className="flex gap-1">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: ROM_COLORS.status.good }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: ROM_COLORS.status.good, opacity: 0.5 }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: ROM_COLORS.status.good, opacity: 0.25 }}
          />
        </div>

        <div>
          <h3
            className="font-semibold text-sm"
            style={{ color: ROM_COLORS.textPrimary }}
          >
            {ROM_LABELS.title.ko}
          </h3>
          {sessionDuration > 0 && (
            <span
              className="text-xs font-mono"
              style={{ color: ROM_COLORS.textMuted }}
            >
              {formatDuration(sessionDuration)}
            </span>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg transition-colors hover:bg-gray-700/50"
          aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            style={{ color: ROM_COLORS.textSecondary }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Close button (if provided) */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-700/50"
            aria-label="Close panel"
          >
            <svg
              className="w-4 h-4"
              style={{ color: ROM_COLORS.textSecondary }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
