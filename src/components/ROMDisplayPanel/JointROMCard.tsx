'use client';

import React from 'react';
import { ROM_COLORS, ASSESSMENT_STATUS_MAP, ROM_LABELS } from './constants';
import { JointROMCardProps } from './types';
import { getROMStatus } from '@/utils/jointROMAnalyzer';
import ROMProgressBar from './ROMProgressBar';

export default function JointROMCard({
  result,
  currentAngle,
  compact = false,
}: JointROMCardProps) {
  const { benchmark, assessment, minAngle, maxAngle, rangeAchieved, percentOfNormal } = result;
  const statusInfo = getROMStatus(assessment);
  const statusKey = ASSESSMENT_STATUS_MAP[assessment];

  return (
    <div
      className={`
        relative rounded-xl border transition-all duration-200
        ${compact ? 'p-2' : 'p-3'}
      `}
      style={{
        backgroundColor: ROM_COLORS.surface,
        borderColor: ROM_COLORS.border,
      }}
    >
      {/* Header: Joint name + Assessment badge */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4
            className="font-semibold text-sm"
            style={{ color: ROM_COLORS.textPrimary }}
          >
            {benchmark.jointName}
          </h4>
          <span
            className="text-xs"
            style={{ color: ROM_COLORS.textMuted }}
          >
            {benchmark.jointNameEn}
          </span>
        </div>

        {/* Assessment Badge */}
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: statusKey === 'hypermobile'
              ? ROM_COLORS.status.hypermobileBg
              : statusKey === 'warning'
                ? ROM_COLORS.status.warningBg
                : ROM_COLORS.status.goodBg,
            color: statusInfo.color,
          }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Angle Values */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Min */}
        <div className="text-center">
          <span
            className="text-xs block"
            style={{ color: ROM_COLORS.textMuted }}
          >
            Min
          </span>
          <span
            className="font-mono text-lg font-bold"
            style={{ color: ROM_COLORS.textPrimary }}
          >
            {minAngle.toFixed(0)}
            <span className="text-xs text-gray-500">deg</span>
          </span>
        </div>

        {/* Current (if available) */}
        <div className="text-center">
          <span
            className="text-xs block"
            style={{ color: ROM_COLORS.textMuted }}
          >
            {currentAngle !== undefined ? 'Current' : 'Range'}
          </span>
          <span
            className="font-mono text-lg font-bold"
            style={{ color: ROM_COLORS.primary }}
          >
            {currentAngle !== undefined
              ? currentAngle.toFixed(0)
              : rangeAchieved.toFixed(0)}
            <span className="text-xs text-gray-500">deg</span>
          </span>
        </div>

        {/* Max */}
        <div className="text-center">
          <span
            className="text-xs block"
            style={{ color: ROM_COLORS.textMuted }}
          >
            Max
          </span>
          <span
            className="font-mono text-lg font-bold"
            style={{ color: ROM_COLORS.textPrimary }}
          >
            {maxAngle.toFixed(0)}
            <span className="text-xs text-gray-500">deg</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <ROMProgressBar
        percentOfNormal={percentOfNormal}
        assessment={assessment}
        showLabel={!compact}
      />

      {/* Normal range reference */}
      {!compact && (
        <div
          className="mt-2 text-xs text-center"
          style={{ color: ROM_COLORS.textMuted }}
        >
          {ROM_LABELS.normalRange.ko}: {benchmark.normalRange.min}deg - {benchmark.normalRange.max}deg
        </div>
      )}
    </div>
  );
}
