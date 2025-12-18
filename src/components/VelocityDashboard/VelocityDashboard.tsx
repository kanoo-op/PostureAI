'use client';

import React from 'react';
import { VELOCITY_COLORS } from './constants';
import VelocityGauge from './VelocityGauge';
import MovementPhaseIndicator from './MovementPhaseIndicator';
import TempoFeedbackCard from './TempoFeedbackCard';
import type { VelocityAnalysisResult, TrackedJoint } from '@/types/velocity';

interface VelocityDashboardProps {
  result: VelocityAnalysisResult | null;
  isVisible?: boolean;
  compact?: boolean;
  className?: string;
}

export default function VelocityDashboard({
  result,
  isVisible = true,
  compact = false,
  className = '',
}: VelocityDashboardProps) {
  if (!isVisible || !result) return null;

  // Get primary joint velocity for main display
  const jointEntries = Object.entries(result.joints);
  const primaryJoint = jointEntries.length > 0 ? jointEntries[0][1] : null;

  return (
    <div
      className={`rounded-2xl overflow-hidden border shadow-2xl ${
        compact ? 'max-w-xs' : 'w-full max-w-sm'
      } ${className}`}
      style={{
        backgroundColor: VELOCITY_COLORS.background,
        borderColor: VELOCITY_COLORS.border,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${VELOCITY_COLORS.border}` }}
      >
        <h3 className="font-semibold" style={{ color: VELOCITY_COLORS.textPrimary }}>
          Movement Velocity
        </h3>
        <MovementPhaseIndicator phase={result.currentPhase} progress={result.phaseProgress} />
      </div>

      {/* Main content */}
      <div className="p-4 space-y-4">
        {/* Primary velocity gauge */}
        {primaryJoint && (
          <div className="flex items-center justify-center">
            <VelocityGauge
              velocity={primaryJoint.smoothedVelocity}
              category={primaryJoint.category}
              size="lg"
            />
          </div>
        )}

        {/* Feedback card */}
        <TempoFeedbackCard
          tempo={result.tempo}
          currentFeedback={result.feedbackMessage}
          overallQuality={result.overallQuality}
        />

        {/* Joint velocity breakdown (compact view) */}
        {!compact && (
          <div className="grid grid-cols-2 gap-2">
            {jointEntries.map(([joint, data]) => (
              <div
                key={joint}
                className="p-2 rounded-lg flex items-center gap-2"
                style={{ backgroundColor: VELOCITY_COLORS.surfaceElevated }}
              >
                <VelocityGauge
                  velocity={data.smoothedVelocity}
                  category={data.category}
                  size="sm"
                />
                <div>
                  <span
                    className="text-xs capitalize"
                    style={{ color: VELOCITY_COLORS.textMuted }}
                  >
                    {formatJointName(joint as TrackedJoint)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom gradient accent */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${VELOCITY_COLORS.velocity.slow}, ${VELOCITY_COLORS.velocity.optimal}, ${VELOCITY_COLORS.velocity.fast})`,
        }}
      />
    </div>
  );
}

/**
 * Format joint name for display
 */
function formatJointName(joint: TrackedJoint): string {
  return joint
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
