'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ROM_COLORS } from './constants';
import { ROMDisplayPanelProps } from './types';
import { useROMTracking } from './hooks/useROMTracking';
import PanelHeader from './PanelHeader';
import JointROMCard from './JointROMCard';
import SessionSummaryFooter from './SessionSummaryFooter';
import EmptyState from './EmptyState';
import GradientAccentBar from './GradientAccentBar';

export default function ROMDisplayPanel({
  keypoints,
  romTracker,
  isTracking = true,
  isVisible = true,
  onToggle,
  className = '',
  compact = false,
  defaultCollapsed = false,
}: ROMDisplayPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const { currentStats, sessionSummary, jointResults, sessionDuration } = useROMTracking({
    romTracker,
    keypoints,
    isTracking,
  });

  const hasValidData = useMemo(() => {
    return jointResults.length > 0;
  }, [jointResults]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    onToggle?.(false);
  }, [onToggle]);

  // Get current angle for each joint result
  const getCurrentAngle = useCallback(
    (jointType: string) => {
      const stat = currentStats.find((s) => s.jointType === jointType);
      return stat?.current;
    },
    [currentStats]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        rounded-2xl overflow-hidden border shadow-2xl
        ${compact ? 'max-w-xs' : 'w-full max-w-md'}
        ${className}
      `}
      style={{
        backgroundColor: ROM_COLORS.background,
        borderColor: ROM_COLORS.border,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <PanelHeader
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onClose={onToggle ? handleClose : undefined}
        sessionDuration={sessionDuration}
      />

      {/* Collapsible Content */}
      {!isCollapsed && (
        <>
          {/* Joint Cards */}
          <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {hasValidData ? (
              <div className="space-y-3">
                {jointResults.map((result) => (
                  <JointROMCard
                    key={`${result.jointType}-${result.side || 'bilateral'}`}
                    result={result}
                    currentAngle={getCurrentAngle(result.jointType)}
                    compact={compact}
                  />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>

          {/* Session Summary Footer */}
          {hasValidData && (
            <SessionSummaryFooter
              summary={sessionSummary}
              compact={compact}
            />
          )}
        </>
      )}

      {/* Gradient Accent Bar */}
      <GradientAccentBar />
    </div>
  );
}
