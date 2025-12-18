// src/components/AngleDashboard/DashboardSkeleton.tsx

'use client';

import React from 'react';
import { DASHBOARD_COLORS } from './constants';

export default function DashboardSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ backgroundColor: DASHBOARD_COLORS.background }}
    >
      {/* Header skeleton */}
      <div className="px-4 py-3 border-b" style={{ borderColor: DASHBOARD_COLORS.border }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-700" />
            <div className="w-2 h-2 rounded-full bg-gray-700" />
            <div className="w-2 h-2 rounded-full bg-gray-700" />
          </div>
          <div className="h-4 w-32 bg-gray-700 rounded" />
        </div>
      </div>

      {/* Body part sections skeleton */}
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-gray-700" />
              <div className="h-4 w-20 bg-gray-700 rounded" />
            </div>
            <div className="space-y-2 pl-3">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="h-16 rounded-xl bg-gray-800/50"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
