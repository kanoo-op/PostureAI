// src/components/AngleDashboard/BodyPartSection.tsx

'use client';

import React, { useState } from 'react';
import { BodyPartSectionProps } from './types';
import { DASHBOARD_COLORS } from './constants';
import AngleCard from './AngleCard';

export default function BodyPartSection({
  group,
  expanded: controlledExpanded,
  onToggleExpand,
}: BodyPartSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const expanded = controlledExpanded ?? internalExpanded;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const { id, labelKo, icon, angles, overallStatus } = group;
  const accentColor = DASHBOARD_COLORS.bodyPart[id];
  const statusColor = DASHBOARD_COLORS.status[overallStatus];

  return (
    <div className="mb-3">
      {/* Section Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-gray-800/50"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-gray-200">
            {labelKo}
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </div>

        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Angles Grid */}
      {expanded && (
        <div className="mt-2 grid grid-cols-1 gap-2 pl-3">
          {angles.map((angle) => (
            <AngleCard
              key={angle.jointType}
              angle={angle}
              showGauge={true}
              showTrend={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
