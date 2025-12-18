// src/utils/calibrationStorage.ts

import { CalibrationStorage, CalibrationProfile, JointROMRange } from '@/types/calibration';
import { JointAngleType } from '@/types/angleHistory';

const STORAGE_KEY = 'calibration_profile';
const CURRENT_VERSION = 1;

// Physiological bounds - safety limits for each joint type
export const PHYSIOLOGICAL_BOUNDS: Record<JointAngleType, { absoluteMin: number; absoluteMax: number }> = {
  kneeFlexion: { absoluteMin: 0, absoluteMax: 160 },
  hipFlexion: { absoluteMin: 0, absoluteMax: 140 },
  torsoAngle: { absoluteMin: 0, absoluteMax: 90 },
  ankleAngle: { absoluteMin: 50, absoluteMax: 110 },
  elbowAngle: { absoluteMin: 0, absoluteMax: 160 },
  shoulderAngle: { absoluteMin: 0, absoluteMax: 180 },
  spineAlignment: { absoluteMin: 150, absoluteMax: 180 },
  kneeValgus: { absoluteMin: 0, absoluteMax: 20 },
  elbowValgus: { absoluteMin: 0, absoluteMax: 20 },
  armSymmetry: { absoluteMin: 0, absoluteMax: 100 },
};

// Validate ROM bounds against physiological limits
export function validateROMBounds(jointType: JointAngleType, min: number, max: number): boolean {
  const bounds = PHYSIOLOGICAL_BOUNDS[jointType];
  if (!bounds) return false;

  return (
    min >= bounds.absoluteMin &&
    min <= bounds.absoluteMax &&
    max >= bounds.absoluteMin &&
    max <= bounds.absoluteMax &&
    min < max
  );
}

// Initialize empty storage
export function createEmptyStorage(): CalibrationStorage {
  return {
    version: CURRENT_VERSION,
    profile: null,
    lastCalibrationDate: null,
  };
}

// Validate storage structure
export function validateStorage(data: unknown): data is CalibrationStorage {
  if (!data || typeof data !== 'object') return false;
  const storage = data as CalibrationStorage;
  return (
    typeof storage.version === 'number' &&
    (storage.profile === null || typeof storage.profile === 'object') &&
    (storage.lastCalibrationDate === null || typeof storage.lastCalibrationDate === 'number')
  );
}

// Migrate from older versions
export function migrateStorage(data: CalibrationStorage): CalibrationStorage {
  // Future migrations go here
  // For now, just update version
  return { ...data, version: CURRENT_VERSION };
}

// Load calibration profile from localStorage
export function loadCalibrationProfile(): CalibrationProfile | null {
  try {
    if (typeof window === 'undefined') return null;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as CalibrationStorage;

    // Version migration if needed
    if (data.version < CURRENT_VERSION) {
      const migrated = migrateStorage(data);
      saveStorage(migrated);
      return migrated.profile;
    }

    // Validate structure
    if (!validateStorage(data)) {
      console.warn('Invalid calibration storage structure, resetting');
      return null;
    }

    return data.profile;
  } catch (error) {
    console.error('Failed to load calibration profile:', error);
    return null;
  }
}

// Save raw storage
function saveStorage(storage: CalibrationStorage): boolean {
  try {
    if (typeof window === 'undefined') return false;

    const serialized = JSON.stringify(storage);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.error('Failed to save calibration storage:', error);
    return false;
  }
}

// Save calibration profile to localStorage
export function saveCalibrationProfile(profile: CalibrationProfile): boolean {
  try {
    if (typeof window === 'undefined') return false;

    // Validate ROM bounds for all joints
    for (const [jointType, romRange] of Object.entries(profile.joints)) {
      if (romRange) {
        const isValid = validateROMBounds(
          jointType as JointAngleType,
          romRange.min,
          romRange.max
        );
        if (!isValid) {
          console.warn(`Invalid ROM bounds for ${jointType}, skipping save`);
          return false;
        }
      }
    }

    const storage: CalibrationStorage = {
      version: CURRENT_VERSION,
      profile: {
        ...profile,
        updatedAt: Date.now(),
      },
      lastCalibrationDate: Date.now(),
    };

    return saveStorage(storage);
  } catch (error) {
    console.error('Failed to save calibration profile:', error);
    return false;
  }
}

// Clear calibration profile from localStorage
export function clearCalibrationProfile(): boolean {
  try {
    if (typeof window === 'undefined') return false;

    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear calibration profile:', error);
    return false;
  }
}

// Check if a calibration profile exists
export function hasCalibrationProfile(): boolean {
  try {
    if (typeof window === 'undefined') return false;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw) as CalibrationStorage;
    return data.profile !== null && data.profile.isComplete;
  } catch {
    return false;
  }
}

// Get the age of the calibration in days
export function getCalibrationAge(): number | null {
  try {
    if (typeof window === 'undefined') return null;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as CalibrationStorage;
    if (!data.lastCalibrationDate) return null;

    const ageMs = Date.now() - data.lastCalibrationDate;
    return Math.floor(ageMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// Create a new empty calibration profile with UUID
export function createNewProfile(): CalibrationProfile {
  return {
    id: generateUUID(),
    version: CURRENT_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    joints: {},
    isComplete: false,
    confidenceScores: {},
  };
}

// Generate a simple UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Update a single joint's ROM in the profile
export function updateJointROM(
  profile: CalibrationProfile,
  jointType: JointAngleType,
  min: number,
  max: number,
  confidence: number
): CalibrationProfile {
  const optimal = (min + max) / 2;
  const romRange: JointROMRange = { min, max, optimal };

  return {
    ...profile,
    updatedAt: Date.now(),
    joints: {
      ...profile.joints,
      [jointType]: romRange,
    },
    confidenceScores: {
      ...profile.confidenceScores,
      [jointType]: confidence,
    },
  };
}

// Check if all required joints are calibrated
export function checkProfileComplete(
  profile: CalibrationProfile,
  requiredJoints: JointAngleType[]
): boolean {
  return requiredJoints.every((jointType) => {
    const romRange = profile.joints[jointType];
    const confidence = profile.confidenceScores[jointType];
    return romRange && confidence && confidence >= 0.7;
  });
}
