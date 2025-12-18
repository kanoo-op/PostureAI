'use client';

import React, { useCallback, useRef } from 'react';
import { RepSelectorPanelProps } from './types';
import { REP_COMPARISON_COLORS, MAX_SELECTED_REPS } from './constants';

export default function RepSelectorPanel({
  availableReps,
  selectedRepNumbers,
  onSelectionChange,
  maxSelections = MAX_SELECTED_REPS,
}: RepSelectorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRepToggle = useCallback(
    (repNumber: number) => {
      if (selectedRepNumbers.includes(repNumber)) {
        // Remove from selection
        onSelectionChange(selectedRepNumbers.filter((n) => n !== repNumber));
      } else if (selectedRepNumbers.length < maxSelections) {
        // Add to selection
        onSelectionChange([...selectedRepNumbers, repNumber]);
      }
    },
    [selectedRepNumbers, onSelectionChange, maxSelections]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, repNumber: number, index: number) => {
      const buttons = containerRef.current?.querySelectorAll('button');
      if (!buttons) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (index > 0) {
            (buttons[index - 1] as HTMLButtonElement).focus();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (index < buttons.length - 1) {
            (buttons[index + 1] as HTMLButtonElement).focus();
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleRepToggle(repNumber);
          break;
      }
    },
    [handleRepToggle]
  );

  const handleSelectAll = useCallback(() => {
    const allReps = availableReps.slice(0, maxSelections).map((r) => r.repNumber);
    onSelectionChange(allReps);
  }, [availableReps, maxSelections, onSelectionChange]);

  const handleClearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  if (availableReps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          className="text-xs font-medium"
          style={{ color: REP_COMPARISON_COLORS.textSecondary }}
        >
          렙 선택 / Select Reps
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-xs px-2 py-0.5 rounded transition-colors hover:opacity-80"
            style={{
              color: REP_COMPARISON_COLORS.primary,
              backgroundColor: REP_COMPARISON_COLORS.status.goodBg,
            }}
            aria-label="Select all reps"
          >
            전체 / All
          </button>
          <button
            onClick={handleClearAll}
            className="text-xs px-2 py-0.5 rounded transition-colors hover:opacity-80"
            style={{
              color: REP_COMPARISON_COLORS.textMuted,
              backgroundColor: REP_COMPARISON_COLORS.surfaceElevated,
            }}
            aria-label="Clear selection"
          >
            초기화 / Clear
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Rep selector"
      >
        {availableReps.map((rep, index) => {
          const isSelected = selectedRepNumbers.includes(rep.repNumber);
          const isDisabled = !isSelected && selectedRepNumbers.length >= maxSelections;

          return (
            <button
              key={`${rep.sessionId}-${rep.repNumber}`}
              onClick={() => handleRepToggle(rep.repNumber)}
              onKeyDown={(e) => handleKeyDown(e, rep.repNumber, index)}
              disabled={isDisabled}
              className={`
                relative px-3 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-200 focus:outline-none focus:ring-2
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{
                backgroundColor: isSelected
                  ? REP_COMPARISON_COLORS.primary
                  : REP_COMPARISON_COLORS.surfaceElevated,
                color: isSelected
                  ? REP_COMPARISON_COLORS.background
                  : REP_COMPARISON_COLORS.textPrimary,
                borderColor: isSelected
                  ? REP_COMPARISON_COLORS.primary
                  : REP_COMPARISON_COLORS.border,
                borderWidth: 1,
                borderStyle: 'solid',
              }}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`Rep ${rep.repNumber}, quality ${rep.quality}%`}
            >
              <span>Rep {rep.repNumber}</span>
              {/* Quality badge */}
              <span
                className="ml-1 text-[10px] opacity-70"
                style={{
                  color: isSelected
                    ? REP_COMPARISON_COLORS.background
                    : rep.quality >= 80
                      ? REP_COMPARISON_COLORS.status.good
                      : rep.quality >= 60
                        ? REP_COMPARISON_COLORS.status.warning
                        : REP_COMPARISON_COLORS.status.error,
                }}
              >
                {rep.quality}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Selection count */}
      <p className="text-xs" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
        {selectedRepNumbers.length}/{maxSelections} 선택됨 / selected
      </p>
    </div>
  );
}
