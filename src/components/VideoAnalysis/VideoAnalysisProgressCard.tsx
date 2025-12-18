'use client';

import React from 'react';
import type { VideoAnalysisProgress, VideoAnalysisStatus } from '@/types/video';
import { ANALYSIS_COLORS } from './constants';
import AnalysisStatusBadge from './AnalysisStatusBadge';
import AnalysisProgressBar from './AnalysisProgressBar';
import FrameCounter from './FrameCounter';
import TimeEstimateDisplay from './TimeEstimateDisplay';
import ProcessingRateIndicator from './ProcessingRateIndicator';
import FailedFramesIndicator from './FailedFramesIndicator';
import CancelAnalysisButton from './CancelAnalysisButton';

interface VideoAnalysisProgressCardProps {
  progress: VideoAnalysisProgress;
  onCancel: () => void;
}

export default function VideoAnalysisProgressCard({
  progress,
  onCancel,
}: VideoAnalysisProgressCardProps) {
  const canCancel = progress.status === 'initializing' ||
    progress.status === 'extracting' ||
    progress.status === 'processing';

  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{
        backgroundColor: ANALYSIS_COLORS.background,
        border: `1px solid ${ANALYSIS_COLORS.border}`,
      }}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <AnalysisStatusBadge status={progress.status} />
      </div>

      {/* Progress bar */}
      <AnalysisProgressBar percent={progress.percent} />

      {/* Frame counter */}
      <FrameCounter
        current={progress.currentFrame}
        total={progress.totalFrames}
      />

      {/* Time and rate row */}
      <div className="flex justify-between items-center">
        <TimeEstimateDisplay remainingMs={progress.estimatedTimeRemaining} />
        <ProcessingRateIndicator rate={progress.processingRate} />
      </div>

      {/* Failed frames warning */}
      {progress.failedFrames > 0 && (
        <FailedFramesIndicator count={progress.failedFrames} />
      )}

      {/* Cancel button */}
      {canCancel && (
        <div className="pt-2">
          <CancelAnalysisButton
            onClick={onCancel}
            disabled={!canCancel}
          />
        </div>
      )}
    </div>
  );
}
