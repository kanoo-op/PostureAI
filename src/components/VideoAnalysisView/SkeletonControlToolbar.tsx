'use client';

import React, { useState } from 'react';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from './constants';
import type { SkeletonViewMode } from './types';

interface SkeletonControlToolbarProps {
  viewMode: SkeletonViewMode;
  opacity: number;
  showJointAngles: boolean;
  focusModeEnabled: boolean;
  hasProblems: boolean;
  onViewModeChange: (mode: SkeletonViewMode) => void;
  onOpacityChange: (opacity: number) => void;
  onToggleJointAngles: () => void;
  onToggleFocusMode: () => void;
  language: 'ko' | 'en';
}

export default function SkeletonControlToolbar({
  viewMode,
  opacity,
  showJointAngles,
  focusModeEnabled,
  hasProblems,
  onViewModeChange,
  onOpacityChange,
  onToggleJointAngles,
  onToggleFocusMode,
  language,
}: SkeletonControlToolbarProps) {
  const t = TRANSLATIONS[language];
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className="rounded-xl p-3 mb-4 transition-all duration-200"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
      }}
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-sm font-medium"
          style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
        >
          {t.viewControls}
        </span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-gray-700 transition-colors"
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          aria-expanded={!isCollapsed}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke={VIDEO_ANALYSIS_COLORS.textMuted}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewModeChange('side-by-side')}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: viewMode === 'side-by-side'
                  ? VIDEO_ANALYSIS_COLORS.toggleActiveBg
                  : VIDEO_ANALYSIS_COLORS.toggleInactiveBg,
                border: `1px solid ${viewMode === 'side-by-side'
                  ? VIDEO_ANALYSIS_COLORS.toggleActiveBorder
                  : VIDEO_ANALYSIS_COLORS.toggleInactiveBorder}`,
                color: viewMode === 'side-by-side'
                  ? VIDEO_ANALYSIS_COLORS.primary
                  : VIDEO_ANALYSIS_COLORS.textSecondary,
              }}
              aria-pressed={viewMode === 'side-by-side'}
            >
              {t.viewModeSideBySide}
            </button>
            <button
              onClick={() => onViewModeChange('overlay')}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: viewMode === 'overlay'
                  ? VIDEO_ANALYSIS_COLORS.toggleActiveBg
                  : VIDEO_ANALYSIS_COLORS.toggleInactiveBg,
                border: `1px solid ${viewMode === 'overlay'
                  ? VIDEO_ANALYSIS_COLORS.toggleActiveBorder
                  : VIDEO_ANALYSIS_COLORS.toggleInactiveBorder}`,
                color: viewMode === 'overlay'
                  ? VIDEO_ANALYSIS_COLORS.primary
                  : VIDEO_ANALYSIS_COLORS.textSecondary,
              }}
              aria-pressed={viewMode === 'overlay'}
            >
              {t.viewModeOverlay}
            </button>
          </div>

          {/* Opacity Slider - Only visible in overlay mode */}
          {viewMode === 'overlay' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs"
                  style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
                  htmlFor="opacity-slider"
                >
                  {t.opacity}
                </label>
                <span
                  className="text-xs font-mono"
                  style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
                >
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <input
                id="opacity-slider"
                type="range"
                min="25"
                max="100"
                value={opacity * 100}
                onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${VIDEO_ANALYSIS_COLORS.sliderFill} 0%, ${VIDEO_ANALYSIS_COLORS.sliderFill} ${((opacity - 0.25) / 0.75) * 100}%, ${VIDEO_ANALYSIS_COLORS.sliderTrack} ${((opacity - 0.25) / 0.75) * 100}%, ${VIDEO_ANALYSIS_COLORS.sliderTrack} 100%)`,
                }}
                aria-valuemin={25}
                aria-valuemax={100}
                aria-valuenow={Math.round(opacity * 100)}
              />
            </div>
          )}

          {/* Toggle Buttons Row */}
          <div className="flex items-center gap-2">
            {/* Joint Angles Toggle */}
            <button
              onClick={onToggleJointAngles}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: showJointAngles
                  ? VIDEO_ANALYSIS_COLORS.toggleActiveBg
                  : VIDEO_ANALYSIS_COLORS.toggleInactiveBg,
                border: `1px solid ${showJointAngles
                  ? VIDEO_ANALYSIS_COLORS.toggleActiveBorder
                  : VIDEO_ANALYSIS_COLORS.toggleInactiveBorder}`,
                color: showJointAngles
                  ? VIDEO_ANALYSIS_COLORS.primary
                  : VIDEO_ANALYSIS_COLORS.textMuted,
              }}
              aria-pressed={showJointAngles}
              title={showJointAngles ? t.hideAngles : t.showAngles}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21l4-4m0 0l4 4m-4-4V3" />
              </svg>
              {t.jointAngles}
            </button>

            {/* Focus Mode Toggle */}
            <button
              onClick={onToggleFocusMode}
              disabled={!hasProblems}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: focusModeEnabled && hasProblems
                  ? 'rgba(0, 221, 255, 0.2)'
                  : VIDEO_ANALYSIS_COLORS.toggleInactiveBg,
                border: `1px solid ${focusModeEnabled && hasProblems
                  ? 'rgba(0, 221, 255, 0.4)'
                  : VIDEO_ANALYSIS_COLORS.toggleInactiveBorder}`,
                color: focusModeEnabled && hasProblems
                  ? VIDEO_ANALYSIS_COLORS.focusModeHighlight
                  : VIDEO_ANALYSIS_COLORS.textMuted,
              }}
              aria-pressed={focusModeEnabled}
              title={t.focusProblems}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t.focusMode}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
