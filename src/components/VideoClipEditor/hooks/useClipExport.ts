'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  ClipBoundary,
  ClipExportStatus,
  ClipExportProgress,
  ClippedSegmentMetadata,
  ClippedSession,
} from '@/types/videoClip';
import type { VideoAnalysisResult, VideoRepAnalysisResult } from '@/types/video';

interface UseClipExportOptions {
  parentSessionId: string;
  onComplete?: (session: ClippedSession) => void;
  onError?: (error: Error) => void;
}

interface ExportResult {
  session: ClippedSession;
}

export function useClipExport(options: UseClipExportOptions) {
  const { parentSessionId, onComplete, onError } = options;

  const [progress, setProgress] = useState<ClipExportProgress>({
    status: 'idle',
    percent: 0,
    message: '',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const resultRef = useRef<ClippedSession | null>(null);

  // Generate unique ID
  const generateId = (): string => {
    return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Start export process
  const startExport = useCallback(async (
    clipBoundary: ClipBoundary,
    selectedReps: number[],
    existingAnalysis?: VideoAnalysisResult,
    existingRepAnalysis?: VideoRepAnalysisResult,
  ): Promise<ExportResult | null> => {
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Update status to exporting
      setProgress({
        status: 'exporting',
        percent: 0,
        message: 'Preparing clip...',
      });

      // Create clip metadata
      const clipId = generateId();
      const metadata: ClippedSegmentMetadata = {
        id: clipId,
        parentSessionId,
        originalVideoTimestamps: {
          start: clipBoundary.startTimestamp,
          end: clipBoundary.endTimestamp,
        },
        clipBoundary,
        selectedReps,
        createdAt: Date.now(),
        durationMs: clipBoundary.endTimestamp - clipBoundary.startTimestamp,
      };

      // Simulate export progress
      for (let i = 0; i <= 30; i += 10) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Export cancelled');
        }
        setProgress({
          status: 'exporting',
          percent: i,
          message: 'Extracting clip frames...',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Extract relevant frames from existing analysis if available
      let clippedAnalysis: VideoAnalysisResult | undefined;
      if (existingAnalysis) {
        const clippedFrames = existingAnalysis.frames.filter(
          frame => frame.timestamp >= clipBoundary.startTimestamp &&
                   frame.timestamp <= clipBoundary.endTimestamp
        );

        clippedAnalysis = {
          ...existingAnalysis,
          id: clipId,
          frames: clippedFrames,
          summary: {
            ...existingAnalysis.summary,
            totalFrames: clippedFrames.length,
            successfulFrames: clippedFrames.filter(f => f.pose !== null).length,
            failedFrames: clippedFrames.filter(f => f.pose === null).length,
          },
        };
      }

      // Update to analyzing status
      setProgress({
        status: 'analyzing',
        percent: 50,
        message: 'Analyzing clip...',
      });

      // Simulate analysis progress
      for (let i = 50; i <= 90; i += 10) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Export cancelled');
        }
        setProgress({
          status: 'analyzing',
          percent: i,
          message: 'Processing pose data...',
        });
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Extract relevant rep analysis if available
      let clippedRepAnalysis: VideoRepAnalysisResult | undefined;
      if (existingRepAnalysis && selectedReps.length > 0) {
        const clippedReps = existingRepAnalysis.reps.filter(
          rep => selectedReps.includes(rep.repNumber)
        );

        if (clippedReps.length > 0) {
          const avgScore = clippedReps.reduce((sum, r) => sum + r.score, 0) / clippedReps.length;
          const avgDuration = clippedReps.reduce((sum, r) => sum + r.duration, 0) / clippedReps.length;

          clippedRepAnalysis = {
            ...existingRepAnalysis,
            id: clipId,
            videoAnalysisId: clipId,
            totalReps: clippedReps.length,
            reps: clippedReps,
            summary: {
              averageScore: avgScore,
              minScore: Math.min(...clippedReps.map(r => r.score)),
              maxScore: Math.max(...clippedReps.map(r => r.score)),
              totalDuration: clippedReps.reduce((sum, r) => sum + r.duration, 0),
              averageRepDuration: avgDuration,
            },
          };
        }
      }

      // Create clipped session
      const clippedSession: ClippedSession = {
        id: clipId,
        metadata,
        analysisResult: clippedAnalysis,
        repAnalysisResult: clippedRepAnalysis,
        status: 'completed',
      };

      // Final progress update
      setProgress({
        status: 'completed',
        percent: 100,
        message: 'Clip ready!',
      });

      resultRef.current = clippedSession;
      onComplete?.(clippedSession);

      return { session: clippedSession };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setProgress({
        status: 'error',
        percent: 0,
        message: errorMessage,
      });

      onError?.(error instanceof Error ? error : new Error(errorMessage));
      return null;
    }
  }, [parentSessionId, onComplete, onError]);

  // Cancel export
  const cancelExport = useCallback(() => {
    abortControllerRef.current?.abort();
    setProgress({
      status: 'idle',
      percent: 0,
      message: '',
    });
  }, []);

  // Reset state
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    resultRef.current = null;
    setProgress({
      status: 'idle',
      percent: 0,
      message: '',
    });
  }, []);

  return {
    status: progress.status,
    progress: progress.percent,
    message: progress.message,
    result: resultRef.current,
    startExport,
    cancelExport,
    reset,
  };
}
