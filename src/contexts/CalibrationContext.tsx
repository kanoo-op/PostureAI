'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  CalibrationProfile,
  CalibrationWizardState,
  CalibrationStep
} from '@/types/calibration';
import { JointAngleType } from '@/types/angleHistory';
import {
  loadCalibrationProfile,
  saveCalibrationProfile,
  clearCalibrationProfile,
  getCalibrationAge,
  createNewProfile,
  updateJointROM,
  checkProfileComplete
} from '@/utils/calibrationStorage';

// Calibration step order
const CALIBRATION_STEP_ORDER: CalibrationStep[] = [
  'intro',
  'kneeFlexion',
  'hipFlexion',
  'torsoAngle',
  'ankleAngle',
  'elbowAngle',
  'shoulderAngle',
  'summary',
];

// Required joints for a complete calibration
const REQUIRED_JOINTS: JointAngleType[] = [
  'kneeFlexion',
  'hipFlexion',
  'torsoAngle',
  'ankleAngle',
  'elbowAngle',
  'shoulderAngle',
];

// Map calibration step to joint type
const STEP_TO_JOINT: Partial<Record<CalibrationStep, JointAngleType>> = {
  kneeFlexion: 'kneeFlexion',
  hipFlexion: 'hipFlexion',
  torsoAngle: 'torsoAngle',
  ankleAngle: 'ankleAngle',
  elbowAngle: 'elbowAngle',
  shoulderAngle: 'shoulderAngle',
};

// Initial wizard state
const createInitialWizardState = (): CalibrationWizardState => ({
  currentStep: 'intro',
  completedSteps: [],
  capturedData: {},
  isCapturing: false,
  countdown: 3,
  confidence: 0,
});

interface CalibrationContextValue {
  // Profile state
  profile: CalibrationProfile | null;
  isCalibrated: boolean;
  calibrationAge: number | null; // days

  // Wizard state
  wizardState: CalibrationWizardState | null;
  isWizardOpen: boolean;

  // Actions
  openWizard: () => void;
  closeWizard: () => void;
  resetCalibration: () => void;
  updateProfile: (profile: CalibrationProfile) => void;

  // Wizard navigation
  goToStep: (step: CalibrationStep) => void;
  nextStep: () => void;
  previousStep: () => void;

  // Data capture
  startCapture: () => void;
  stopCapture: () => void;
  recordMeasurement: (jointType: JointAngleType, value: number, confidence: number) => void;
  finalizeCaptureForCurrentStep: (min: number, max: number, confidence: number) => void;
}

export const CalibrationContext = createContext<CalibrationContextValue | null>(null);

