import type {
  VideoMetadata,
  VideoValidationResult,
  VideoValidationConfig,
  VideoValidationError,
  VideoValidationWarning,
  ExtractedFrame,
  FrameExtractionConfig,
} from '@/types/video';

// Default validation configuration
export const DEFAULT_VALIDATION_CONFIG: VideoValidationConfig = {
  maxFileSizeMB: 500,
  minDurationSeconds: 10,
  maxDurationSeconds: 600,
  acceptedFormats: ['video/mp4', 'video/webm'],
  minResolution: { width: 480, height: 360 },
};

/**
 * Load a video file into an HTML5 video element
 * Returns a promise that resolves when the video metadata is loaded
 */
export async function loadVideoElement(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true; // Required for autoplay policies
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      resolve(video);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video file'));
    };

    video.src = objectUrl;
  });
}

/**
 * Extract metadata from a video file
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  const video = await loadVideoElement(file);

  const metadata: VideoMetadata = {
    duration: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
    fileSize: file.size,
    mimeType: file.type,
    fileName: file.name,
    lastModified: file.lastModified,
  };

  // Clean up object URL
  URL.revokeObjectURL(video.src);

  return metadata;
}

/**
 * Validate a video file against configuration
 */
export async function validateVideo(
  file: File,
  config: VideoValidationConfig = DEFAULT_VALIDATION_CONFIG
): Promise<VideoValidationResult> {
  const errors: VideoValidationError[] = [];
  const warnings: VideoValidationWarning[] = [];

  // Check file format
  if (!config.acceptedFormats.includes(file.type)) {
    errors.push({
      code: 'INVALID_FORMAT',
      message: `지원하지 않는 형식입니다. MP4 또는 WebM 파일을 업로드해주세요.`,
    });
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > config.maxFileSizeMB) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: `파일 크기가 너무 큽니다. 최대 ${config.maxFileSizeMB}MB까지 업로드 가능합니다.`,
    });
  } else if (fileSizeMB > config.maxFileSizeMB * 0.8) {
    warnings.push({
      code: 'LARGE_FILE',
      message: '파일 크기가 큽니다. 처리 시간이 오래 걸릴 수 있습니다.',
    });
  }

  // If format is invalid, return early
  if (errors.some(e => e.code === 'INVALID_FORMAT')) {
    return { isValid: false, errors, warnings, metadata: null };
  }

  // Try to load and extract metadata
  let metadata: VideoMetadata | null = null;
  try {
    metadata = await extractVideoMetadata(file);

    // Check duration
    if (metadata.duration < config.minDurationSeconds) {
      errors.push({
        code: 'DURATION_TOO_SHORT',
        message: `영상이 너무 짧습니다. 최소 ${config.minDurationSeconds}초 이상이어야 합니다.`,
      });
    }
    if (metadata.duration > config.maxDurationSeconds) {
      errors.push({
        code: 'DURATION_TOO_LONG',
        message: `영상이 너무 깁니다. 최대 ${Math.floor(config.maxDurationSeconds / 60)}분까지 분석 가능합니다.`,
      });
    }

    // Check resolution warnings
    if (config.minResolution) {
      if (metadata.width < config.minResolution.width || metadata.height < config.minResolution.height) {
        warnings.push({
          code: 'LOW_RESOLUTION',
          message: '영상 해상도가 낮습니다. 분석 정확도가 떨어질 수 있습니다.',
        });
      }
    }
  } catch (error) {
    errors.push({
      code: 'LOAD_ERROR',
      message: '영상 파일을 읽을 수 없습니다. 파일이 손상되었을 수 있습니다.',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

/**
 * Extract a single frame from video at specified timestamp
 */
export async function extractFrame(
  video: HTMLVideoElement,
  timestamp: number,
  width?: number,
  height?: number
): Promise<ExtractedFrame> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Use video dimensions or specified dimensions
    canvas.width = width || video.videoWidth;
    canvas.height = height || video.videoHeight;

    const handleSeeked = () => {
      video.removeEventListener('seeked', handleSeeked);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      resolve({
        timestamp,
        imageData,
        canvas,
      });
    };

    video.addEventListener('seeked', handleSeeked);
    video.currentTime = timestamp;
  });
}

/**
 * Extract multiple frames from video
 */
export async function extractFrames(
  video: HTMLVideoElement,
  config: FrameExtractionConfig = {}
): Promise<ExtractedFrame[]> {
  const {
    frameRate = 30,
    startTime = 0,
    endTime = video.duration,
    width,
    height,
  } = config;

  const frames: ExtractedFrame[] = [];
  const interval = 1 / frameRate;

  for (let time = startTime; time < endTime; time += interval) {
    const frame = await extractFrame(video, time, width, height);
    frames.push(frame);
  }

  return frames;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format duration for display (mm:ss format)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Clean up video element and release object URL
 */
export function cleanupVideoElement(video: HTMLVideoElement): void {
  if (video.src) {
    URL.revokeObjectURL(video.src);
  }
  video.src = '';
  video.load();
}
