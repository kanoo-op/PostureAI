'use client';

import React from 'react';
import { ChartLegendProps } from './types';
import { REP_COMPARISON_COLORS, JOINT_ANGLE_LABELS } from './constants';

export default function ChartLegend({ selectedReps, selectedJoints }: ChartLegendProps) {
  if (selectedReps.length === 0 && selectedJoints.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap gap-x-4 gap-y-2 p-2 rounded-lg"
      style={{ backgroundColor: REP_COMPARISON_COLORS.surfaceElevated }}
      role="group"
      aria-label="Chart legend"
    >
      {/* Rep legends */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
          렙 / Reps:
        </span>
        {selectedReps.map((rep) => (
          <div key={rep.repNumber} className="flex items-center gap-1">
            <div
              className="w-3 h-0.5 rounded-full"
              style={{ backgroundColor: rep.color }}
            />
            <span className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textSecondary }}>
              {rep.repNumber}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      {selectedReps.length > 0 && selectedJoints.length > 0 && (
        <div
          className="w-px h-4 self-center"
          style={{ backgroundColor: REP_COMPARISON_COLORS.border }}
        />
      )}

      {/* Joint legends */}
      {selectedJoints.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
            관절 / Joints:
          </span>
          {selectedJoints.map((jointType) => {
            const label = JOINT_ANGLE_LABELS[jointType];
            return (
              <span
                key={jointType}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: REP_COMPARISON_COLORS.surface,
                  color: REP_COMPARISON_COLORS.textSecondary,
                }}
              >
                {label.ko}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
