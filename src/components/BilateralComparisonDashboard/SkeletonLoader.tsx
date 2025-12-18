'use client';

import React from 'react';
import { BILATERAL_COLORS } from './constants';

export default function SkeletonLoader() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ backgroundColor: BILATERAL_COLORS.background }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: BILATERAL_COLORS.border }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-700" />
            <div className="w-2 h-2 rounded-full bg-gray-700" />
          </div>
          <div className="h-4 w-40 bg-gray-700 rounded" />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}
