'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { CalibrationStep } from '@/types/calibration';
import { JointAngleType } from '@/types/angleHistory';
import { useCalibration } from '@/contexts/CalibrationContext';
import {
  CALIBRATION_COLORS,
  CALIBRATION_STEP_ORDER,
  POSE_STEPS,
  CALIBRATION_POSE_INSTRUCTIONS,
} from './constants';
import CalibrationProgressBar from './CalibrationProgressBar';
import CalibrationIntro from './CalibrationIntro';
import CalibrationPose from './CalibrationPose';
import CalibrationSummary from './CalibrationSummary';
import CalibrationWizardNav from './CalibrationWizardNav';

interface CalibrationWizardProps {
  currentAngle?: number | null;
  confidence?: number;
  onClose?: () => void;
}

export default function CalibrationWizard({
  currentAngle = null,
  confidence = 0,
  onClose,
}: CalibrationWizardProps) {
  const {
    profile,
    wizardState,
    isWizardOpen,
    closeWizard,
    nextStep,
    previousStep,
    goToStep,
    finalizeCaptureForCurrentStep,
  } = useCalibration();

  // Track captured state for current step
  const [stepCaptured, setStepCaptured] = useState(false);

  // Reset captured state when step changes
  useEffect(() => {
    setStepCaptured(false);
  }, [wizardState?.currentStep]);

  // Handle capture completion
  const handleCapture = useCallback(
    (min: number, max: number, captureConfidence: number) => {
      finalizeCaptureForCurrentStep(min, max, captureConfidence);
      setStepCaptured(true);
    },
    [finalizeCaptureForCurrentStep]
  );

  // Handle close/cancel
  const handleClose = useCallback(() => {
    closeWizard();
    onClose?.();
  }, [closeWizard, onClose]);

  // Handle recalibrate specific joint
  const handleRecalibrateJoint = useCallback(
    (jointType: JointAngleType) => {
      // Find the step for this joint type
      const step = (Object.entries(CALIBRATION_POSE_INSTRUCTIONS) as [CalibrationStep, typeof CALIBRATION_POSE_INSTRUCTIONS['intro']][])
        .find(([_, instruction]) => instruction.jointType === jointType)?.[0];
      if (step) {
        goToStep(step);
      }
    },
    [goToStep]
  );

  // Handle next action
  const handleNext = useCallback(() => {
    if (wizardState?.currentStep === 'summary') {
      handleClose();
    } else {
      nextStep();
    }
  }, [wizardState?.currentStep, nextStep, handleClose]);

  // Early return after all hooks
  if (!isWizardOpen || !wizardState) {
    return null;
  }

  const { currentStep, completedSteps } = wizardState;
  const isPoseStep = POSE_STEPS.includes(currentStep);
  const currentInstruction = CALIBRATION_POSE_INSTRUCTIONS[currentStep];

  // Determine if we can proceed to next step
  const canGoNext = currentStep === 'intro' || currentStep === 'summary' || stepCaptured || completedSteps.includes(currentStep);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
    >
      <div
        className="max-w-2xl w-full mx-4 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ backgroundColor: CALIBRATION_COLORS.background }}
      >
        {/* Header with progress */}
        {currentStep !== 'intro' && currentStep !== 'summary' && (
          <CalibrationProgressBar
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {currentStep === 'intro' && (
            <CalibrationIntro onStart={nextStep} />
          )}

          {currentStep === 'summary' && (
            <CalibrationSummary
              profile={profile}
              onRecalibrateJoint={handleRecalibrateJoint}
              onFinish={handleClose}
            />
          )}

          {isPoseStep && currentInstruction && (
            <CalibrationPose
              step={currentStep}
              currentAngle={currentAngle}
              confidence={confidence}
              onCapture={handleCapture}
            />
          )}
        </div>

        {/* Navigation */}
        {currentStep !== 'intro' && (
          <CalibrationWizardNav
            currentStep={currentStep}
            onBack={previousStep}
            onNext={handleNext}
            onCancel={handleClose}
            canGoNext={canGoNext}
            showSkip={isPoseStep && !stepCaptured}
            onSkip={nextStep}
            nextLabel={currentStep === 'summary' ? 'Finish / 완료' : undefined}
          />
        )}

        {/* Bottom gradient accent */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, ${CALIBRATION_COLORS.active}, ${CALIBRATION_COLORS.complete})`,
          }}
        />
      </div>
    </div>
  );
}
