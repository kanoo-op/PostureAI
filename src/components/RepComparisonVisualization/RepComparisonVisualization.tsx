'use client';

import React, { useMemo, useCallback } from 'react';
import { RepComparisonVisualizationProps } from './types';
import { REP_COMPARISON_COLORS } from './constants';
import { useRepComparisonData } from './hooks/useRepComparisonData';
import MultiRepAngleChart from './MultiRepAngleChart';
import RepSelectorPanel from './RepSelectorPanel';
import SessionSelector from './SessionSelector';
import SessionComparisonToggle from './SessionComparisonToggle';
import JointFilterDropdown from './JointFilterDropdown';
import RepStatsSummary from './RepStatsSummary';
import ChartLegend from './ChartLegend';
import EmptyStateRepComparison from './EmptyStateRepComparison';

export default function RepComparisonVisualization({
  sessionId,
  exerciseType,
  compact = false,
  isVisible = true,
  onToggle,
  className = '',
}: RepComparisonVisualizationProps) {
  const {
    availableSessions,
    allNormalizedReps,
    selectedReps,
    deviationPoints,
    availableJoints,
    selectedSessionIds,
    selectedRepNumbers,
    selectedJoints,
    isSessionCompareMode,
    consistencyScore,
    handleSessionChange,
    handleRepSelectionChange,
    handleJointChange,
    toggleSessionCompareMode,
  } = useRepComparisonData(exerciseType, sessionId);

  const handleClose = useCallback(() => {
    onToggle?.(false);
  }, [onToggle]);

  // Generate rep options for selector
  const repOptions = useMemo(() => {
    return allNormalizedReps.map((rep) => ({
      repNumber: rep.repNumber,
      sessionId: rep.sessionId,
      quality: rep.overallQuality,
    }));
  }, [allNormalizedReps]);

  // Generate legend items
  const legendItems = useMemo(() => {
    return selectedReps.map((rep, idx) => ({
      repNumber: rep.repNumber,
      color: REP_COMPARISON_COLORS.repLines[idx % REP_COMPARISON_COLORS.repLines.length],
    }));
  }, [selectedReps]);

  // Calculate average deviation
  const averageDeviation = useMemo(() => {
    if (deviationPoints.length === 0) return 0;
    const sum = deviationPoints.reduce((acc, p) => acc + Math.abs(p.deviation), 0);
    return Math.round((sum / deviationPoints.length) * 10) / 10;
  }, [deviationPoints]);

  if (!isVisible) {
    return null;
  }

  // Check for empty state
  const hasData = availableSessions.length > 0 && allNormalizedReps.length > 0;

  return (
    <div
      className={`rounded-2xl overflow-hidden border shadow-2xl ${compact ? 'max-w-xs' : 'w-full max-w-2xl'} ${className}`}
      style={{
        backgroundColor: REP_COMPARISON_COLORS.background,
        borderColor: REP_COMPARISON_COLORS.border,
        backdropFilter: 'blur(12px)',
      }}
      role="region"
      aria-label="Rep Comparison Visualization / 반복 비교 시각화"
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: REP_COMPARISON_COLORS.border }}
      >
        <div>
          <h3
            className="text-sm font-semibold"
            style={{ color: REP_COMPARISON_COLORS.textPrimary }}
          >
            반복 비교 / Rep Comparison
          </h3>
          <p className="text-xs" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
            {selectedReps.length}개 렙 선택됨 / {selectedReps.length} reps selected
          </p>
        </div>
        {onToggle && (
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: REP_COMPARISON_COLORS.textSecondary }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {!hasData ? (
        <EmptyStateRepComparison />
      ) : (
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Controls Row */}
          <div className={`flex ${compact ? 'flex-col gap-2' : 'flex-wrap gap-3'} items-start`}>
            {/* Session Comparison Toggle */}
            <SessionComparisonToggle
              isEnabled={isSessionCompareMode}
              onToggle={toggleSessionCompareMode}
            />

            {/* Session Selector (visible in session compare mode) */}
            {isSessionCompareMode && (
              <SessionSelector
                sessions={availableSessions}
                selectedSessionIds={selectedSessionIds}
                onSessionChange={handleSessionChange}
                currentSessionId={sessionId}
              />
            )}

            {/* Joint Filter */}
            <JointFilterDropdown
              availableJoints={availableJoints}
              selectedJoints={selectedJoints}
              onJointChange={handleJointChange}
            />
          </div>

          {/* Rep Selector */}
          <RepSelectorPanel
            availableReps={repOptions}
            selectedRepNumbers={selectedRepNumbers}
            onSelectionChange={handleRepSelectionChange}
            maxSelections={8}
          />

          {/* Chart Legend */}
          <ChartLegend selectedReps={legendItems} selectedJoints={selectedJoints} />

          {/* Multi-Rep Angle Chart */}
          <MultiRepAngleChart
            selectedReps={selectedReps}
            selectedJoints={selectedJoints}
            deviationPoints={deviationPoints}
            showDeviationBand={selectedReps.length >= 2}
            compact={compact}
          />

          {/* Stats Summary */}
          {!compact && (
            <RepStatsSummary
              selectedReps={selectedReps}
              consistencyScore={consistencyScore}
              averageDeviation={averageDeviation}
            />
          )}
        </div>
      )}

      {/* Bottom gradient accent */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${REP_COMPARISON_COLORS.primary}, ${REP_COMPARISON_COLORS.secondary})`,
        }}
      />
    </div>
  );
}
