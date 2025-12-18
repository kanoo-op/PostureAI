import { useState, useEffect, useCallback, useRef } from 'react';
import { ExercisePhase, KeypointPosition } from '../types';
import { interpolateKeypoints, easeInOutCubic } from '../utils/viewport3D';

interface UseMovementAnimationOptions {
  phases: ExercisePhase[];
  speed?: number; // 0.5 to 2.0
  autoPlay?: boolean;
  loop?: boolean;
}

interface UseMovementAnimationReturn {
  currentPhase: ExercisePhase | null;
  currentKeypoints: KeypointPosition[];
  progress: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
  goToPhase: (phaseId: string) => void;
  setSpeed: (speed: number) => void;
}

export function useMovementAnimation({
  phases,
  speed: initialSpeed = 1,
  autoPlay = false,
  loop = true,
}: UseMovementAnimationOptions): UseMovementAnimationReturn {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeedState] = useState(initialSpeed);
  const [currentKeypoints, setCurrentKeypoints] = useState<KeypointPosition[]>(
    phases[0]?.keypointPositions || []
  );

  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - pausedAtRef.current;
      }

      const currentPhase = phases[currentPhaseIndex];
      if (!currentPhase) {
        setIsPlaying(false);
        return;
      }

      const nextPhaseIndex = (currentPhaseIndex + 1) % phases.length;
      const nextPhase = phases[nextPhaseIndex];

      const elapsed = (timestamp - startTimeRef.current) * speed;
      const phaseDuration = currentPhase.duration;
      const phaseProgress = Math.min(elapsed / phaseDuration, 1);

      setProgress(phaseProgress);

      // Interpolate keypoints with easing
      if (nextPhase) {
        const interpolated = interpolateKeypoints(
          currentPhase.keypointPositions,
          nextPhase.keypointPositions,
          easeInOutCubic(phaseProgress)
        );
        setCurrentKeypoints(interpolated);
      }

      // Transition to next phase
      if (phaseProgress >= 1) {
        startTimeRef.current = 0;
        pausedAtRef.current = 0;
        if (nextPhaseIndex === 0 && !loop) {
          setIsPlaying(false);
          setCurrentKeypoints(phases[0]?.keypointPositions || []);
          setCurrentPhaseIndex(0);
          return;
        }
        setCurrentPhaseIndex(nextPhaseIndex);
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    },
    [phases, currentPhaseIndex, speed, loop, isPlaying]
  );

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  // Reset when phases change
  useEffect(() => {
    setCurrentPhaseIndex(0);
    setProgress(0);
    startTimeRef.current = 0;
    pausedAtRef.current = 0;
    setCurrentKeypoints(phases[0]?.keypointPositions || []);
  }, [phases]);

  const play = useCallback(() => {
    startTimeRef.current = 0;
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    // Store where we paused for resume
    pausedAtRef.current = progress * (phases[currentPhaseIndex]?.duration || 0);
  }, [progress, phases, currentPhaseIndex]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentPhaseIndex(0);
    setProgress(0);
    startTimeRef.current = 0;
    pausedAtRef.current = 0;
    setCurrentKeypoints(phases[0]?.keypointPositions || []);
  }, [phases]);

  const goToPhase = useCallback(
    (phaseId: string) => {
      const index = phases.findIndex((p) => p.id === phaseId);
      if (index !== -1) {
        setCurrentPhaseIndex(index);
        setProgress(0);
        startTimeRef.current = 0;
        pausedAtRef.current = 0;
        setCurrentKeypoints(phases[index].keypointPositions);
      }
    },
    [phases]
  );

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(Math.max(0.5, Math.min(2, newSpeed)));
  }, []);

  return {
    currentPhase: phases[currentPhaseIndex] || null,
    currentKeypoints,
    progress,
    isPlaying,
    play,
    pause,
    reset,
    goToPhase,
    setSpeed,
  };
}
