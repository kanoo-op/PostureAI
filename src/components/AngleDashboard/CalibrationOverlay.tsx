'use client';

import React, { useEffect, useState } from 'react';
import { DASHBOARD_COLORS } from './constants';

interface CalibrationOverlayProps {
  isVisible: boolean;
  onCalibrationComplete: (baselineDepth: number) => void;
  onCancel: () => void;
  tPoseDetected: boolean;
  countdown?: number;
}

/**
 * Full-screen overlay for T-pose calibration
 * Guides user through calibration process with visual feedback
 */
export default function CalibrationOverlay({
  isVisible,
  onCalibrationComplete,
  onCancel,
  tPoseDetected,
  countdown = 3,
}: CalibrationOverlayProps) {
  const [internalCountdown, setInternalCountdown] = useState(countdown);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Handle T-pose detection and countdown
  useEffect(() => {
    if (!isVisible) {
      setInternalCountdown(countdown);
      setIsCalibrating(false);
      return;
    }

    if (tPoseDetected && !isCalibrating) {
      setIsCalibrating(true);
      setInternalCountdown(countdown);
    } else if (!tPoseDetected && isCalibrating) {
      setIsCalibrating(false);
      setInternalCountdown(countdown);
    }
  }, [tPoseDetected, isVisible, countdown, isCalibrating]);

  // Countdown timer
  useEffect(() => {
    if (!isCalibrating || internalCountdown <= 0) return;

    const timer = setInterval(() => {
      setInternalCountdown((prev) => {
        if (prev <= 1) {
          // Calibration complete
          onCalibrationComplete(0.5); // Will be calculated from keypoints in real use
          return countdown;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCalibrating, internalCountdown, countdown, onCalibrationComplete]);

  if (!isVisible) return null;

  const calibrationColor = DASHBOARD_COLORS.calibration?.active ?? '#00ddff';
  const calibrationGlow = DASHBOARD_COLORS.calibration?.activeGlow ?? 'rgba(0, 221, 255, 0.4)';

  // Progress percentage for ring
  const progress = isCalibrating ? ((countdown - internalCountdown) / countdown) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
    >
      {/* Content container */}
      <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
        {/* T-pose silhouette guide */}
        <div className="relative">
          {/* Progress ring */}
          <svg className="w-48 h-48" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(75, 85, 99, 0.5)"
              strokeWidth="4"
            />
            {/* Progress ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={calibrationColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.83} 283`}
              transform="rotate(-90 50 50)"
              style={{
                filter: `drop-shadow(0 0 8px ${calibrationGlow})`,
                transition: 'stroke-dasharray 0.3s ease',
              }}
            />
          </svg>

          {/* T-pose figure */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-32 h-32"
              viewBox="0 0 100 100"
              fill="none"
              stroke={tPoseDetected ? calibrationColor : '#9CA3AF'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transition: 'stroke 0.3s ease',
                filter: tPoseDetected ? `drop-shadow(0 0 8px ${calibrationGlow})` : 'none',
              }}
            >
              {/* Head */}
              <circle cx="50" cy="20" r="8" />
              {/* Body */}
              <line x1="50" y1="28" x2="50" y2="60" />
              {/* Left arm */}
              <line x1="50" y1="35" x2="15" y2="35" />
              {/* Right arm */}
              <line x1="50" y1="35" x2="85" y2="35" />
              {/* Left leg */}
              <line x1="50" y1="60" x2="35" y2="90" />
              {/* Right leg */}
              <line x1="50" y1="60" x2="65" y2="90" />
            </svg>
          </div>

          {/* Countdown number */}
          {isCalibrating && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ marginTop: '90px' }}
            >
              <span
                className="text-4xl font-bold"
                style={{
                  color: calibrationColor,
                  textShadow: `0 0 20px ${calibrationGlow}`,
                }}
              >
                {internalCountdown}
              </span>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <h2
            className="text-xl font-bold"
            style={{ color: tPoseDetected ? calibrationColor : '#ffffff' }}
          >
            {tPoseDetected ? 'T-Pose Detected!' : 'Stand in T-Pose'}
          </h2>
          <p className="text-gray-400">
            {tPoseDetected
              ? `Hold still for ${internalCountdown} seconds...`
              : 'Extend your arms horizontally and stand straight'}
          </p>
          {/* Korean instructions */}
          <p className="text-gray-500 text-sm">
            {tPoseDetected
              ? `${internalCountdown}초 동안 유지하세요...`
              : '팔을 수평으로 뻗고 똑바로 서세요'}
          </p>
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="px-6 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors"
        >
          Cancel / 취소
        </button>
      </div>
    </div>
  );
}
