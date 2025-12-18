import type { FramePoseData } from '@/types/video';
import type { VideoAnalysisConfig } from '@/types/video';
import { processVideoFrames } from './videoPoseProcessor';

/**
 * Extract first N frames from video for exercise detection
 * Optimized for quick extraction without full video processing
 */
export async function extractDetectionFrames(
  videoFile: File,
  frameCount: number = 30,
  onProgress?: (progress: number) => void
): Promise<FramePoseData[]> {
  const video = document.createElement('video');
  video.src = URL.createObjectURL(videoFile);
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Video load failed'));
  });

  // Calculate how many seconds we need (3 seconds at 10fps = 30 frames)
  const durationNeeded = Math.min(3, video.duration);

  const config: VideoAnalysisConfig = {
    frameRate: 10,
    batchSize: 10,
    endTime: durationNeeded,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    generateThumbnails: false
  };

  const abortController = new AbortController();

  try {
    const result = await processVideoFrames(
      video,
      config,
      (progress) => {
        onProgress?.(progress.percent);
      },
      abortController.signal
    );

    return result.frames.slice(0, frameCount);
  } finally {
    URL.revokeObjectURL(video.src);
  }
}
