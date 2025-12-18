'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';

interface SessionLoadingSkeletonProps {
  count?: number;
}

export function SessionLoadingSkeleton({ count = 3 }: SessionLoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl p-4 animate-pulse"
          style={{
            backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
            border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg"
                style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
              />
              <div>
                <div
                  className="h-4 w-24 rounded mb-2"
                  style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
                />
                <div
                  className="h-3 w-32 rounded"
                  style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
                />
              </div>
            </div>
            <div className="text-right">
              <div
                className="h-3 w-16 rounded mb-2"
                style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
              />
              <div
                className="h-3 w-20 rounded"
                style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div
              className="h-8 w-32 rounded-lg"
              style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
            />
            <div
              className="h-8 w-16 rounded-lg"
              style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
