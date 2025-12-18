import type { DetectionCacheEntry, ExerciseDetectionResult } from '@/types/exerciseDetection';

const CACHE_KEY = 'exercise-detection-cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days

export async function getCachedDetection(videoChecksum: string): Promise<ExerciseDetectionResult | null> {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) return null;

    const cache: Record<string, DetectionCacheEntry> = JSON.parse(cacheStr);
    const entry = cache[videoChecksum];

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete cache[videoChecksum];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return entry.result;
  } catch {
    return null;
  }
}

export async function cacheDetectionResult(
  videoChecksum: string,
  result: ExerciseDetectionResult
): Promise<void> {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    const cache: Record<string, DetectionCacheEntry> = cacheStr ? JSON.parse(cacheStr) : {};

    cache[videoChecksum] = {
      videoChecksum,
      result,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_EXPIRY_MS
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache errors
  }
}

export async function clearDetectionCache(): Promise<void> {
  localStorage.removeItem(CACHE_KEY);
}
