'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from './constants';
import RepCard from './RepCard';
import type { RepSelectorPanelProps } from './types';

export default function RepSelectorPanel({
  reps,
  selectedRepIndex,
  onSelectRep,
  currentTime,
  language,
}: RepSelectorPanelProps) {
  const t = TRANSLATIONS[language];
  const currentMs = currentTime * 1000;

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
      }}
    >
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
      >
        {t.reps} ({reps.length})
      </h3>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {reps.map((rep, index) => {
          const isActive =
            currentMs >= rep.startTimestamp && currentMs <= rep.endTimestamp;

          return (
            <RepCard
              key={index}
              rep={rep}
              isSelected={selectedRepIndex === index}
              isActive={isActive}
              onClick={() => onSelectRep(index)}
              language={language}
            />
          );
        })}
      </div>
    </div>
  );
}
