'use client';

import React, { useState } from 'react';
import { JointComparisonSectionProps } from './types';
import { BILATERAL_COLORS, JOINT_LABELS } from './constants';
import AngleComparisonBar from './AngleComparisonBar';
import SymmetryScoreBadge from './SymmetryScoreBadge';
import SeverityIndicator from './SeverityIndicator';
import DominantSideIndicator from './DominantSideIndicator';

export default function JointComparisonSection({
  data,
  expanded: controlledExpanded,
  onToggle,
  compact = false,
}: JointComparisonSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const expanded = controlledExpanded ?? internalExpanded;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const jointColor = BILATERAL_COLORS.joint[data.jointType];
  const label = JOINT_LABELS[data.jointType];

  if (compact) {
    return (
      <div
        className="p-3 rounded-lg border"
        style={{
          backgroundColor: BILATERAL_COLORS.surface,
          borderColor: BILATERAL_COLORS.border,
          borderLeft: `3px solid ${jointColor}`,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: BILATERAL_COLORS.textPrimary }}>
            {label.ko}
          </span>
          <SymmetryScoreBadge score={data.symmetryScore} level={data.level} size="sm" />
        </div>
        <AngleComparisonBar
          leftAngle={data.leftAngle}
          rightAngle={data.rightAngle}
          level={data.level}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: BILATERAL_COLORS.surface,
        borderColor: BILATERAL_COLORS.border,
      }}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        style={{ borderLeft: `4px solid ${jointColor}` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: BILATERAL_COLORS.textPrimary }}>
            {label.ko} / {label.en}
          </span>
          <SeverityIndicator level={data.level} difference={data.difference} />
        </div>

        <div className="flex items-center gap-3">
          <SymmetryScoreBadge score={data.symmetryScore} level={data.level} size="sm" />
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            style={{ color: BILATERAL_COLORS.textMuted }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-3">
          <AngleComparisonBar
            leftAngle={data.leftAngle}
            rightAngle={data.rightAngle}
            level={data.level}
          />

          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: BILATERAL_COLORS.border }}>
            <DominantSideIndicator side={data.dominantSide} jointName={label.en} />
            <span className="text-xs" style={{ color: BILATERAL_COLORS.textMuted }}>
              차이 / Diff: {data.difference.toFixed(1)}°
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
