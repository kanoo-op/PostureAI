'use client';

import React, { useRef, useCallback } from 'react';

interface MobileFrameStepGesturesProps {
  onStepBackward: () => void;
  onStepForward: () => void;
  onPlayPause: () => void;
  children: React.ReactNode;
  enabled?: boolean;
}

const SWIPE_THRESHOLD = 50; // Minimum swipe distance in pixels
const DOUBLE_TAP_DELAY = 300; // Maximum time between taps in ms

export default function MobileFrameStepGestures({
  onStepBackward,
  onStepForward,
  onPlayPause,
  children,
  enabled = true,
}: MobileFrameStepGesturesProps) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const elapsed = Date.now() - touchStartRef.current.time;

      // Check for swipe (horizontal movement > threshold, vertical movement minimal)
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD / 2) {
        if (deltaX > 0) {
          // Swipe right - next frame
          onStepForward();
        } else {
          // Swipe left - previous frame
          onStepBackward();
        }
      } else if (elapsed < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        // Tap detected - check for double tap
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
          // Double tap - play/pause
          onPlayPause();
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }

      touchStartRef.current = null;
    },
    [enabled, onStepBackward, onStepForward, onPlayPause]
  );

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="touch-none"
    >
      {children}
    </div>
  );
}
