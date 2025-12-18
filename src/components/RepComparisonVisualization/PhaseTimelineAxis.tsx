'use client';

import React from 'react';
import { PhaseTimelineAxisProps, MovementPhase } from './types';
import { REP_COMPARISON_COLORS, PHASE_LABELS } from './constants';

export default function PhaseTimelineAxis({ width, phases }: PhaseTimelineAxisProps) {
  const phaseCount = phases.length;
  const phaseWidth = width / (phaseCount - 1);

  return (
    <div
      className="flex justify-between mt-2 px-1"
      role="group"
      aria-label="Movement phases timeline"
    >
      {phases.map((phase, index) => {
        const label = PHASE_LABELS[phase];
        const isFirst = index === 0;
        const isLast = index === phases.length - 1;

        return (
          <div
            key={phase}
            className={`flex flex-col items-center ${isFirst ? 'items-start' : isLast ? 'items-end' : ''}`}
            style={{ flex: 1 }}
          >
            {/* Phase marker dot */}
            <div
              className="w-1.5 h-1.5 rounded-full mb-1"
              style={{ backgroundColor: REP_COMPARISON_COLORS.chartAxis }}
            />
            {/* Phase label */}
            <span
              className="text-[9px] text-center leading-tight"
              style={{ color: REP_COMPARISON_COLORS.textMuted }}
            >
              <span className="block">{label.ko}</span>
              <span className="block opacity-70">{label.en}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
