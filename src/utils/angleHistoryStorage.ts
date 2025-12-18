import { AngleHistoryStorage, SessionRecord, StorageStatus } from '@/types/angleHistory';
import * as exportUtils from './exportUtils';

const STORAGE_KEY = 'postureai_angle_history';
const CURRENT_VERSION = 1;
const ESTIMATED_QUOTA = 5 * 1024 * 1024; // 5MB estimate
const MAX_SESSIONS = 500; // Limit to prevent storage overflow

// Initialize empty storage
function createEmptyStorage(): AngleHistoryStorage {
  return {
    version: CURRENT_VERSION,
    sessions: [],
    lastUpdated: Date.now()
  };
}

// Private: Validate storage structure
function validateStorage(data: unknown): data is AngleHistoryStorage {
  if (!data || typeof data !== 'object') return false;
  const storage = data as AngleHistoryStorage;
  return (
    typeof storage.version === 'number' &&
    Array.isArray(storage.sessions) &&
    typeof storage.lastUpdated === 'number'
  );
}

// Private: Migrate from older versions
function migrateStorage(data: AngleHistoryStorage): AngleHistoryStorage {
  // Future migrations go here
  // For now, just update version
  return { ...data, version: CURRENT_VERSION };
}

// Private: Remove oldest sessions to free space
function pruneOldSessions(storage: AngleHistoryStorage, count: number): boolean {
  if (storage.sessions.length <= count) return false;

  storage.sessions.sort((a, b) => b.timestamp - a.timestamp);
  storage.sessions = storage.sessions.slice(0, storage.sessions.length - count);
  return true;
}

// Load storage with validation
export function loadStorage(): AngleHistoryStorage {
  try {
    if (typeof window === 'undefined') return createEmptyStorage();

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStorage();

    const data = JSON.parse(raw) as AngleHistoryStorage;

    // Version migration if needed
    if (data.version < CURRENT_VERSION) {
      return migrateStorage(data);
    }

    // Validate structure
    if (!validateStorage(data)) {
      console.warn('Invalid storage structure, resetting');
      return createEmptyStorage();
    }

    return data;
  } catch (error) {
    console.error('Failed to load angle history:', error);
    return createEmptyStorage();
  }
}

// Save storage with error handling
export function saveStorage(storage: AngleHistoryStorage): boolean {
  try {
    if (typeof window === 'undefined') return false;

    storage.lastUpdated = Date.now();
    const serialized = JSON.stringify(storage);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Try to free space by removing oldest sessions
      const freed = pruneOldSessions(storage, 50);
      if (freed) {
        return saveStorage(storage);
      }
    }
    console.error('Failed to save angle history:', error);
    return false;
  }
}

// Add a new session record
export function addSession(session: SessionRecord): boolean {
  const storage = loadStorage();

  // Enforce max sessions limit
  if (storage.sessions.length >= MAX_SESSIONS) {
    pruneOldSessions(storage, 100);
  }

  storage.sessions.push(session);
  return saveStorage(storage);
}

// Get sessions filtered by exercise type and date range
export function getSessions(
  exerciseType?: string,
  startDate?: number,
  endDate?: number
): SessionRecord[] {
  const storage = loadStorage();
  let sessions = storage.sessions;

  if (exerciseType) {
    sessions = sessions.filter(s => s.exerciseType === exerciseType);
  }

  if (startDate) {
    sessions = sessions.filter(s => s.timestamp >= startDate);
  }

  if (endDate) {
    sessions = sessions.filter(s => s.timestamp <= endDate);
  }

  return sessions.sort((a, b) => b.timestamp - a.timestamp);
}

// Delete a specific session
export function deleteSession(sessionId: string): boolean {
  const storage = loadStorage();
  const index = storage.sessions.findIndex(s => s.id === sessionId);

  if (index === -1) return false;

  storage.sessions.splice(index, 1);
  return saveStorage(storage);
}

// Clear all sessions for an exercise type
export function clearExerciseHistory(exerciseType: string): boolean {
  const storage = loadStorage();
  storage.sessions = storage.sessions.filter(s => s.exerciseType !== exerciseType);
  return saveStorage(storage);
}

// Get storage status for UI
export function getStorageStatus(): StorageStatus {
  const storage = loadStorage();
  const serialized = JSON.stringify(storage);

  const timestamps = storage.sessions.map(s => s.timestamp);

  return {
    usedBytes: new Blob([serialized]).size,
    totalBytes: ESTIMATED_QUOTA,
    sessionCount: storage.sessions.length,
    oldestSession: timestamps.length > 0 ? Math.min(...timestamps) : null,
    newestSession: timestamps.length > 0 ? Math.max(...timestamps) : null
  };
}

// Export data as JSON
export function exportData(): string {
  const storage = loadStorage();
  return JSON.stringify(storage, null, 2);
}

// Import data from JSON
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString) as AngleHistoryStorage;
    if (!validateStorage(data)) {
      throw new Error('Invalid data structure');
    }
    return saveStorage(data);
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}

// Export a single session as CSV
export function exportSessionAsCSV(sessionId: string, language: 'ko' | 'en' = 'en'): string | null {
  const storage = loadStorage();
  const session = storage.sessions.find(s => s.id === sessionId);
  if (!session) return null;
  return exportUtils.exportSessionAsCSV(session, language);
}

// Export a single session as JSON
export function exportSessionAsJSON(sessionId: string, language: 'ko' | 'en' = 'en'): string | null {
  const storage = loadStorage();
  const session = storage.sessions.find(s => s.id === sessionId);
  if (!session) return null;
  return exportUtils.exportSessionAsJSON(session, language);
}

// Get session by ID
export function getSessionById(sessionId: string): SessionRecord | null {
  const storage = loadStorage();
  return storage.sessions.find(s => s.id === sessionId) || null;
}
