import type { VideoAnalysisConfig, ExtractedFrame, ThumbnailData } from '@/types/video';

const DEFAULT_THUMBNAIL_WIDTH = 120;
const DEFAULT_THUMBNAIL_HEIGHT = 68;
const DEFAULT_THUMBNAIL_INTERVAL = 1; // seconds

/**
 * Yields to the main thread to prevent UI freeze
 */
async function yieldToMainThread(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Seeks video to a specific timestamp and waits for the seeked event
 */
async function seekToTimestamp(video: HTMLVideoElement, timestamp: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleSeeked = () => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      resolve();
    };

    const handleError = () => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      reject(new Error(`Failed to seek to timestamp ${timestamp}`));
    };

    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);
    video.currentTime = timestamp;
  });
}

/**
 * Extracts a single frame from video at current position
 */
function captureFrame(
  video: HTMLVideoElement,
  timestamp: number,
  width?: number,
  height?: number
): ExtractedFrame {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }

  // Use video dimensions or specified dimensions
  canvas.width = width || video.videoWidth;
  canvas.height = height || video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    timestamp,
    imageData,
    canvas,
  };
}

/**
 * Generates a thumbnail data URL from video at current position
 */
function captureThumbnail(
  video: HTMLVideoElement,
  width: number = DEFAULT_THUMBNAIL_WIDTH,
  height: number = DEFAULT_THUMBNAIL_HEIGHT
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas 2D context for thumbnail');
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(video, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.6); // Use JPEG with 60% quality for smaller size
}

/**
 * Async generator that extracts frames from video at configurable intervals.
 * Uses seek-based extraction for memory-efficient streaming.
 * Supports cancellation via AbortSignal.
 *
 * @param video - The HTMLVideoElement to extract frames from
 * @param config - Configuration for frame extraction
 * @param onProgress - Optional callback for progress updates
 * @param abortSignal - Optional AbortSignal for cancellation
 * @yields ExtractedFrame for each extracted frame
 */
export async function* extractFramesFromVideo(
  video: HTMLVideoElement,
  config: VideoAnalysisConfig,
  onProgress?: (extracted: number, total: number) => void,
  abortSignal?: AbortSignal
): AsyncGenerator<ExtractedFrame> {
  const {
    frameRate,
    startTime = 0,
    endTime = video.duration,
    width,
    height,
  } = config;

  // Calculate total frames and interval
  const duration = endTime - startTime;
  const interval = 1 / frameRate; // Interval in seconds
  const totalFrames = Math.ceil(duration * frameRate);

  let extractedCount = 0;

  // Ensure video is ready
  if (video.readyState < 2) {
    await new Promise<void>((resolve, reject) => {
      const handleCanPlayThrough = () => {
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
        video.removeEventListener('error', handleError);
        resolve();
      };
      const handleError = () => {
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
        video.removeEventListener('error', handleError);
        reject(new Error('Video failed to load'));
      };
      video.addEventListener('canplaythrough', handleCanPlayThrough);
      video.addEventListener('error', handleError);
    });
  }

  for (let i = 0; i < totalFrames; i++) {
    // Check for cancellation before each frame
    if (abortSignal?.aborted) {
      throw new DOMException('Analysis cancelled', 'AbortError');
    }

    const timestamp = startTime + (i * interval);

    // Don't exceed the end time
    if (timestamp > endTime) {
      break;
    }

    try {
      // Seek to the timestamp
      await seekToTimestamp(video, timestamp);

      // Capture the frame
      const frame = captureFrame(video, timestamp, width, height);
      extractedCount++;

      // Report progress
      if (onProgress) {
        onProgress(extractedCount, totalFrames);
      }

      // Yield the frame
      yield frame;

      // Yield to main thread every few frames to prevent UI freeze
      if (i % 3 === 0) {
        await yieldToMainThread();
      }
    } catch (error) {
      // Re-throw abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      // Log other errors but continue processing
      console.error(`Failed to extract frame at timestamp ${timestamp}:`, error);
    }
  }
}

/**
 * Calculates the total number of frames that will be extracted
 */
export function calculateTotalFrames(
  videoDuration: number,
  config: VideoAnalysisConfig
): number {
  const startTime = config.startTime ?? 0;
  const endTime = config.endTime ?? videoDuration;
  const duration = endTime - startTime;
  return Math.ceil(duration * config.frameRate);
}

/**
 * Extracts thumbnails from video at regular intervals
 * @param video - HTMLVideoElement source
 * @param duration - Video duration in seconds
 * @param interval - Interval between thumbnails in seconds (default: 1)
 * @param width - Thumbnail width (default: 120)
 * @param height - Thumbnail height (default: 68)
 * @param onProgress - Progress callback
 * @param abortSignal - Cancellation signal
 */
export async function extractThumbnails(
  video: HTMLVideoElement,
  duration: number,
  interval: number = DEFAULT_THUMBNAIL_INTERVAL,
  width: number = DEFAULT_THUMBNAIL_WIDTH,
  height: number = DEFAULT_THUMBNAIL_HEIGHT,
  onProgress?: (current: number, total: number) => void,
  abortSignal?: AbortSignal
): Promise<ThumbnailData[]> {
  const thumbnails: ThumbnailData[] = [];
  const totalThumbnails = Math.ceil(duration / interval);

  // Ensure video is ready
  if (video.readyState < 2) {
    await new Promise<void>((resolve, reject) => {
      const handleCanPlayThrough = () => {
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
        video.removeEventListener('error', handleError);
        resolve();
      };
      const handleError = () => {
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
        video.removeEventListener('error', handleError);
        reject(new Error('Video failed to load'));
      };
      video.addEventListener('canplaythrough', handleCanPlayThrough);
      video.addEventListener('error', handleError);
    });
  }

  for (let i = 0; i <= totalThumbnails; i++) {
    if (abortSignal?.aborted) {
      throw new DOMException('Thumbnail extraction cancelled', 'AbortError');
    }

    const timestamp = Math.min(i * interval, duration);

    try {
      await seekToTimestamp(video, timestamp);
      const dataUrl = captureThumbnail(video, width, height);

      thumbnails.push({
        timestamp,
        dataUrl,
        width,
        height,
      });

      if (onProgress) {
        onProgress(i + 1, totalThumbnails + 1);
      }

      // Yield to main thread periodically
      if (i % 5 === 0) {
        await yieldToMainThread();
      }
    } catch (error) {
      console.error(`Failed to extract thumbnail at ${timestamp}s:`, error);
    }
  }

  return thumbnails;
}
