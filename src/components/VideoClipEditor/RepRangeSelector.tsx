'use client';

import React from 'react';
import { CLIP_EDITOR_COLORS } from './constants';
import type { RepAnalysisResult } from '@/types/video';
import type { RepRangeSelection } from '@/types/videoClip';

interface RepRangeSelectorProps {
  reps: RepAnalysisResult[];
  selectedRange: RepRangeSelection | null;
  onSelectRange: (range: RepRangeSelection | null) => void;
  language: 'ko' | 'en';
}

const TRANSLATIONS = {
  ko: {
    selectReps: '반복 선택',
    clearSelection: '선택 해제',
    rep: '반복',
    to: '~',
    score: '점수',
  },
  en: {
    selectReps: 'Select Reps',
    clearSelection: 'Clear Selection',
    rep: 'Rep',
    to: 'to',
    score: 'Score',
  },
};

export default function RepRangeSelector({
  reps,
  selectedRange,
  onSelectRange,
  language,
}: RepRangeSelectorProps) {
  const t = TRANSLATIONS[language];

  const handleRepClick = (index: number) => {
    if (!selectedRange) {
      // Start new selection
      onSelectRange({ startRepIndex: index, endRepIndex: index });
    } else if (selectedRange.startRepIndex === index && selectedRange.endRepIndex === index) {
      // Deselect if clicking same single rep
      onSelectRange(null);
    } else if (index < selectedRange.startRepIndex) {
      // Extend selection backward
      onSelectRange({ ...selectedRange, startRepIndex: index });
    } else if (index > selectedRange.endRepIndex) {
      // Extend selection forward
      onSelectRange({ ...selectedRange, endRepIndex: index });
    } else {
      // Click within range - narrow selection
      onSelectRange({ startRepIndex: index, endRepIndex: index });
    }
  };

  const isRepSelected = (index: number): boolean => {
    if (!selectedRange) return false;
    return index >= selectedRange.startRepIndex && index <= selectedRange.endRepIndex;
  };

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        backgroundColor: CLIP_EDITOR_COLORS.backgroundSurface,
        border: `1px solid ${CLIP_EDITOR_COLORS.border}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4
          className="font-medium text-sm"
          style={{ color: CLIP_EDITOR_COLORS.textPrimary }}
        >
          {t.selectReps}
        </h4>

        {selectedRange && (
          <button
            onClick={() => onSelectRange(null)}
            className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
            style={{
              backgroundColor: CLIP_EDITOR_COLORS.backgroundElevated,
              color: CLIP_EDITOR_COLORS.textSecondary,
            }}
          >
            {t.clearSelection}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {reps.map((rep, index) => {
          const isSelected = isRepSelected(index);
          const scoreColor = rep.score >= 80
            ? CLIP_EDITOR_COLORS.success
            : rep.score >= 60
              ? CLIP_EDITOR_COLORS.warning
              : CLIP_EDITOR_COLORS.danger;

          return (
            <button
              key={rep.repNumber}
              onClick={() => handleRepClick(index)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: isSelected
                  ? CLIP_EDITOR_COLORS.primary
                  : CLIP_EDITOR_COLORS.backgroundElevated,
                color: isSelected
                  ? CLIP_EDITOR_COLORS.textPrimary
                  : CLIP_EDITOR_COLORS.textSecondary,
                border: `1px solid ${isSelected ? CLIP_EDITOR_COLORS.primary : CLIP_EDITOR_COLORS.border}`,
              }}
            >
              <span>{t.rep} {rep.repNumber}</span>
              <span
                className="ml-2 text-xs"
                style={{ color: isSelected ? 'inherit' : scoreColor }}
              >
                {Math.round(rep.score)}
              </span>
            </button>
          );
        })}
      </div>

      {selectedRange && (
        <div
          className="mt-3 text-sm"
          style={{ color: CLIP_EDITOR_COLORS.textMuted }}
        >
          {selectedRange.startRepIndex === selectedRange.endRepIndex
            ? `${t.rep} ${reps[selectedRange.startRepIndex].repNumber}`
            : `${t.rep} ${reps[selectedRange.startRepIndex].repNumber} ${t.to} ${reps[selectedRange.endRepIndex].repNumber}`}
        </div>
      )}
    </div>
  );
}
