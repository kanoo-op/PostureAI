'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CalibrationStep, CalibrationPoseInstruction } from '@/types/calibration';
import { JointAngleType } from '@/types/angleHistory';
import { CALIBRATION_COLORS, CALIBRATION_POSE_INSTRUCTIONS, MIN_CONFIDENCE_THRESHOLD, CAPTURE_COUNTDOWN_SECONDS } from './constants';
import PoseSVGGuide from './PoseSVGGuide';
import ConfidenceMeter from './ConfidenceMeter';
import ROMCaptureDisplay from './ROMCaptureDisplay';
import CalibrationCountdown from './CalibrationCountdown';
import SafetyBoundsWarning from './SafetyBoundsWarning';
import { validateROMBounds } from '@/utils/calibrationStorage';

interface CalibrationPoseProps {
  step: CalibrationStep;
  currentAngle: number | null;
  confidence: number;
  onCapture: (min: number, max: number, confidence: number) => void;
  onRecalibrate?: () => void;
}

type CapturePhase = 'waiting' | 'capturing-min' | 'captured-min' | 'capturing-max' | 'complete';

export default function CalibrationPose({
  step,
  currentAngle,
  confidence,
  onCapture,
  onRecalibrate,
}: CalibrationPoseProps) {
  const instruction = CALIBRATION_POSE_INSTRUCTIONS[step];
  const jointType = instruction.jointType;

  // Capture state
  const [capturePhase, setCapturePhase] = useState<CapturePhase>('waiting');
  const [capturedMin, setCapturedMin] = useState<number | null>(null);
  const [capturedMax, setCapturedMax] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(CAPTURE_COUNTDOWN_SECONDS);
  const [measurementBuffer, setMeasurementBuffer] = useState<number[]>([]);
  const [hasValidationError, setHasValidationError] = useState(false);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when step changes
  useEffect(() => {
    setCapturePhase('waiting');
    setCapturedMin(null);
    setCapturedMax(null);
    setCountdown(CAPTURE_COUNTDOWN_SECONDS);
    setMeasurementBuffer([]);
    setHasValidationError(false);
  }, [step]);

  // Handle countdown and capture
  useEffect(() => {
    if (capturePhase !== 'capturing-min' && capturePhase !== 'capturing-max') {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    // Only capture if confidence is sufficient
    if (confidence < MIN_CONFIDENCE_THRESHOLD) {
      setCountdown(CAPTURE_COUNTDOWN_SECONDS);
      setMeasurementBuffer([]);
      return;
    }

    // Collect measurements
    if (currentAngle !== null) {
      setMeasurementBuffer((prev) => [...prev, currentAngle]);
    }

    // Start countdown
    if (!countdownRef.current) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Capture complete for this phase
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [capturePhase, confidence, currentAngle]);

  // Handle countdown completion
  useEffect(() => {
    if (countdown === 0 && measurementBuffer.length > 0) {
      const avgValue = measurementBuffer.reduce((a, b) => a + b, 0) / measurementBuffer.length;

      if (capturePhase === 'capturing-min') {
        setCapturedMin(avgValue);
        setCapturePhase('captured-min');
        setCountdown(CAPTURE_COUNTDOWN_SECONDS);
        setMeasurementBuffer([]);
      } else if (capturePhase === 'capturing-max') {
        const finalMin = capturedMin!;
        const finalMax = avgValue;

        // Ensure min < max, swap if needed
        const actualMin = Math.min(finalMin, finalMax);
        const actualMax = Math.max(finalMin, finalMax);

        // Validate bounds
        if (jointType && !validateROMBounds(jointType, actualMin, actualMax)) {
          setHasValidationError(true);
          setCapturedMax(actualMax);
          setCapturePhase('complete');
        } else {
          setCapturedMax(actualMax);
          setCapturePhase('complete');
          onCapture(actualMin, actualMax, confidence);
        }
      }
    }
  }, [countdown, measurementBuffer, capturePhase, capturedMin, jointType, confidence, onCapture]);

  // Start capture
  const handleStartCapture = useCallback(() => {
    if (capturePhase === 'waiting') {
      setCapturePhase('capturing-min');
      setCountdown(CAPTURE_COUNTDOWN_SECONDS);
      setMeasurementBuffer([]);
    } else if (capturePhase === 'captured-min') {
      setCapturePhase('capturing-max');
      setCountdown(CAPTURE_COUNTDOWN_SECONDS);
      setMeasurementBuffer([]);
    }
  }, [capturePhase]);

  // Handle recalibration
  const handleRecalibrate = useCallback(() => {
    setCapturePhase('waiting');
    setCapturedMin(null);
    setCapturedMax(null);
    setCountdown(CAPTURE_COUNTDOWN_SECONDS);
    setMeasurementBuffer([]);
    setHasValidationError(false);
    onRecalibrate?.();
  }, [onRecalibrate]);

  // Determine capture display phase
  const getDisplayPhase = (): 'min' | 'max' | 'complete' => {
    if (capturePhase === 'complete') return 'complete';
    if (capturedMin !== null) return 'max';
    return 'min';
  };

  const isCapturing = capturePhase === 'capturing-min' || capturePhase === 'capturing-max';
  const canStartCapture = confidence >= MIN_CONFIDENCE_THRESHOLD;

  return (
    <div className="p-6">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold" style={{ color: CALIBRATION_COLORS.textPrimary }}>
          {instruction.titleEn}
        </h2>
        <h3 className="text-lg" style={{ color: CALIBRATION_COLORS.active }}>
          {instruction.titleKo}
        </h3>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Left - Pose guide */}
        <div
          className="flex flex-col items-center justify-center p-4 rounded-xl"
          style={{ backgroundColor: CALIBRATION_COLORS.surface }}
        >
          <PoseSVGGuide
            pose={instruction.svgGuide}
            isActive={isCapturing}
            size="lg"
          />
          <p className="text-xs mt-2 text-center" style={{ color: CALIBRATION_COLORS.textMuted }}>
            Target Pose
          </p>
        </div>

        {/* Right - Capture display */}
        <div className="flex flex-col justify-center">
          {isCapturing ? (
            <div className="flex flex-col items-center">
              <CalibrationCountdown
                countdown={countdown}
                total={CAPTURE_COUNTDOWN_SECONDS}
                size="md"
              />
              <p className="text-sm mt-2" style={{ color: CALIBRATION_COLORS.textSecondary }}>
                {capturePhase === 'capturing-min' ? 'Hold minimum position...' : 'Hold maximum position...'}
              </p>
            </div>
          ) : (
            <ROMCaptureDisplay
              currentAngle={currentAngle}
              capturedMin={capturedMin}
              capturedMax={capturedMax}
              capturePhase={getDisplayPhase()}
            />
          )}
        </div>
      </div>

      {/* Instructions */}
      <div
        className="p-4 rounded-xl mb-4"
        style={{ backgroundColor: CALIBRATION_COLORS.surface }}
      >
        <p className="text-sm" style={{ color: CALIBRATION_COLORS.textSecondary }}>
          {instruction.instructionEn}
        </p>
        <p className="text-sm mt-1" style={{ color: CALIBRATION_COLORS.textMuted }}>
          {instruction.instructionKo}
        </p>
      </div>

      {/* Confidence meter */}
      <div className="mb-4">
        <ConfidenceMeter
          confidence={confidence}
          threshold={MIN_CONFIDENCE_THRESHOLD}
          size="md"
        />
      </div>

      {/* Safety bounds warning */}
      {hasValidationError && jointType && capturedMin !== null && capturedMax !== null && (
        <div className="mb-4">
          <SafetyBoundsWarning
            jointType={jointType}
            capturedMin={capturedMin}
            capturedMax={capturedMax}
            onRecalibrate={handleRecalibrate}
          />
        </div>
      )}

      {/* Action buttons */}
      {!isCapturing && capturePhase !== 'complete' && (
        <button
          onClick={handleStartCapture}
          disabled={!canStartCapture}
          className="w-full py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          style={{
            backgroundColor: canStartCapture ? CALIBRATION_COLORS.active : CALIBRATION_COLORS.surfaceElevated,
            color: canStartCapture ? CALIBRATION_COLORS.background : CALIBRATION_COLORS.textMuted,
            boxShadow: canStartCapture ? `0 0 12px ${CALIBRATION_COLORS.activeGlow}` : 'none',
          }}
        >
          {capturePhase === 'waiting' && 'Capture MIN Position / 최소 위치 측정'}
          {capturePhase === 'captured-min' && 'Capture MAX Position / 최대 위치 측정'}
        </button>
      )}

      {capturePhase === 'complete' && !hasValidationError && (
        <div
          className="w-full py-3 rounded-xl font-medium text-center"
          style={{
            backgroundColor: CALIBRATION_COLORS.completeBg,
            color: CALIBRATION_COLORS.complete,
            border: `1px solid ${CALIBRATION_COLORS.complete}`,
          }}
        >
          Capture Complete! Click Next to continue.
          <br />
          <span style={{ color: CALIBRATION_COLORS.textMuted }}>측정 완료! 다음을 클릭하세요.</span>
        </div>
      )}
    </div>
  );
}
