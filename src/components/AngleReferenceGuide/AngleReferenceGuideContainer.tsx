'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { AngleReferenceGuideProps, KeypointPosition } from './types';
import { ANGLE_GUIDE_COLORS } from './colors';
import { EXERCISE_IDEAL_FORMS } from './constants';
import { useMovementAnimation } from './hooks/useMovementAnimation';
import { useViewportControls } from './hooks/useViewportControls';
import { compareAngle } from './utils/angleCalculations';
import Skeleton3DRenderer from './Skeleton3DRenderer';
import AngleValueDisplay from './AngleValueDisplay';
import AngleLegend from './AngleLegend';
import TouchControlHint from './TouchControlHint';

export default function AngleReferenceGuideContainer({
  exerciseType,
  userKeypoints,
  width = 640,
  height = 480,
  showIdealSkeleton = true,
  showOverlayComparison = false,
  showAngleValues = true,
  showAnimation = true,
  animationSpeed = 1,
  selectedPhase,
  onPhaseChange,
  className = '',
}: AngleReferenceGuideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(showOverlayComparison);
  const [currentSpeed, setCurrentSpeed] = useState(animationSpeed);

  // Get exercise configuration
  const exerciseForm = EXERCISE_IDEAL_FORMS[exerciseType];

  // Animation control
  const {
    currentPhase,
    currentKeypoints,
    isPlaying,
    progress,
    play,
    pause,
    reset,
    goToPhase,
    setSpeed,
  } = useMovementAnimation({
    phases: exerciseForm?.phases || [],
    speed: currentSpeed,
    autoPlay: showAnimation,
    loop: true,
  });

  // Viewport controls
  const { controls, reset: resetView, bindEvents } = useViewportControls();

  // Bind viewport events to container
  useEffect(() => {
    if (containerRef.current) {
      bindEvents(containerRef.current);
    }
  }, [bindEvents]);

  // Notify parent of phase change
  useEffect(() => {
    if (currentPhase && onPhaseChange) {
      onPhaseChange(currentPhase.id);
    }
  }, [currentPhase, onPhaseChange]);

  // Go to selected phase when prop changes
  useEffect(() => {
    if (selectedPhase) {
      goToPhase(selectedPhase);
    }
  }, [selectedPhase, goToPhase]);

  // Angle comparison results
  const comparisonResults = useMemo(() => {
    if (!userKeypoints || !exerciseForm) return [];
    return exerciseForm.angles.map((config) =>
      compareAngle(userKeypoints, config)
    );
  }, [userKeypoints, exerciseForm]);

  // Convert user keypoints to KeypointPosition format
  const userKeypointPositions = useMemo(() => {
    if (!userKeypoints) return undefined;
    return userKeypoints.map((kp, index) => ({
      index,
      x: kp.x / width,
      y: kp.y / height,
      z: (kp as { z?: number }).z ?? 0,
    }));
  }, [userKeypoints, width, height]);

  const handleSpeedChange = (newSpeed: number) => {
    setCurrentSpeed(newSpeed);
    setSpeed(newSpeed);
  };

  if (!exerciseForm) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl ${className}`}
        style={{
          width,
          height,
          backgroundColor: ANGLE_GUIDE_COLORS.background,
          color: ANGLE_GUIDE_COLORS.textSecondary,
        }}
      >
        <div className="text-center">
          <p className="text-lg mb-2">운동 타입을 지원하지 않습니다</p>
          <p className="text-sm" style={{ color: ANGLE_GUIDE_COLORS.textMuted }}>
            Unsupported exercise type: {exerciseType}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        backgroundColor: ANGLE_GUIDE_COLORS.background,
        border: `1px solid ${ANGLE_GUIDE_COLORS.surface}`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex justify-between items-center"
        style={{ borderBottom: `1px solid ${ANGLE_GUIDE_COLORS.surface}` }}
      >
        <div>
          <h3
            className="font-semibold text-lg"
            style={{ color: ANGLE_GUIDE_COLORS.textPrimary }}
          >
            {exerciseForm.nameKo} 이상적 자세
          </h3>
          <p
            className="text-xs"
            style={{ color: ANGLE_GUIDE_COLORS.textMuted }}
          >
            드래그로 회전, 스크롤로 확대/축소
          </p>
        </div>

        {/* Overlay toggle */}
        {userKeypoints && (
          <button
            onClick={() => setIsOverlayEnabled((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors`}
            style={{
              backgroundColor: isOverlayEnabled
                ? ANGLE_GUIDE_COLORS.primary
                : ANGLE_GUIDE_COLORS.surface,
              color: isOverlayEnabled
                ? '#ffffff'
                : ANGLE_GUIDE_COLORS.textSecondary,
            }}
          >
            {isOverlayEnabled ? '비교 ON' : '비교 OFF'}
          </button>
        )}
      </div>

      {/* 3D Viewport */}
      <div
        ref={containerRef}
        className="relative cursor-grab active:cursor-grabbing"
        style={{ outline: 'none' }}
        tabIndex={0}
        aria-label="3D skeleton viewport. Use arrow keys to rotate, +/- to zoom, R to reset."
      >
        <Skeleton3DRenderer
          idealKeypoints={currentKeypoints}
          userKeypoints={isOverlayEnabled ? userKeypointPositions : undefined}
          showOverlay={isOverlayEnabled}
          controls={controls}
          width={width}
          height={height}
        />

        {/* Phase indicator */}
        <div
          className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-sm"
          style={{
            backgroundColor: ANGLE_GUIDE_COLORS.backgroundOverlay,
            color: ANGLE_GUIDE_COLORS.textPrimary,
          }}
        >
          {currentPhase?.nameKo || '대기 중'}
        </div>

        {/* Progress bar */}
        <div
          className="absolute top-3 right-3 w-24 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: ANGLE_GUIDE_COLORS.surface }}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: ANGLE_GUIDE_COLORS.primary,
            }}
          />
        </div>

        {/* Animation controls */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <button
            onClick={isPlaying ? pause : play}
            className="p-2 rounded-full transition-colors"
            style={{
              backgroundColor: ANGLE_GUIDE_COLORS.backgroundOverlay,
              color: ANGLE_GUIDE_COLORS.textPrimary,
            }}
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          >
            {isPlaying ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
          <button
            onClick={reset}
            className="p-2 rounded-full transition-colors"
            style={{
              backgroundColor: ANGLE_GUIDE_COLORS.backgroundOverlay,
              color: ANGLE_GUIDE_COLORS.textPrimary,
            }}
            aria-label="Reset animation"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-full transition-colors"
            style={{
              backgroundColor: ANGLE_GUIDE_COLORS.backgroundOverlay,
              color: ANGLE_GUIDE_COLORS.textPrimary,
            }}
            aria-label="Reset view"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* Speed control */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ backgroundColor: ANGLE_GUIDE_COLORS.backgroundOverlay }}
          >
            <button
              onClick={() => handleSpeedChange(Math.max(0.5, currentSpeed - 0.25))}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}
              disabled={currentSpeed <= 0.5}
              aria-label="Decrease speed"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="5" y="11" width="14" height="2" />
              </svg>
            </button>
            <span
              className="text-xs font-mono w-10 text-center"
              style={{ color: ANGLE_GUIDE_COLORS.textPrimary }}
            >
              {currentSpeed.toFixed(2)}x
            </span>
            <button
              onClick={() => handleSpeedChange(Math.min(2, currentSpeed + 0.25))}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}
              disabled={currentSpeed >= 2}
              aria-label="Increase speed"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="5" y="11" width="14" height="2" />
                <rect x="11" y="5" width="2" height="14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Touch control hint */}
        <TouchControlHint />
      </div>

      {/* Phase selector */}
      {exerciseForm.phases.length > 1 && (
        <div
          className="px-4 py-2 flex gap-2 overflow-x-auto"
          style={{ borderTop: `1px solid ${ANGLE_GUIDE_COLORS.surface}` }}
        >
          {exerciseForm.phases.map((phase) => (
            <button
              key={phase.id}
              onClick={() => goToPhase(phase.id)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors`}
              style={{
                backgroundColor:
                  currentPhase?.id === phase.id
                    ? ANGLE_GUIDE_COLORS.primary
                    : ANGLE_GUIDE_COLORS.surface,
                color:
                  currentPhase?.id === phase.id
                    ? '#ffffff'
                    : ANGLE_GUIDE_COLORS.textSecondary,
              }}
            >
              {phase.nameKo}
            </button>
          ))}
        </div>
      )}

      {/* Angle values panel */}
      {showAngleValues && (
        <div
          className="p-4"
          style={{ borderTop: `1px solid ${ANGLE_GUIDE_COLORS.surface}` }}
        >
          <AngleValueDisplay
            angles={exerciseForm.angles}
            comparisonResults={isOverlayEnabled ? comparisonResults : undefined}
            showComparison={isOverlayEnabled && !!userKeypoints}
            compact={false}
          />
        </div>
      )}

      {/* Legend */}
      <AngleLegend showUserSkeleton={isOverlayEnabled && !!userKeypoints} />
    </div>
  );
}
