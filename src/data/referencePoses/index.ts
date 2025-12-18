import type { ExerciseReferenceData } from '@/types/referencePose';

// Registry of available reference data
const REFERENCE_DATA_REGISTRY: Record<string, () => Promise<ExerciseReferenceData>> = {
  squat: () => import('./squat.json').then(m => m.default as ExerciseReferenceData),
  // Add more exercises as needed
};

// Cache for loaded data
const loadedData = new Map<string, ExerciseReferenceData>();

export async function loadReferenceData(exerciseType: string): Promise<ExerciseReferenceData | null> {
  if (loadedData.has(exerciseType)) {
    return loadedData.get(exerciseType)!;
  }

  const loader = REFERENCE_DATA_REGISTRY[exerciseType];
  if (!loader) return null;

  try {
    const data = await loader();
    loadedData.set(exerciseType, data);
    return data;
  } catch {
    return null;
  }
}

export function isReferenceDataAvailable(exerciseType: string): boolean {
  return exerciseType in REFERENCE_DATA_REGISTRY;
}

export function getAvailableExercises(): string[] {
  return Object.keys(REFERENCE_DATA_REGISTRY);
}
