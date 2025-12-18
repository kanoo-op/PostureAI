import type { VideoSessionRecord } from '@/types/sessionHistory';
import type { VideoExerciseType } from '@/types/video';

// Key constants
const DB_NAME = 'posture-analysis-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const LOCAL_STORAGE_KEY = 'posture-sessions-fallback';

// Interface for the storage abstraction (for future cloud sync)
export interface ISessionStorage {
  saveSession(session: VideoSessionRecord): Promise<void>;
  getSession(id: string): Promise<VideoSessionRecord | null>;
  getAllSessions(): Promise<VideoSessionRecord[]>;
  getSessionsByExercise(type: VideoExerciseType): Promise<VideoSessionRecord[]>;
  deleteSession(id: string): Promise<void>;
  exportSessions(): Promise<string>;   // JSON export
  importSessions(json: string): Promise<number>;
  getStorageInfo(): Promise<{ used: number; available: number }>;
}

class SessionStorageService implements ISessionStorage {
  private db: IDBDatabase | null = null;
  private useLocalStorage = false;

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    // Check for IndexedDB support
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.useLocalStorage = true;
      throw new Error('IndexedDB not supported');
    }

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.useLocalStorage = true;
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('exerciseType', 'exerciseType', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // LocalStorage fallback methods
  private getFromLocalStorage(): VideoSessionRecord[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data) as VideoSessionRecord[];
    } catch {
      return [];
    }
  }

  private saveToLocalStorage(sessions: VideoSessionRecord[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  }

  async saveSession(session: VideoSessionRecord): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(session);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to save session'));
      });
    } catch {
      // Fallback to localStorage
      const sessions = this.getFromLocalStorage();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      this.saveToLocalStorage(sessions);
    }
  }

  async getSession(id: string): Promise<VideoSessionRecord | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error('Failed to get session'));
      });
    } catch {
      const sessions = this.getFromLocalStorage();
      return sessions.find(s => s.id === id) || null;
    }
  }

  async getAllSessions(): Promise<VideoSessionRecord[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error('Failed to get all sessions'));
      });
    } catch {
      return this.getFromLocalStorage();
    }
  }

  async getSessionsByExercise(type: VideoExerciseType): Promise<VideoSessionRecord[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('exerciseType');
        const request = index.getAll(type);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error('Failed to get sessions by exercise'));
      });
    } catch {
      const sessions = this.getFromLocalStorage();
      return sessions.filter(s => s.exerciseType === type);
    }
  }

  async getSessionsPaginated(offset: number, limit: number): Promise<VideoSessionRecord[]> {
    const allSessions = await this.getAllSessions();
    // Sort by timestamp descending
    allSessions.sort((a, b) => b.timestamp - a.timestamp);
    return allSessions.slice(offset, offset + limit);
  }

  async deleteSession(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete session'));
      });
    } catch {
      const sessions = this.getFromLocalStorage();
      const filtered = sessions.filter(s => s.id !== id);
      this.saveToLocalStorage(filtered);
    }
  }

  async clearExpiredSessions(maxAgeMs: number): Promise<number> {
    const now = Date.now();
    const allSessions = await this.getAllSessions();
    const expiredIds = allSessions
      .filter(s => now - s.timestamp > maxAgeMs)
      .map(s => s.id);

    for (const id of expiredIds) {
      await this.deleteSession(id);
    }

    return expiredIds.length;
  }

  async exportSessions(): Promise<string> {
    const sessions = await this.getAllSessions();
    return JSON.stringify(sessions, null, 2);
  }

  async importSessions(json: string): Promise<number> {
    try {
      const sessions = JSON.parse(json) as VideoSessionRecord[];
      if (!Array.isArray(sessions)) {
        throw new Error('Invalid session data format');
      }

      let importedCount = 0;
      for (const session of sessions) {
        if (session.id && session.timestamp && session.exerciseType) {
          await this.saveSession(session);
          importedCount++;
        }
      }

      return importedCount;
    } catch {
      throw new Error('Failed to import sessions: invalid JSON');
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number }> {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      };
    }

    // Fallback estimate for localStorage
    if (this.useLocalStorage) {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
      return {
        used: new Blob([data]).size,
        available: 5 * 1024 * 1024, // ~5MB typical localStorage limit
      };
    }

    return { used: 0, available: 0 };
  }
}

// Export singleton instance
export const sessionStorageService = new SessionStorageService();
