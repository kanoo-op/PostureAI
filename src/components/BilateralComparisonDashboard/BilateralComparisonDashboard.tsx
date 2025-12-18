'use client';

import React, { useMemo, useCallback } from 'react';
import { BilateralComparisonDashboardProps } from './types';
import { BILATERAL_COLORS } from './constants';
import { useBilateralAnalysis } from './hooks/useBilateralAnalysis';
import DashboardHeader from './DashboardHeader';
import JointComparisonSection from './JointComparisonSection';
import ImbalanceTrendChart from './ImbalanceTrendChart';
import RepCountBadge from './RepCountBadge';
import SkeletonLoader from './SkeletonLoader';
import EmptyState from './EmptyState';

export default function BilateralComparisonDashboard({
  keypoints,
  compact = false,
  isVisible = true,
  onToggle,
  className = '',
  repHistory = [],
  currentRep,
}: BilateralComparisonDashboardProps) {
  const { bilateralData, overallSymmetryScore } = useBilateralAnalysis(keypoints);

  const hasValidData = useMemo(() => {
    return bilateralData.some((d) => d.leftAngle > 0 || d.rightAngle > 0);
  }, [bilateralData]);

  const handleClose = useCallback(() => {
    onToggle?.(false);
  }, [onToggle]);

  if (!isVisible) {
    return null;
  }

  // Show skeleton while loading
  if (!keypoints || keypoints.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div
      className={`
        rounded-2xl overflow-hidden border shadow-2xl
        ${compact ? 'max-w-xs' : 'w-full max-w-md'}
        ${className}
      `}
      style={{
        backgroundColor: BILATERAL_COLORS.background,
        borderColor: BILATERAL_COLORS.border,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <DashboardHeader
        overallScore={overallSymmetryScore}
        onClose={onToggle ? handleClose : undefined}
      />

      {/* Rep Counter (if provided) */}
      {currentRep !== undefined && (
        <div className="px-4 pt-3">
          <RepCountBadge currentRep={currentRep} />
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {hasValidData ? (
          <div className="space-y-3">
            {/* Joint Comparison Sections */}
            {bilateralData.map((data) => (
              <JointComparisonSection
                key={data.jointType}
                data={data}
                compact={compact}
              />
            ))}

            {/* Trend Charts (only show if we have history) */}
            {repHistory.length >= 2 && !compact && (
              <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: BILATERAL_COLORS.border }}>
                <h4 className="text-xs font-semibold" style={{ color: BILATERAL_COLORS.textSecondary }}>
                  반복 추세 / Rep Trends
                </h4>
                {(['knee', 'hip', 'ankle'] as const).map((jointType) => (
                  <ImbalanceTrendChart
                    key={jointType}
                    history={repHistory}
                    jointType={jointType}
                    compact={compact}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Bottom gradient accent */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${BILATERAL_COLORS.leftSide}, ${BILATERAL_COLORS.primary}, ${BILATERAL_COLORS.rightSide})`,
        }}
      />
    </div>
  );
}
