'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReferenceOverlayPreferences } from '@/types/referencePose';
import ReferenceToggleControl from './ReferenceToggleControl';
import OpacitySlider from './OpacitySlider';
import { REFERENCE_OVERLAY_COLORS, REFERENCE_OVERLAY_CONFIG } from './constants';

interface Props {
  onPreferencesChange: (prefs: ReferenceOverlayPreferences) => void;
  exerciseType: string;
  className?: string;
}

const DEFAULT_PREFERENCES: ReferenceOverlayPreferences = {
  enabled: false,
  opacity: REFERENCE_OVERLAY_CONFIG.defaultOpacity,
  showDeviationHighlights: true,
  selectedExercise: null,
};

export default function ReferenceControlPanel({
  onPreferencesChange,
  exerciseType,
  className = '',
}: Props) {
  const [preferences, setPreferences] = useState<ReferenceOverlayPreferences>(DEFAULT_PREFERENCES);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(REFERENCE_OVERLAY_CONFIG.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // Persist preferences
  const updatePreferences = useCallback((updates: Partial<ReferenceOverlayPreferences>) => {
    setPreferences(prev => {
      const next = { ...prev, ...updates, selectedExercise: exerciseType };
      try {
        localStorage.setItem(REFERENCE_OVERLAY_CONFIG.storageKey, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      onPreferencesChange(next);
      return next;
    });
  }, [exerciseType, onPreferencesChange]);

  // Report initial preferences on mount
  useEffect(() => {
    onPreferencesChange({ ...preferences, selectedExercise: exerciseType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${className}`}
      role="group"
      aria-label="참조 오버레이 설정"
    >
      <ReferenceToggleControl
        enabled={preferences.enabled}
        onToggle={(enabled) => updatePreferences({ enabled })}
      />

      {preferences.enabled && (
        <>
          <OpacitySlider
            value={preferences.opacity}
            onChange={(opacity) => updatePreferences({ opacity })}
          />

          {/* Deviation highlights toggle */}
          <button
            onClick={() => updatePreferences({ showDeviationHighlights: !preferences.showDeviationHighlights })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                updatePreferences({ showDeviationHighlights: !preferences.showDeviationHighlights });
              }
            }}
            className="p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: preferences.showDeviationHighlights
                ? `${REFERENCE_OVERLAY_COLORS.deviationMajor}20`
                : REFERENCE_OVERLAY_COLORS.surface,
              border: `1px solid ${preferences.showDeviationHighlights ? REFERENCE_OVERLAY_COLORS.deviationMajor : REFERENCE_OVERLAY_COLORS.border}`,
            }}
            aria-pressed={preferences.showDeviationHighlights}
            aria-label={preferences.showDeviationHighlights ? '차이 강조 끄기' : '차이 강조 켜기'}
            title="차이 강조 표시"
            tabIndex={0}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={preferences.showDeviationHighlights ? REFERENCE_OVERLAY_COLORS.deviationMajor : REFERENCE_OVERLAY_COLORS.textSecondary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
