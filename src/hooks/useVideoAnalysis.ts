'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  VideoAnalysisStatus,
  VideoAnalysisConfig,
  VideoAnalysisProgress,
  VideoAnalysisResult,
} from '@/types/video';
import { processVideoFrames } from '@/utils/videoPoseProcessor';
import { DEFAULT_VIDEO_ANALYSIS_CONFIG } from '@/components/VideoAnalysis/constants';

interface UseVideoAnalysisState {
  status: VideoAnalysisStatus;
  progress: VideoAnalysisProgress | null;
  result: VideoAnalysisResult | null;
  error: string | null;
}

interface UseVideoAnalysisReturn extends UseVideoAnalysisState {
  startAnalysis: (video: HTMLVideoElement, config?: Partial<VideoAnalysisConfig>) => Promise<void>;
  cancelAnalysis: () => void;
  resetAnalysis: () => void;
}

const initialState: UseVideoAnalysisState = {
  status: 'idle',
  progress: null,
  result: null,
  error: null,
};

/**
 * React hook for managing video analysis lifecycle.
 * Provides state management, cancellation, and progress tracking for
 * frame-by-frame pose extraction from video.
 */
export function useVideoAnalysis(): UseVideoAnalysisReturn {
  const [state, setState] = useState<UseVideoAnalysisState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAnalyzingRef = useRef(false);

  /**
   * Starts video analysis with the provided configuration.
   * Merges user config with defaults.
   */
  const startAnalysis = useCallback(async (
    video: HTMLVideoElement,
    userConfig?: Partial<VideoAnalysisConfig>
  ): Promise<void> => {
    // Prevent multiple simultaneous analyses
    if (isAnalyzingRef.current) {
      console.warn('Analysis already in progress');
      return;
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    isAnalyzingRef.current = true;

    // Merge user config with defaults
    const config: VideoAnalysisConfig = {
      ...DEFAULT_VIDEO_ANALYSIS_CONFIG,
      ...userConfig,
    };

    // Reset state and set to initializing
    setState({
      status: 'initializing',
      progress: null,
      result: null,
      error: null,
    });

    try {
      const result = await processVideoFrames(
        video,
        config,
        (progress) => {
          setState(prev => ({
            ...prev,
            status: progress.status,
            progress,
          }));
        },
        abortControllerRef.current.signal
      );

      // Analysis completed successfully
      setState({
        status: 'completed',
        progress: {
          status: 'completed',
          currentFrame: result.summary.totalFrames,
          totalFrames: result.summary.totalFrames,
          percent: 100,
          estimatedTimeRemaining: 0,
          processingRate: result.summary.averageProcessingRate,
          failedFrames: result.summary.failedFrames,
        },
        result,
        error: null,
      });
    } catch (error) {
      // Handle cancellation
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          status: 'cancelled',
          error: null,
        }));
        return;
      }

      // Handle other errors
      const errorMessage = error instanceof Error
        ? error.message
        : '분석 중 오류가 발생했습니다.';

      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
    } finally {
      isAnalyzingRef.current = false;
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Cancels the current analysis if one is in progress.
   */
  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Resets the analysis state to initial values.
   */
  const resetAnalysis = useCallback(() => {
    // Cancel any ongoing analysis first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(initialState);
    isAnalyzingRef.current = false;
    abortControllerRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    startAnalysis,
    cancelAnalysis,
    resetAnalysis,
  };
}
