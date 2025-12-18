'use client';

import React, { useState } from 'react';
import { CalibrationStep } from '@/types/calibration';
import { CALIBRATION_COLORS, CALIBRATION_STEP_ORDER } from './constants';

interface CalibrationWizardNavProps {
  currentStep: CalibrationStep;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  onCancel: () => void;
  canGoNext?: boolean;
  showSkip?: boolean;
  nextLabel?: string;
}

export default function CalibrationWizardNav({
  currentStep,
  onBack,
  onNext,
  onSkip,
  onCancel,
  canGoNext = true,
  showSkip = false,
  nextLabel,
}: CalibrationWizardNavProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const currentIndex = CALIBRATION_STEP_ORDER.indexOf(currentStep);
  const isFirstStep = currentStep === 'intro';
  const isLastStep = currentStep === 'summary';

  // Determine next button label
  const getNextLabel = () => {
    if (nextLabel) return nextLabel;
    if (isLastStep) return 'Finish / 완료';
    if (isFirstStep) return 'Start / 시작';
    return 'Next / 다음';
  };

  const handleCancelClick = () => {
    if (currentStep === 'intro') {
      onCancel();
    } else {
      setShowCancelConfirm(true);
    }
  };

  return (
    <>
      <div
        className="px-6 py-4 flex items-center justify-between gap-4"
        style={{
          backgroundColor: CALIBRATION_COLORS.surface,
          borderTop: `1px solid ${CALIBRATION_COLORS.border}`,
        }}
      >
        {/* Left side - Back/Cancel */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: CALIBRATION_COLORS.surfaceElevated,
                color: CALIBRATION_COLORS.textSecondary,
              }}
            >
              Back / 뒤로
            </button>
          )}

          <button
            onClick={handleCancelClick}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:opacity-80"
            style={{
              color: CALIBRATION_COLORS.statusError,
            }}
          >
            Cancel / 취소
          </button>
        </div>

        {/* Right side - Skip/Next */}
        <div className="flex items-center gap-2">
          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 rounded-lg text-sm transition-colors hover:opacity-80"
              style={{
                color: CALIBRATION_COLORS.textMuted,
              }}
            >
              Skip / 건너뛰기
            </button>
          )}

          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            style={{
              backgroundColor: canGoNext ? CALIBRATION_COLORS.active : CALIBRATION_COLORS.surfaceElevated,
              color: canGoNext ? CALIBRATION_COLORS.background : CALIBRATION_COLORS.textMuted,
              boxShadow: canGoNext ? `0 0 12px ${CALIBRATION_COLORS.activeGlow}` : 'none',
            }}
          >
            {getNextLabel()}
          </button>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        >
          <div
            className="max-w-sm w-full mx-4 rounded-2xl p-6"
            style={{ backgroundColor: CALIBRATION_COLORS.background }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: CALIBRATION_COLORS.textPrimary }}>
              Cancel Calibration?
            </h3>
            <p className="text-sm mb-1" style={{ color: CALIBRATION_COLORS.textSecondary }}>
              Your progress will be lost.
            </p>
            <p className="text-sm mb-4" style={{ color: CALIBRATION_COLORS.textMuted }}>
              캘리브레이션을 취소하시겠습니까? 진행 상황이 저장되지 않습니다.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: CALIBRATION_COLORS.surfaceElevated,
                  color: CALIBRATION_COLORS.textSecondary,
                }}
              >
                Continue / 계속하기
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: CALIBRATION_COLORS.statusError,
                  color: CALIBRATION_COLORS.textPrimary,
                }}
              >
                Cancel / 취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