export function CalibrationProvider({ children }: { children: ReactNode }) {
  // Profile state
  const [profile, setProfile] = useState<CalibrationProfile | null>(null);
  const [calibrationAge, setCalibrationAge] = useState<number | null>(null);

  // Wizard state
  const [wizardState, setWizardState] = useState<CalibrationWizardState | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Load profile on mount
  useEffect(() => {
    const loadedProfile = loadCalibrationProfile();
    if (loadedProfile) {
      setProfile(loadedProfile);
    }
    setCalibrationAge(getCalibrationAge());
  }, []);

  // Computed values
  const isCalibrated = profile?.isComplete ?? false;

  // Actions
  const openWizard = useCallback(() => {
    setWizardState(createInitialWizardState());
    setIsWizardOpen(true);
  }, []);

  const closeWizard = useCallback(() => {
    setIsWizardOpen(false);
    setWizardState(null);
  }, []);

  const resetCalibration = useCallback(() => {
    clearCalibrationProfile();
    setProfile(null);
    setCalibrationAge(null);
  }, []);

  const updateProfile = useCallback((newProfile: CalibrationProfile) => {
    const saved = saveCalibrationProfile(newProfile);
    if (saved) {
      setProfile(newProfile);
      setCalibrationAge(0);
    }
  }, []);

  // Wizard navigation
  const goToStep = useCallback((step: CalibrationStep) => {
    setWizardState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentStep: step,
        isCapturing: false,
        countdown: 3,
        confidence: 0,
      };
    });
  }, []);

  const nextStep = useCallback(() => {
    setWizardState((prev) => {
      if (!prev) return prev;

      const currentIndex = CALIBRATION_STEP_ORDER.indexOf(prev.currentStep);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= CALIBRATION_STEP_ORDER.length) {
        return prev;
      }

      const nextStepValue = CALIBRATION_STEP_ORDER[nextIndex];
      const completedSteps = prev.completedSteps.includes(prev.currentStep)
        ? prev.completedSteps
        : [...prev.completedSteps, prev.currentStep];

      return {
        ...prev,
        currentStep: nextStepValue,
        completedSteps,
        isCapturing: false,
        countdown: 3,
        confidence: 0,
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setWizardState((prev) => {
      if (!prev) return prev;

      const currentIndex = CALIBRATION_STEP_ORDER.indexOf(prev.currentStep);
      const prevIndex = currentIndex - 1;

      if (prevIndex < 0) {
        return prev;
      }

      return {
        ...prev,
        currentStep: CALIBRATION_STEP_ORDER[prevIndex],
        isCapturing: false,
        countdown: 3,
        confidence: 0,
      };
    });
  }, []);

  // Data capture
  const startCapture = useCallback(() => {
    setWizardState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isCapturing: true,
        countdown: 3,
      };
    });
  }, []);

  const stopCapture = useCallback(() => {
    setWizardState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isCapturing: false,
        countdown: 3,
      };
    });
  }, []);

  const recordMeasurement = useCallback(
    (jointType: JointAngleType, value: number, confidence: number) => {
      setWizardState((prev) => {
        if (!prev || !prev.isCapturing) return prev;

        const existingData = prev.capturedData[jointType] || [];
        const newData = [...existingData, value];

        return {
          ...prev,
          capturedData: {
            ...prev.capturedData,
            [jointType]: newData,
          },
          confidence,
        };
      });
    },
    []
  );

  const finalizeCaptureForCurrentStep = useCallback(
    (min: number, max: number, confidence: number) => {
      setWizardState((prev) => {
        if (!prev) return prev;

        const jointType = STEP_TO_JOINT[prev.currentStep];
        if (!jointType) return prev;

        // Update or create profile with new ROM data
        const currentProfile = profile || createNewProfile();
        const updatedProfile = updateJointROM(currentProfile, jointType, min, max, confidence);

        // Check if profile is now complete
        updatedProfile.isComplete = checkProfileComplete(updatedProfile, REQUIRED_JOINTS);

        // Save profile
        const saved = saveCalibrationProfile(updatedProfile);
        if (saved) {
          setProfile(updatedProfile);
          setCalibrationAge(0);
        }

        // Update wizard state
        const completedSteps = prev.completedSteps.includes(prev.currentStep)
          ? prev.completedSteps
          : [...prev.completedSteps, prev.currentStep];

        return {
          ...prev,
          completedSteps,
          isCapturing: false,
          countdown: 3,
        };
      });
    },
    [profile]
  );

  const value: CalibrationContextValue = {
    profile,
    isCalibrated,
    calibrationAge,
    wizardState,
    isWizardOpen,
    openWizard,
    closeWizard,
    resetCalibration,
    updateProfile,
    goToStep,
    nextStep,
    previousStep,
    startCapture,
    stopCapture,
    recordMeasurement,
    finalizeCaptureForCurrentStep,
  };

  return (
    <CalibrationContext.Provider value={value}>
      {children}
    </CalibrationContext.Provider>
  );
}

export function useCalibration(): CalibrationContextValue {
  const context = useContext(CalibrationContext);
  if (!context) {
    throw new Error('useCalibration must be used within CalibrationProvider');
  }
  return context;
}
