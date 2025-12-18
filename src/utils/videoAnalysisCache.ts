import type {
  AnalysisCacheEntry,
  AnalysisCacheSummary,
  FramePoseData,
  VideoAnalysisConfig,
  VideoAnalysisProgress,
  VideoMetadata,
  VideoExerciseType,
  StorageQuotaInfo,
  CacheAnalysisStatus,
} from '@/types/video';

// Constants
const DB_NAME = 'VideoAnalysisDB';
const DB_VERSION = 1;
const STORE_NAME = 'analyses';
export const CACHE_SAVE_INTERVAL = 10; // Save every 10 frames
const DEFAULT_EXPIRY_DAYS = 7;
const STORAGE_WARNING_THRESHOLD = 80; // Warn at 80% usage

/** Singleton database connection */
let dbInstance: IDBDatabase | null = null;

/** Opens or creates the IndexedDB database */
async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Failed to open database'));

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

/** Generates a simple checksum from file metadata (not cryptographic) */
export async function generateVideoChecksum(file: File): Promise<string> {
  // Use file properties as a fast checksum (for change detection, not security)
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/** Generates a unique ID for analysis */
export function generateAnalysisId(): string {
  return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Creates a new analysis cache entry */
export async function createCacheEntry(
  id: string,
  videoMetadata: VideoMetadata,
  videoChecksum: string,
  config: VideoAnalysisConfig,
  exerciseType: VideoExerciseType | 'auto'
): Promise<AnalysisCacheEntry> {
  const now = Date.now();
  const entry: AnalysisCacheEntry = {
    id,
    videoMetadata,
    videoChecksum,
    config,
    frames: [],
    progress: {
      status: 'initializing',
      currentFrame: 0,
      totalFrames: 0,
      percent: 0,
      estimatedTimeRemaining: 0,
      processingRate: 0,
      failedFrames: 0,
    },
    status: 'in_progress',
    exerciseType,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + (DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  };

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(entry);

    request.onsuccess = () => resolve(entry);
    request.onerror = () => reject(new Error('Failed to create cache entry'));
  });
}

/** Updates frames and progress in cache (call every CACHE_SAVE_INTERVAL frames) */
export async function updateCacheProgress(
  id: string,
  frames: FramePoseData[],
  progress: VideoAnalysisProgress
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const entry = getRequest.result as AnalysisCacheEntry | undefined;
      if (!entry) {
        reject(new Error('Cache entry not found'));
        return;
      }

      entry.frames = frames;
      entry.progress = progress;
      entry.updatedAt = Date.now();

      const putRequest = store.put(entry);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error('Failed to update cache'));
    };

    getRequest.onerror = () => reject(new Error('Failed to read cache entry'));
  });
}

/** Marks analysis as completed */
export async function completeCacheEntry(id: string): Promise<void> {
  await updateCacheStatus(id, 'completed');
}

/** Marks analysis as paused (for resume) */
export async function pauseCacheEntry(id: string): Promise<void> {
  await updateCacheStatus(id, 'paused');
}

/** Updates cache entry status */
export async function updateCacheStatus(
  id: string,
  status: CacheAnalysisStatus,
  errorMessage?: string
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const entry = getRequest.result as AnalysisCacheEntry | undefined;
      if (!entry) {
        reject(new Error('Cache entry not found'));
        return;
      }

      entry.status = status;
      entry.updatedAt = Date.now();
      if (errorMessage) entry.errorMessage = errorMessage;

      const putRequest = store.put(entry);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error('Failed to update status'));
    };

    getRequest.onerror = () => reject(new Error('Failed to read cache entry'));
  });
}

/** Gets a cache entry by ID */
export async function getCacheEntry(id: string): Promise<AnalysisCacheEntry | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Failed to get cache entry'));
  });
}

/** Finds incomplete analyses that can be resumed */
export async function findResumableAnalysis(
  videoChecksum: string
): Promise<AnalysisCacheEntry | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const entries: AnalysisCacheEntry[] = [];

    // Check both 'in_progress' and 'paused' statuses
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const entry = cursor.value as AnalysisCacheEntry;
        if (
          (entry.status === 'in_progress' || entry.status === 'paused') &&
          entry.videoChecksum === videoChecksum &&
          entry.expiresAt > Date.now()
        ) {
          entries.push(entry);
        }
        cursor.continue();
      } else {
        // Return most recent if multiple found
        if (entries.length > 0) {
          entries.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(entries[0]);
        } else {
          resolve(null);
        }
      }
    };

    request.onerror = () => reject(new Error('Failed to find resumable analysis'));
  });
}

/** Gets all analysis entries as summaries for history display */
export async function getAllAnalysisSummaries(): Promise<AnalysisCacheSummary[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const entries = request.result as AnalysisCacheEntry[];
      const summaries: AnalysisCacheSummary[] = entries
        .filter(e => e.expiresAt > Date.now())
        .map(entry => ({
          id: entry.id,
          videoName: entry.videoMetadata.fileName,
          exerciseType: entry.exerciseType,
          status: entry.status,
          progressPercent: entry.progress.percent,
          framesProcessed: entry.progress.currentFrame,
          totalFrames: entry.progress.totalFrames,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);

      resolve(summaries);
    };

    request.onerror = () => reject(new Error('Failed to get analysis summaries'));
  });
}

/** Deletes a cache entry */
export async function deleteCacheEntry(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete cache entry'));
  });
}

/** Clears all cache entries */
export async function clearAllCache(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear cache'));
  });
}

/** Removes expired entries (garbage collection) */
export async function removeExpiredEntries(): Promise<number> {
  const db = await openDatabase();
  const now = Date.now();
  let removedCount = 0;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const entry = cursor.value as AnalysisCacheEntry;
        if (entry.expiresAt < now) {
          cursor.delete();
          removedCount++;
        }
        cursor.continue();
      } else {
        resolve(removedCount);
      }
    };

    request.onerror = () => reject(new Error('Failed to remove expired entries'));
  });
}

/** Gets storage quota information */
export async function getStorageQuota(): Promise<StorageQuotaInfo> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const available = estimate.quota || 0;
    return {
      used,
      available,
      percentUsed: available > 0 ? Math.round((used / available) * 100) : 0,
    };
  }
  // Fallback for browsers without StorageManager
  return { used: 0, available: 0, percentUsed: 0 };
}

/** Checks if storage quota is sufficient for new analysis */
export async function hasStorageQuota(requiredBytes: number = 50 * 1024 * 1024): Promise<boolean> {
  const quota = await getStorageQuota();
  return quota.percentUsed < STORAGE_WARNING_THRESHOLD && (quota.available - quota.used) > requiredBytes;
}
