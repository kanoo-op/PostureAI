import { useState, useCallback, useRef, useMemo } from 'react';
import type { FramePoseData } from '@/types/video';
import type { DetectionState, DetectionConfig, ExerciseDetectionResult } from '@/types/exerciseDetection';
import { detectExerciseFromFrames } from '@/utils/exerciseDetector';
import { getCachedDetection, cacheDetectionResult } from '@/utils/detectionCache';
import { DEFAULT_DETECTION_CONFIG } from '@/utils/exerciseProfiles';

export function useExerciseDetection(config?: Partial<DetectionConfig>) {
  const fullConfig = useMemo(() => ({ ...DEFAULT_DETECTION_CONFIG, ...config }), [config]);

  const [state, setState] = useState<DetectionState>({
    status: 'idle',
    progress: 0,
    result: null,
    error: null
  });

  const abortRef = useRef<boolean>(false);

  const detect = useCallback(async (
    frames: FramePoseData[],
    videoChecksum?: string
  ): Promise<ExerciseDetectionResult | null> => {
    abortRef.current = false;

    // Check cache first
    if (videoChecksum) {
      const cached = await getCachedDetection(videoChecksum);
      if (cached) {
        setState({ status: 'completed', progress: 100, result: cached, error: null });
        return cached;
      }
    }

    // Run detection with timeout
    setState({ status: 'analyzing', progress: 0, result: null, error: null });

    try {
      const result = await Promise.race([
        (async () => {
          setState(s => ({ ...s, progress: 25 }));
          const res = await detectExerciseFromFrames(frames, fullConfig);
          setState(s => ({ ...s, progress: 90 }));
          return res;
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Detection timeout')), fullConfig.timeoutMs)
        )
      ]);

      if (abortRef.current) return null;

      // Cache result
      if (videoChecksum) {
        await cacheDetectionResult(videoChecksum, result);
      }

      setState({ status: 'completed', progress: 100, result, error: null });
      return result;
    } catch (error) {
      if (abortRef.current) return null;

      const isTimeout = error instanceof Error && error.message === 'Detection timeout';
      const message = error instanceof Error ? error.message : 'Detection failed';
      setState({
        status: isTimeout ? 'timeout' : 'error',
        progress: 0,
        result: null,
        error: message
      });
      return null;
    }
  }, [fullConfig]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setState({ status: 'idle', progress: 0, result: null, error: null });
  }, []);

  return { state, detect, reset };
}
