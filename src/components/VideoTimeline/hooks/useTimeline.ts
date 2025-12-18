'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  TimelineZoomState,
  ProblemMarker,
  MarkerCluster,
  ProblemSeverity,
} from '../types';
import type { FramePoseData } from '@/types/video';

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const CLUSTER_THRESHOLD_MS = 500; // Cluster markers within 500ms

interface UseTimelineOptions {
  duration: number;
  currentTime: number;
  frames: FramePoseData[];
  problemMarkers: ProblemMarker[];
  onSeek: (time: number) => void;
  initialZoom?: number;
}

export function useTimeline(options: UseTimelineOptions) {
  const {
    duration,
    currentTime,
    frames,
    problemMarkers,
    onSeek,
    initialZoom = 1,
  } = options;

  const [zoom, setZoom] = useState<TimelineZoomState>({
    level: initialZoom,
    centerTimestamp: 0,
    visibleRange: { start: 0, end: duration * 1000 },
  });

  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);
  const lastSeekRef = useRef<number>(0);

  // Update visible range when zoom changes
  const updateZoom = useCallback((newLevel: number, center?: number) => {
    const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newLevel));
    const durationMs = duration * 1000;
    const visibleDuration = durationMs / clampedLevel;
    const centerPoint = center ?? (currentTime * 1000);

    let start = centerPoint - visibleDuration / 2;
    let end = centerPoint + visibleDuration / 2;

    // Clamp to valid range
    if (start < 0) {
      start = 0;
      end = Math.min(visibleDuration, durationMs);
    }
    if (end > durationMs) {
      end = durationMs;
      start = Math.max(0, durationMs - visibleDuration);
    }

    setZoom({
      level: clampedLevel,
      centerTimestamp: centerPoint,
      visibleRange: { start, end },
    });
  }, [duration, currentTime]);

  // Get pose at specific timestamp
  const getPoseAtTimestamp = useCallback((timestampMs: number): FramePoseData | null => {
    if (!frames.length) return null;

    // Binary search for closest frame
    let left = 0;
    let right = frames.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (frames[mid].timestamp < timestampMs) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // Check if this frame or previous is closer
    if (left > 0) {
      const prevDiff = Math.abs(frames[left - 1].timestamp - timestampMs);
      const currDiff = Math.abs(frames[left].timestamp - timestampMs);
      if (prevDiff < currDiff) {
        return frames[left - 1];
      }
    }

    return frames[left] || null;
  }, [frames]);

  // Cluster problem markers to prevent overlap
  const clusteredMarkers = useMemo((): MarkerCluster[] => {
    if (!problemMarkers.length) return [];

    const sorted = [...problemMarkers].sort((a, b) => a.timestamp - b.timestamp);
    const clusters: MarkerCluster[] = [];
    let currentCluster: ProblemMarker[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const marker = sorted[i];
      const lastInCluster = currentCluster[currentCluster.length - 1];

      if (marker.timestamp - lastInCluster.timestamp <= CLUSTER_THRESHOLD_MS) {
        currentCluster.push(marker);
      } else {
        // Finalize current cluster
        if (currentCluster.length > 0) {
          clusters.push(createCluster(currentCluster));
        }
        currentCluster = [marker];
      }
    }

    // Add final cluster
    if (currentCluster.length > 0) {
      clusters.push(createCluster(currentCluster));
    }

    return clusters;
  }, [problemMarkers]);

  // Seek with debounce for performance
  const handleSeek = useCallback((timestampMs: number) => {
    const now = Date.now();
    if (now - lastSeekRef.current < 16) return; // ~60fps limit

    lastSeekRef.current = now;
    const timeSeconds = Math.max(0, Math.min(timestampMs / 1000, duration));
    onSeek(timeSeconds);
  }, [duration, onSeek]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const currentMs = currentTime * 1000;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        handleSeek(currentMs - (e.shiftKey ? 5000 : 1000));
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleSeek(currentMs + (e.shiftKey ? 5000 : 1000));
        break;
      case 'Home':
        e.preventDefault();
        handleSeek(0);
        break;
      case 'End':
        e.preventDefault();
        handleSeek(duration * 1000);
        break;
      case '+':
      case '=':
        e.preventDefault();
        updateZoom(zoom.level + 1);
        break;
      case '-':
        e.preventDefault();
        updateZoom(zoom.level - 1);
        break;
    }
  }, [currentTime, duration, handleSeek, updateZoom, zoom.level]);

  return {
    zoom,
    hoveredTimestamp,
    clusteredMarkers,
    updateZoom,
    setHoveredTimestamp,
    getPoseAtTimestamp,
    handleSeek,
    handleKeyDown,
  };
}

function createCluster(markers: ProblemMarker[]): MarkerCluster {
  const severityOrder: ProblemSeverity[] = ['critical', 'moderate', 'minor'];
  const dominantSeverity = markers.reduce((worst, marker) => {
    return severityOrder.indexOf(marker.severity) < severityOrder.indexOf(worst)
      ? marker.severity
      : worst;
  }, markers[0].severity);

  return {
    id: `cluster-${markers[0].id}`,
    startTimestamp: markers[0].timestamp,
    endTimestamp: markers[markers.length - 1].timestamp,
    markers,
    dominantSeverity,
  };
}
