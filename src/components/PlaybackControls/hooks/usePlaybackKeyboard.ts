'use client';

import { useEffect, useCallback, useRef } from 'react';
import { PLAYBACK_SPEEDS } from '../constants';
import type { PlaybackSpeed } from '../types';

interface UsePlaybackKeyboardOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  onFramePrevious: () => void;
  onFrameNext: () => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  currentSpeed: PlaybackSpeed;
  enabled?: boolean;
}

export function usePlaybackKeyboard(options: UsePlaybackKeyboardOptions) {
  const {
    containerRef,
    onFramePrevious,
    onFrameNext,
    onPlayPause,
    onSpeedChange,
    currentSpeed,
    enabled = true,
  } = options;

  const isActiveRef = useRef(false);

  // Find adjacent speed
  const changeSpeed = useCallback(
    (direction: 'increase' | 'decrease') => {
      const currentIndex = PLAYBACK_SPEEDS.findIndex(
        (s) => s.value === currentSpeed
      );
      if (currentIndex === -1) return;

      const newIndex =
        direction === 'increase'
          ? Math.min(currentIndex + 1, PLAYBACK_SPEEDS.length - 1)
          : Math.max(currentIndex - 1, 0);

      onSpeedChange(PLAYBACK_SPEEDS[newIndex].value);
    },
    [currentSpeed, onSpeedChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || !isActiveRef.current) return;

      // Prevent default for our shortcuts
      const key = e.key.toLowerCase();

      switch (key) {
        case 'j':
          e.preventDefault();
          onFramePrevious();
          break;
        case 'l':
          e.preventDefault();
          onFrameNext();
          break;
        case 'k':
          e.preventDefault();
          onPlayPause();
          break;
        case ',':
        case '<':
          e.preventDefault();
          changeSpeed('decrease');
          break;
        case '.':
        case '>':
          e.preventDefault();
          changeSpeed('increase');
          break;
      }
    },
    [enabled, onFramePrevious, onFrameNext, onPlayPause, changeSpeed]
  );

  // Track focus state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocus = () => {
      isActiveRef.current = true;
    };
    const handleBlur = () => {
      isActiveRef.current = false;
    };

    container.addEventListener('focus', handleFocus);
    container.addEventListener('blur', handleBlur);
    container.addEventListener('focusin', handleFocus);
    container.addEventListener('focusout', handleBlur);

    return () => {
      container.removeEventListener('focus', handleFocus);
      container.removeEventListener('blur', handleBlur);
      container.removeEventListener('focusin', handleFocus);
      container.removeEventListener('focusout', handleBlur);
    };
  }, [containerRef]);

  // Global keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { isActive: isActiveRef.current };
}
