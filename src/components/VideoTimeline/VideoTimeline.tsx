'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TIMELINE_COLORS } from './constants';
import { useTimeline } from './hooks/useTimeline';
import { useThumbnailCache } from './hooks/useThumbnailCache';
import TimelineTrack from './TimelineTrack';
import PosePreviewPanel from './PosePreviewPanel';
import TimelineZoomControls from './TimelineZoomControls';
import TimeStampDisplay from './TimeStampDisplay';
import TimelineTooltip from './TimelineTooltip';
import ThumbnailHoverPreview from './ThumbnailHoverPreview';
import type { VideoTimelineProps, ProblemMarker } from './types';
import type { Keypoint3D } from '@/types/pose';

export default function VideoTimeline({
  analysisResult,
  currentTime,
  duration,
  isPlaying,
  problemMarkers,
  repBoundaries,
  onSeek,
  onPoseChange,
  className = '',
  showPosePreview = true,
  showProblemMarkers = true,
  showRepBoundaries = true,
  initialZoom = 1,
  thumbnails = [],
  showThumbnailStrip = true,
  isThumbnailsLoading = false,
}: VideoTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const frames = analysisResult?.frames ?? [];

  const {
    zoom,
    hoveredTimestamp,
    clusteredMarkers,
    updateZoom,
    setHoveredTimestamp,
    getPoseAtTimestamp,
    handleSeek,
    handleKeyDown,
  } = useTimeline({
    duration,
    currentTime,
    frames,
    problemMarkers,
    onSeek,
    initialZoom,
  });

  // Initialize thumbnail cache
  const { hoveredThumbnail } = useThumbnailCache({
    thumbnails,
    visibleRange: zoom.visibleRange,
    hoveredTimestamp,
  });

  // Get current pose data
  const currentFrameData = getPoseAtTimestamp(currentTime * 1000);
  const currentPose = currentFrameData?.pose?.keypoints3D ?? currentFrameData?.pose?.keypoints ?? null;
  const currentConfidence = currentFrameData?.confidence ?? 0;

  // Get hovered pose for preview
  const hoveredFrameData = hoveredTimestamp !== null
    ? getPoseAtTimestamp(hoveredTimestamp)
    : null;
  const hoveredPose = hoveredFrameData?.pose?.keypoints3D ?? hoveredFrameData?.pose?.keypoints ?? null;
  const hoveredConfidence = hoveredFrameData?.confidence ?? 0;

  // Notify parent of pose changes
  useEffect(() => {
    if (onPoseChange && currentFrameData) {
      onPoseChange(
        currentPose as Keypoint3D[] | null,
        currentFrameData.frameIndex
      );
    }
  }, [currentFrameData, currentPose, onPoseChange]);

  // Keyboard event handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDownEvent = (e: KeyboardEvent) => handleKeyDown(e);
    container.addEventListener('keydown', handleKeyDownEvent);

    return () => container.removeEventListener('keydown', handleKeyDownEvent);
  }, [handleKeyDown]);

  // Track mouse position for tooltip
  const handleTrackMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  }, []);

  // Find markers near hovered timestamp
  const getMarkersAtTimestamp = (timestamp: number): ProblemMarker[] => {
    const threshold = 500; // 500ms window
    return problemMarkers.filter(
      m => Math.abs(m.timestamp - timestamp) <= threshold
    );
  };

  const hoveredMarkers = hoveredTimestamp !== null
    ? getMarkersAtTimestamp(hoveredTimestamp)
    : [];

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl overflow-hidden border ${className}`}
      style={{
        backgroundColor: TIMELINE_COLORS.background,
        borderColor: TIMELINE_COLORS.surface,
      }}
      tabIndex={0}
      role="region"
      aria-label="Video timeline with pose preview"
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${TIMELINE_COLORS.surface}` }}
      >
        <h3
          className="font-semibold"
          style={{ color: TIMELINE_COLORS.textPrimary }}
        >
          Timeline
        </h3>
        <div className="flex items-center gap-4">
          <TimeStampDisplay
            currentTime={currentTime}
            duration={duration}
          />
          <TimelineZoomControls
            currentZoom={zoom.level}
            onZoomChange={(level) => updateZoom(level)}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Pose preview panel */}
          {showPosePreview && (
            <PosePreviewPanel
              keypoints={(hoveredPose ?? currentPose) as Keypoint3D[] | null}
              timestamp={hoveredTimestamp ?? (currentTime * 1000)}
              confidence={hoveredTimestamp !== null ? hoveredConfidence : currentConfidence}
            />
          )}

          {/* Timeline track */}
          <div
            className="flex-1"
            onMouseMove={handleTrackMouseMove}
          >
            <TimelineTrack
              duration={duration * 1000}
              currentTime={currentTime * 1000}
              zoom={zoom}
              clusters={clusteredMarkers}
              repBoundaries={repBoundaries}
              showMarkers={showProblemMarkers}
              showRepBoundaries={showRepBoundaries}
              onSeek={handleSeek}
              onHover={setHoveredTimestamp}
              thumbnails={thumbnails}
              showThumbnailStrip={showThumbnailStrip}
              isThumbnailsLoading={isThumbnailsLoading}
            />

            {/* Time markers */}
            <div
              className="flex justify-between mt-2 text-xs"
              style={{ color: TIMELINE_COLORS.textMuted }}
            >
              <span>{formatMs(zoom.visibleRange.start)}</span>
              <span>{formatMs(zoom.visibleRange.end)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <TimelineTooltip
        timestamp={hoveredTimestamp ?? 0}
        markers={hoveredMarkers}
        position={tooltipPosition}
        visible={hoveredTimestamp !== null}
      />

      {/* Thumbnail hover preview */}
      {showThumbnailStrip && (
        <ThumbnailHoverPreview
          thumbnail={hoveredThumbnail}
          position={tooltipPosition}
          visible={hoveredTimestamp !== null && hoveredThumbnail !== null}
        />
      )}

      {/* Bottom gradient accent */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${TIMELINE_COLORS.primary}, ${TIMELINE_COLORS.success})`,
        }}
      />
    </div>
  );
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
