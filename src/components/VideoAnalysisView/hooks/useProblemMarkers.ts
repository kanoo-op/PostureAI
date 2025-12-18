'use client';

import { useMemo } from 'react';
import type { FramePoseData, VideoRepAnalysisResult } from '@/types/video';
import type { ProblemMarker, ProblemMarkerGroup } from '../types';

const SCORE_THRESHOLDS = {
  error: 60,    // score < 60 = error
  warning: 80,  // 60 <= score < 80 = warning
};

const GROUPING_THRESHOLD_MS = 500; // Group markers within 500ms
const TIMESTAMP_TOLERANCE_MS = 100; // 100ms tolerance for timestamp matching

/**
 * Extract feedbacks for a given timestamp from rep analysis result
 */
function getFeedbacksForTimestamp(
  timestamp: number,
  repResult?: VideoRepAnalysisResult
): string[] {
  if (!repResult) return [];

  const feedbacks: string[] = [];

  for (const rep of repResult.reps) {
    // Check if timestamp falls within this rep
    if (timestamp >= rep.startTimestamp && timestamp <= rep.endTimestamp) {
      // Check worst moment proximity
      if (Math.abs(timestamp - rep.worstMoment.timestamp) <= TIMESTAMP_TOLERANCE_MS) {
        feedbacks.push(...rep.worstMoment.feedbacks);
      }
      // Add primary issues if score is low
      if (rep.primaryIssues.length > 0) {
        const uniqueFeedbacks = rep.primaryIssues.filter(
          f => !feedbacks.includes(f)
        );
        feedbacks.push(...uniqueFeedbacks.slice(0, 3));
      }
      break;
    }
  }

  return feedbacks.slice(0, 5); // Limit to 5 feedbacks
}

export function useProblemMarkers(
  frames: FramePoseData[] | undefined,
  duration: number,
  repAnalysisResult?: VideoRepAnalysisResult
): { markers: ProblemMarker[]; groups: ProblemMarkerGroup[] } {
  return useMemo(() => {
    if (!frames || frames.length === 0 || duration <= 0) {
      return { markers: [], groups: [] };
    }

    // Step 1: Identify problem frames
    const markers: ProblemMarker[] = [];

    for (const frame of frames) {
      // Skip frames without pose data or with high confidence/score
      if (!frame.pose || frame.confidence >= SCORE_THRESHOLDS.warning / 100) continue;

      // Calculate frame score based on confidence (0-100 scale)
      const score = Math.round(frame.confidence * 100);

      if (score < SCORE_THRESHOLDS.warning) {
        const level: 'error' | 'warning' = score < SCORE_THRESHOLDS.error ? 'error' : 'warning';

        // Get feedbacks from rep analysis data
        const feedbacks = getFeedbacksForTimestamp(
          frame.timestamp,
          repAnalysisResult
        );

        markers.push({
          timestamp: frame.timestamp,
          timestampSeconds: frame.timestamp / 1000,
          score,
          level,
          feedbacks,
          feedbackCount: Math.max(1, feedbacks.length),
        });
      }
    }

    // Step 2: Group nearby markers for optimization
    const groups: ProblemMarkerGroup[] = [];
    let currentGroup: ProblemMarker[] = [];

    const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);

    for (const marker of sortedMarkers) {
      if (currentGroup.length === 0) {
        currentGroup.push(marker);
      } else {
        const lastMarker = currentGroup[currentGroup.length - 1];
        if (marker.timestamp - lastMarker.timestamp <= GROUPING_THRESHOLD_MS) {
          currentGroup.push(marker);
        } else {
          // Finalize current group
          if (currentGroup.length > 0) {
            groups.push(createGroup(currentGroup));
          }
          currentGroup = [marker];
        }
      }
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push(createGroup(currentGroup));
    }

    return { markers: sortedMarkers, groups };
  }, [frames, duration, repAnalysisResult]);
}

function createGroup(markers: ProblemMarker[]): ProblemMarkerGroup {
  const hasError = markers.some(m => m.level === 'error');
  return {
    startTimestamp: markers[0].timestamp,
    endTimestamp: markers[markers.length - 1].timestamp,
    markers,
    primaryLevel: hasError ? 'error' : 'warning',
    totalFeedbackCount: markers.reduce((sum, m) => sum + m.feedbackCount, 0),
  };
}
