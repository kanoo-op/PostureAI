import type { ThumbnailData } from '@/types/video';

/**
 * Memory-efficient cache for thumbnail lookup with O(log n) binary search
 */
export class ThumbnailCache {
  private thumbnails: ThumbnailData[] = [];
  private blobUrls: Set<string> = new Set();

  /**
   * Initialize cache with thumbnails (must be sorted by timestamp)
   */
  initialize(thumbnails: ThumbnailData[]): void {
    this.clear();
    this.thumbnails = [...thumbnails].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Binary search for nearest thumbnail to given timestamp
   * @param timestamp - Time in seconds
   * @returns Nearest ThumbnailData or null if cache is empty
   */
  getNearestThumbnail(timestamp: number): ThumbnailData | null {
    if (this.thumbnails.length === 0) return null;

    let left = 0;
    let right = this.thumbnails.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.thumbnails[mid].timestamp < timestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // Check if previous thumbnail is closer
    if (left > 0) {
      const prevDiff = Math.abs(this.thumbnails[left - 1].timestamp - timestamp);
      const currDiff = Math.abs(this.thumbnails[left].timestamp - timestamp);
      if (prevDiff < currDiff) {
        return this.thumbnails[left - 1];
      }
    }

    return this.thumbnails[left];
  }

  /**
   * Get thumbnails within a visible time range (for efficient rendering)
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @returns Array of thumbnails within range
   */
  getThumbnailsInRange(startTime: number, endTime: number): ThumbnailData[] {
    if (this.thumbnails.length === 0) return [];

    // Binary search for start index
    let startIdx = 0;
    let left = 0;
    let right = this.thumbnails.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.thumbnails[mid].timestamp < startTime) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    startIdx = Math.max(0, left - 1); // Include one before for smooth edges

    // Binary search for end index
    left = startIdx;
    right = this.thumbnails.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      if (this.thumbnails[mid].timestamp <= endTime) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }
    const endIdx = Math.min(this.thumbnails.length - 1, left + 1);

    return this.thumbnails.slice(startIdx, endIdx + 1);
  }

  /**
   * Get total thumbnail count
   */
  get count(): number {
    return this.thumbnails.length;
  }

  /**
   * Create Blob URL from data URL for better memory efficiency
   * Tracks URLs for cleanup
   */
  createBlobUrl(dataUrl: string): string {
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    const url = URL.createObjectURL(blob);
    this.blobUrls.add(url);
    return url;
  }

  /**
   * Clear cache and revoke all Blob URLs
   */
  clear(): void {
    this.blobUrls.forEach(url => URL.revokeObjectURL(url));
    this.blobUrls.clear();
    this.thumbnails = [];
  }
}

export const thumbnailCache = new ThumbnailCache();
