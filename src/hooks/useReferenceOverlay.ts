import { useState, useCallback, useEffect } from 'react';
import type { ReferenceOverlayPreferences, DeviationAnalysis, ExerciseReferenceData } from '@/types/referencePose';
import { loadReferenceData, isReferenceDataAvailable } from '@/data/referencePoses';
import { REFERENCE_OVERLAY_CONFIG } from '@/components/ReferenceOverlay/constants';

interface UseReferenceOverlayOptions {
  exerciseType: string;
  autoLoad?: boolean;
}

interface UseReferenceOverlayReturn {
  // State
  preferences: ReferenceOverlayPreferences;
  referenceData: ExerciseReferenceData | null;
  latestAnalysis: DeviationAnalysis | null;
  isLoading: boolean;
  isAvailable: boolean;

  // Actions
  setPreferences: (prefs: ReferenceOverlayPreferences) => void;
  updatePreference: <K extends keyof ReferenceOverlayPreferences>(
    key: K,
    value: ReferenceOverlayPreferences[K]
  ) => void;
  setLatestAnalysis: (analysis: DeviationAnalysis | null) => void;
  loadReference: () => Promise<void>;
}

const DEFAULT_PREFERENCES: ReferenceOverlayPreferences = {
  enabled: false,
  opacity: REFERENCE_OVERLAY_CONFIG.defaultOpacity,
  showDeviationHighlights: true,
  selectedExercise: null,
};

export function useReferenceOverlay({
  exerciseType,
  autoLoad = true,
}: UseReferenceOverlayOptions): UseReferenceOverlayReturn {
  const [preferences, setPreferences] = useState<ReferenceOverlayPreferences>(DEFAULT_PREFERENCES);
  const [referenceData, setReferenceData] = useState<ExerciseReferenceData | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<DeviationAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAvailable = isReferenceDataAvailable(exerciseType);

  // Load preferences from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(REFERENCE_OVERLAY_CONFIG.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed, selectedExercise: exerciseType });
      }
    } catch {
      // Ignore
    }
  }, [exerciseType]);

  // Save preferences to storage
  useEffect(() => {
    try {
      localStorage.setItem(REFERENCE_OVERLAY_CONFIG.storageKey, JSON.stringify(preferences));
    } catch {
      // Ignore
    }
  }, [preferences]);

  const loadReference = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    try {
      const data = await loadReferenceData(exerciseType);
      setReferenceData(data);
    } catch {
      setReferenceData(null);
    } finally {
      setIsLoading(false);
    }
  }, [exerciseType, isAvailable]);

  // Auto-load reference data
  useEffect(() => {
    if (autoLoad && preferences.enabled && isAvailable) {
      loadReference();
    }
  }, [autoLoad, preferences.enabled, isAvailable, loadReference]);

  const updatePreference = useCallback(<K extends keyof ReferenceOverlayPreferences>(
    key: K,
    value: ReferenceOverlayPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  return {
    preferences,
    referenceData,
    latestAnalysis,
    isLoading,
    isAvailable,
    setPreferences,
    updatePreference,
    setLatestAnalysis,
    loadReference,
  };
}
