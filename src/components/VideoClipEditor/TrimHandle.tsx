'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { CLIP_EDITOR_COLORS } from './constants';

interface TrimHandleProps {
  position: number;       // 0-100 percent
  type: 'start' | 'end';
  isActive: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onPositionChange: (percent: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  'aria-label': string;
}

export default function TrimHandle({
  position,
  type,
  isActive,
  onDragStart,
  onDragEnd,
  onPositionChange,
  containerRef,
  'aria-label': ariaLabel,
}: TrimHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);

  // Handle touch events for mobile support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    onDragStart();
  }, [onDragStart]);

  // Mouse/touch move handler
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const handleMove = (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      onPositionChange(percent);
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => onDragEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isActive, containerRef, onPositionChange, onDragEnd]);

  return (
    <div
      ref={handleRef}
      className="absolute top-0 h-full cursor-ew-resize z-30 select-none"
      style={{
        left: type === 'start' ? `${position}%` : 'auto',
        right: type === 'end' ? `${100 - position}%` : 'auto',
        transform: type === 'start' ? 'translateX(-50%)' : 'translateX(50%)',
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        onDragStart();
      }}
      onTouchStart={handleTouchStart}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
    >
      {/* Handle bar */}
      <div
        className="w-1 h-full transition-colors"
        style={{
          backgroundColor: isActive ? CLIP_EDITOR_COLORS.trimHandleActive : CLIP_EDITOR_COLORS.trimHandle,
          boxShadow: isActive ? `0 0 8px ${CLIP_EDITOR_COLORS.trimHandleActive}` : 'none',
        }}
      />

      {/* Handle grip */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-12 rounded-sm flex flex-col items-center justify-center gap-0.5 transition-all"
        style={{
          left: type === 'start' ? '0' : 'auto',
          right: type === 'end' ? '0' : 'auto',
          transform: type === 'start' ? 'translateX(-100%)' : 'translateX(100%)',
          backgroundColor: isActive ? CLIP_EDITOR_COLORS.trimHandleActive : CLIP_EDITOR_COLORS.trimHandle,
        }}
      >
        {/* Grip lines */}
        <div className="w-0.5 h-4 rounded-full bg-white/60" />
        <div className="w-0.5 h-4 rounded-full bg-white/60" />
      </div>
    </div>
  );
}
