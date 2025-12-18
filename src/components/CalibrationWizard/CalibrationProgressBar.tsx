'use client';

import React from 'react';
import { CalibrationStep } from '@/types/calibration';
import { CALIBRATION_COLORS, CALIBRATION_STEP_ORDER, POSE_STEPS } from './constants';

interface CalibrationProgressBarProps {
  currentStep: CalibrationStep;
  completedSteps: CalibrationStep[];
}

export default function CalibrationProgressBar({
  currentStep,
  completedSteps,
}: CalibrationProgressBarProps) {
  // Only show pose steps in progress bar (exclude intro and summary)
  const displaySteps = POSE_STEPS;
  const currentIndex = displaySteps.indexOf(currentStep);

  const getStepStatus = (step: CalibrationStep, index: number) => {
    if (completedSteps.includes(step)) {
      return 'complete';
    }
    if (step === currentStep || (currentStep === 'intro' && index === 0)) {
      return 'active';
    }
    if (currentStep === 'summary') {
      return 'complete';
    }
    return 'pending';
  };

  const getStepColor = (status: 'active' | 'complete' | 'pending') => {
    switch (status) {
      case 'complete':
        return CALIBRATION_COLORS.stepComplete;
      case 'active':
        return CALIBRATION_COLORS.stepActive;
      default:
        return CALIBRATION_COLORS.stepPending;
    }
  };

  const stepLabels: Record<CalibrationStep, { ko: string; en: string }> = {
    intro: { ko: '시작', en: 'Start' },
    kneeFlexion: { ko: '무릎', en: 'Knee' },
    hipFlexion: { ko: '엉덩이', en: 'Hip' },
    torsoAngle: { ko: '상체', en: 'Torso' },
    ankleAngle: { ko: '발목', en: 'Ankle' },
    elbowAngle: { ko: '팔꿈치', en: 'Elbow' },
    shoulderAngle: { ko: '어깨', en: 'Shoulder' },
    summary: { ko: '완료', en: 'Done' },
  };

  return (
    <div className="px-6 py-4" style={{ borderBottom: `1px solid ${CALIBRATION_COLORS.border}` }}>
      <div className="flex items-center justify-between">
        {displaySteps.map((step, index) => {
          const status = getStepStatus(step, index);
          const color = getStepColor(status);
          const isLast = index === displaySteps.length - 1;
          const labels = stepLabels[step];

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <div
                  className="relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    backgroundColor: status === 'pending' ? 'transparent' : color,
                    border: `2px solid ${color}`,
                    color: status === 'pending' ? color : CALIBRATION_COLORS.background,
                    boxShadow: status === 'active'
                      ? `0 0 12px ${CALIBRATION_COLORS.activeGlow}`
                      : status === 'complete'
                        ? `0 0 8px ${CALIBRATION_COLORS.completeGlow}`
                        : 'none',
                  }}
                >
                  {status === 'complete' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {/* Step label */}
                <span
                  className="mt-1 text-xs transition-colors duration-300"
                  style={{
                    color: status === 'active'
                      ? CALIBRATION_COLORS.textPrimary
                      : CALIBRATION_COLORS.textMuted,
                  }}
                >
                  {labels.ko}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className="flex-1 h-0.5 mx-2 transition-colors duration-300"
                  style={{
                    backgroundColor:
                      completedSteps.includes(step) || currentStep === 'summary'
                        ? CALIBRATION_COLORS.stepComplete
                        : CALIBRATION_COLORS.stepPending,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
