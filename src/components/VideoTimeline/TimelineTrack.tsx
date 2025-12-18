'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { TIMELINE_COLORS } from './constants';
import ThumbnailStrip from './ThumbnailStrip';
import type { TimelineZoomState, MarkerCluster, RepBoundary } from './types';
import type { ThumbnailData } from '@/types/video';

interface TimelineTrackProps {
  duration: number;           // milliseconds
  currentTime: number;        // milliseconds
  zoom: TimelineZoomState;
  clusters: MarkerCluster[];
  repBoundaries: RepBoundary[];
  showMarkers: boolean;
  showRepBoundaries: boolean;
  onSeek: (timestamp: number) => void;
  onHover: (timestamp: number | null) => void;
  className?: string;
  thumbnails?: ThumbnailData[];           // Thumbnails for strip display
  showThumbnailStrip?: boolean;           // Whether to show thumbnail strip
  isThumbnailsLoading?: boolean;          // Loading state for thumbnails
}

export default function TimelineTrack({
  duration,
  currentTime,
  zoom,
  clusters,
  repBoundaries,
  showMarkers,
  showRepBoundaries,
  onSeek,
  onHover,
  className = '',
  thumbnails,
  showThumbnailStrip = true,
  isThumbnailsLoading = false,
}: TimelineTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate position from timestamp based on zoom
  const getPositionPercent = useCallback((timestamp: number): number => {
    const { start, end } = zoom.visibleRange;
    const range = end - start;
    if (range === 0) return 0;
    return ((timestamp - start) / range) * 100;
  }, [zoom.visibleRange]);

  // Calculate timestamp from mouse position
  const getTimestampFromEvent = useCallback((e: React.MouseEvent | MouseEvent): number => {
    if (!trackRef.current) return 0;

    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const { start, end } = zoom.visibleRange;

    return start + percent * (end - start);
  }, [zoom.visibleRange]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const timestamp = getTimestampFromEvent(e);
    onSeek(timestamp);
  }, [getTimestampFromEvent, onSeek]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const timestamp = getTimestampFromEvent(e);
    onHover(timestamp);

    if (isDragging) {
      onSeek(timestamp);
    }
  }, [getTimestampFromEvent, isDragging, onHover, onSeek]);

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  // Global mouse up listener for drag end
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  const progressPercent = getPositionPercent(currentTime);

  // Get marker color based on severity
  const getMarkerColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return TIMELINE_COLORS.markerProblemCritical;
      case 'moderate': return TIMELINE_COLORS.markerProblemModerate;
      case 'minor': return TIMELINE_COLORS.markerProblemMinor;
      default: return TIMELINE_COLORS.warning;
    }
  };

  return (
    <div
      ref={trackRef}
      className={`relative h-12 rounded-lg cursor-pointer select-none ${className}`}
      style={{ backgroundColor: TIMELINE_COLORS.timelineTrack }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="slider"
      aria-label="Video timeline"
      aria-valuenow={Math.round(currentTime / 1000)}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration / 1000)}
      tabIndex={0}
    >
      {/* Thumbnail strip as background layer - z-0 */}
      {showThumbnailStrip && (
        <ThumbnailStrip
          thumbnails={thumbnails ?? []}
          visibleRange={zoom.visibleRange}
          duration={duration}
          isLoading={isThumbnailsLoading}
          className="z-0"
        />
      )}

      {/* Progress fill - z-10 */}
      <div
        className="absolute top-0 left-0 h-full rounded-l-lg transition-all duration-75 z-10"
        style={{
          width: `${Math.max(0, Math.min(100, progressPercent))}%`,
          backgroundColor: TIMELINE_COLORS.timelineProgress,
          opacity: 0.3,
        }}
      />

      {/* Rep boundaries - z-20 */}
      {showRepBoundaries && repBoundaries.map((rep) => {
        const startPercent = getPositionPercent(rep.startTimestamp);
        const endPercent = getPositionPercent(rep.endTimestamp);
        const isVisible = endPercent > 0 && startPercent < 100;

        if (!isVisible) return null;

        return (
          <div
            key={rep.id}
            className="absolute top-0 h-full border-l-2 border-r-2 z-20"
            style={{
              left: `${Math.max(0, startPercent)}%`,
              width: `${Math.min(100, endPercent) - Math.max(0, startPercent)}%`,
              borderColor: TIMELINE_COLORS.markerRepBoundary,
              backgroundColor: `${TIMELINE_COLORS.markerRepBoundary}15`,
            }}
          >
            <span
              className="absolute -top-5 left-1 text-xs font-medium"
              style={{ color: TIMELINE_COLORS.markerRepBoundary }}
            >
              Rep {rep.repNumber}
            </span>
          </div>
        );
      })}

      {/* Problem markers - z-30 */}
      {showMarkers && clusters.map((cluster) => {
        const position = getPositionPercent(
          (cluster.startTimestamp + cluster.endTimestamp) / 2
        );
        const isVisible = position >= 0 && position <= 100;

        if (!isVisible) return null;

        return (
          <div
            key={cluster.id}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-pointer hover:scale-125 transition-transform z-30"
            style={{
              left: `${position}%`,
              backgroundColor: getMarkerColor(cluster.dominantSeverity),
              boxShadow: `0 0 8px ${getMarkerColor(cluster.dominantSeverity)}`,
            }}
            title={`${cluster.markers.length} issue${cluster.markers.length > 1 ? 's' : ''}`}
          >
            {cluster.markers.length > 1 && (
              <span
                className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold"
                style={{ color: TIMELINE_COLORS.textPrimary }}
              >
                {cluster.markers.length}
              </span>
            )}
          </div>
        );
      })}

      {/* Scrubber handle - z-40 */}
      <div
        className="absolute top-0 h-full w-1 -translate-x-1/2 transition-all duration-75 z-40"
        style={{
          left: `${progressPercent}%`,
          backgroundColor: isDragging
            ? TIMELINE_COLORS.scrubberHandleActive
            : TIMELINE_COLORS.scrubberHandle,
        }}
      >
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full shadow-lg"
          style={{
            backgroundColor: isDragging
              ? TIMELINE_COLORS.scrubberHandleActive
              : TIMELINE_COLORS.scrubberHandle,
          }}
        />
      </div>
    </div>
  );
}
