/**
 * Video Frame Capture Utility
 * Captures individual frames from HTMLVideoElement at specific timestamps
 */

import type { RepAnalysisResult } from '@/types/video';
import type { ProblemMomentCapture } from './videoPdfReport';

export interface CaptureOptions {
  width?: number;      // Output width (default: 400)
  height?: number;     // Output height (default: 300)
  quality?: number;    // JPEG quality 0-1 (default: 0.8)
  maintainAspectRatio?: boolean; // Default: true
}

export interface CapturedFrame {
  dataUrl: string;     // Base64 data URL (image/jpeg)
  timestamp: number;   // Capture timestamp in ms
  width: number;       // Actual captured width
  height: number;      // Actual captured height
}

export interface CaptureProblemMomentsOptions extends CaptureOptions {
  maxCaptures?: number;  // Limit number of captures (default: 10)
}

const DEFAULT_OPTIONS: Required<CaptureOptions> = {
  width: 400,
  height: 300,
  quality: 0.8,
  maintainAspectRatio: true,
};

const SEEK_TIMEOUT_MS = 5000;

/**
 * Calculate output dimensions respecting aspect ratio constraints
 */
function calculateDimensions(
  videoWidth: number,
  videoHeight: number,
  targetWidth: number,
  targetHeight: number,
  maintainAspectRatio: boolean
): { width: number; height: number } {
  if (!maintainAspectRatio) {
    return { width: targetWidth, height: targetHeight };
  }

  const videoAspectRatio = videoWidth / videoHeight;
  const targetAspectRatio = targetWidth / targetHeight;

  let width: number;
  let height: number;

  if (videoAspectRatio > targetAspectRatio) {
    // Video is wider than target - fit by width
    width = targetWidth;
    height = Math.round(targetWidth / videoAspectRatio);
  } else {
    // Video is taller than target - fit by height
    height = targetHeight;
    width = Math.round(targetHeight * videoAspectRatio);
  }

  return { width, height };
}

/**
 * Seek video to a specific timestamp (in milliseconds)
 * Returns a promise that resolves when seeking is complete
 */
function seekToTime(video: HTMLVideoElement, timestampMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Seek timeout: Failed to seek to ${timestampMs}ms within ${SEEK_TIMEOUT_MS}ms`));
    }, SEEK_TIMEOUT_MS);

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error(`Seek error: Failed to seek video to ${timestampMs}ms`));
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });

    // Clamp timestamp to valid range
    const durationMs = video.duration * 1000;
    const clampedTimestamp = Math.max(0, Math.min(timestampMs, durationMs - 1));
    video.currentTime = clampedTimestamp / 1000;
  });
}

/**
 * Capture a single frame from a video at the specified timestamp
 *
 * @param video - HTMLVideoElement to capture from
 * @param timestampMs - Timestamp in milliseconds
 * @param options - Capture options
 * @returns Promise<CapturedFrame> - The captured frame data
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  timestampMs: number,
  options?: CaptureOptions
): Promise<CapturedFrame> {
  if (!video || !(video instanceof HTMLVideoElement)) {
    throw new Error('Invalid video element: Must provide a valid HTMLVideoElement');
  }

  if (video.readyState < 2) {
    throw new Error('Video not ready: Video must be loaded before capturing frames');
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Seek to the specified timestamp
  await seekToTime(video, timestampMs);

  // Calculate output dimensions
  const { width, height } = calculateDimensions(
    video.videoWidth,
    video.videoHeight,
    opts.width,
    opts.height,
    opts.maintainAspectRatio
  );

  // Create canvas and capture frame
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context error: Failed to get 2D canvas context');
  }

  // Draw the current video frame onto the canvas
  ctx.drawImage(video, 0, 0, width, height);

  // Convert to data URL
  const dataUrl = canvas.toDataURL('image/jpeg', opts.quality);

  return {
    dataUrl,
    timestamp: timestampMs,
    width,
    height,
  };
}

/**
 * Capture screenshots of problem moments (worst form frames) from rep analysis
 *
 * @param video - HTMLVideoElement to capture from
 * @param reps - Array of rep analysis results containing worstMoment data
 * @param options - Capture options including maxCaptures limit
 * @returns Promise<ProblemMomentCapture[]> - Array of captured problem moments
 */
export async function captureProblemMoments(
  video: HTMLVideoElement | null | undefined,
  reps: RepAnalysisResult[],
  options?: CaptureProblemMomentsOptions
): Promise<ProblemMomentCapture[]> {
  if (!video) {
    console.warn('captureProblemMoments: Video element is null or undefined');
    return [];
  }

  if (!reps || reps.length === 0) {
    return [];
  }

  const opts = { ...DEFAULT_OPTIONS, maxCaptures: 10, ...options };
  const captures: ProblemMomentCapture[] = [];

  // Limit the number of reps to process
  const repsToProcess = reps.slice(0, opts.maxCaptures);

  for (const rep of repsToProcess) {
    if (!rep.worstMoment) {
      continue;
    }

    try {
      const frame = await captureVideoFrame(video, rep.worstMoment.timestamp, {
        width: opts.width,
        height: opts.height,
        quality: opts.quality,
        maintainAspectRatio: opts.maintainAspectRatio,
      });

      captures.push({
        timestamp: rep.worstMoment.timestamp,
        repNumber: rep.repNumber,
        score: rep.worstMoment.score,
        feedbacks: rep.worstMoment.feedbacks,
        screenshotDataUrl: frame.dataUrl,
      });
    } catch (error) {
      console.warn(
        `captureProblemMoments: Failed to capture frame for rep ${rep.repNumber} at ${rep.worstMoment.timestamp}ms:`,
        error
      );
      // Continue with other captures
    }
  }

  return captures;
}
