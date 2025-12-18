import type { PoseDetector } from '@tensorflow-models/pose-detection';
import type { Pose3D } from '@/types/pose';
import type {
  VideoAnalysisConfig,
  VideoAnalysisProgress,
  VideoAnalysisResult,
  FramePoseData,
  VideoAnalysisSummary,
  VideoMetadata,
  ExtractedFrame,
} from '@/types/video';
import { extractFramesFromVideo, calculateTotalFrames } from './videoFrameExtractor';

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
 * Generates a unique ID for analysis results
 */
function generateAnalysisId(): string {
  return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculates average confidence from keypoints
 */
function calculateAverageConfidence(pose: Pose3D | null): number {
  if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
    return 0;
  }

  const scores = pose.keypoints
    .map(kp => kp.score ?? 0)
    .filter(score => score > 0);

  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Creates a pose detector for video analysis.
 * Uses the same configuration pattern as usePoseDetection.ts
 */
export async function createPoseDetector(
  config: VideoAnalysisConfig
): Promise<PoseDetector> {
  // Dynamic imports for better code splitting
  const [tf, poseDetection] = await Promise.all([
    import('@tensorflow/tfjs-core'),
    import('@tensorflow-models/pose-detection'),
  ]);

  // Import and set backend
  await import('@tensorflow/tfjs-backend-webgl');
  await tf.setBackend('webgl');
  await tf.ready();

  const model = poseDetection.SupportedModels.BlazePose;
  const modelComplexity = config.modelComplexity ?? 1;
  const detectorConfig = {
    runtime: 'mediapipe' as const,
    modelType: (['lite', 'full', 'heavy'] as const)[modelComplexity],
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',
    enableSmoothing: true,
    enableSegmentation: false,
  };

  return poseDetection.createDetector(model, detectorConfig);
}

/**
 * Extracts video metadata from HTMLVideoElement
 */
function extractVideoMetadata(video: HTMLVideoElement, fileName?: string): VideoMetadata {
  return {
    duration: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
    fileSize: 0, // Not available from video element
    mimeType: '', // Not available from video element
    fileName: fileName || 'video',
    lastModified: Date.now(),
  };
}

/**
 * Processes a single frame with pose detection
 */
async function processFrame(
  detector: PoseDetector,
  frame: ExtractedFrame,
  frameIndex: number,
  minDetectionConfidence: number
): Promise<FramePoseData> {
  const startTime = performance.now();

  try {
    const poses = await detector.estimatePoses(frame.canvas, {
      flipHorizontal: false,
    });

    const processingTime = performance.now() - startTime;
    const pose = poses[0] as Pose3D | undefined;

    // Filter by confidence
    if (pose && (pose.score ?? 1) < minDetectionConfidence) {
      return {
        frameIndex,
        timestamp: Math.round(frame.timestamp * 1000), // Convert to milliseconds
        pose: null,
        confidence: 0,
        processingTime,
      };
    }

    return {
      frameIndex,
      timestamp: Math.round(frame.timestamp * 1000), // Convert to milliseconds
      pose: pose || null,
      confidence: calculateAverageConfidence(pose || null),
      processingTime,
    };
  } catch (error) {
    const processingTime = performance.now() - startTime;
    console.error(`Failed to process frame ${frameIndex}:`, error);

    return {
      frameIndex,
      timestamp: Math.round(frame.timestamp * 1000),
      pose: null,
      confidence: 0,
      processingTime,
    };
  }
}

/**
 * Main processing function that runs MediaPipe BlazePose on video frames.
 * Processes frames in batches for memory efficiency and UI responsiveness.
 *
 * @param video - The HTMLVideoElement to process
 * @param config - Configuration for video analysis
 * @param onProgress - Callback for progress updates
 * @param abortSignal - Optional AbortSignal for cancellation
 * @param initialFrames - Optional initial frames for resume capability
 * @returns Complete VideoAnalysisResult
 */
export async function processVideoFrames(
  video: HTMLVideoElement,
  config: VideoAnalysisConfig,
  onProgress: (progress: VideoAnalysisProgress) => void,
  abortSignal?: AbortSignal,
  initialFrames?: FramePoseData[]
): Promise<VideoAnalysisResult> {
  const analysisId = generateAnalysisId();
  const createdAt = Date.now();
  const totalFrames = calculateTotalFrames(video.duration, config);
  const minDetectionConfidence = config.minDetectionConfidence ?? 0.5;

  // Initialize progress from initial frames if resuming
  const frames: FramePoseData[] = initialFrames ? [...initialFrames] : [];
  let currentFrame = initialFrames ? initialFrames.length : 0;
  let failedFrames = initialFrames ? initialFrames.filter(f => f.pose === null).length : 0;

  // Track processing times for ETA calculation (sliding window of last 10 batches)
  const processingTimes: number[] = [];
  const maxTimeWindow = 10;
  let processingStartTime = 0;

  // Initialize detector
  onProgress({
    status: 'initializing',
    currentFrame: 0,
    totalFrames,
    percent: 0,
    estimatedTimeRemaining: 0,
    processingRate: 0,
    failedFrames: 0,
  });

  let detector: PoseDetector | null = null;

  try {
    detector = await createPoseDetector(config);

    // Check for cancellation after initialization
    if (abortSignal?.aborted) {
      throw new DOMException('Analysis cancelled', 'AbortError');
    }

    processingStartTime = performance.now();

    // Update status to extracting
    onProgress({
      status: 'extracting',
      currentFrame: 0,
      totalFrames,
      percent: 0,
      estimatedTimeRemaining: 0,
      processingRate: 0,
      failedFrames: 0,
    });

    // Calculate start time for resume (if resuming, start after last processed frame)
    const resumeStartTime = initialFrames && initialFrames.length > 0
      ? (initialFrames[initialFrames.length - 1].timestamp / 1000) + (1 / config.frameRate)
      : config.startTime;

    // Process frames using the generator
    const frameGenerator = extractFramesFromVideo(
      video,
      { ...config, startTime: resumeStartTime },
      undefined,
      abortSignal
    );
    let batch: ExtractedFrame[] = [];
    let batchStartTime = performance.now();

    for await (const frame of frameGenerator) {
      // Check for cancellation
      if (abortSignal?.aborted) {
        throw new DOMException('Analysis cancelled', 'AbortError');
      }

      batch.push(frame);

      // Process batch when full
      if (batch.length >= config.batchSize) {
        // Update status to processing
        onProgress({
          status: 'processing',
          currentFrame,
          totalFrames,
          percent: Math.round((currentFrame / totalFrames) * 100),
          estimatedTimeRemaining: calculateETA(processingTimes, currentFrame, totalFrames),
          processingRate: calculateProcessingRate(processingStartTime, currentFrame),
          failedFrames,
        });

        // Process each frame in the batch
        for (const batchFrame of batch) {
          const result = await processFrame(
            detector,
            batchFrame,
            currentFrame,
            minDetectionConfidence
          );

          frames.push(result);
          if (result.pose === null) {
            failedFrames++;
          }
          currentFrame++;

          // Clean up frame resources
          cleanupFrame(batchFrame);
        }

        // Track batch processing time
        const batchTime = performance.now() - batchStartTime;
        processingTimes.push(batchTime / batch.length);
        if (processingTimes.length > maxTimeWindow) {
          processingTimes.shift();
        }

        // Update progress
        onProgress({
          status: 'processing',
          currentFrame,
          totalFrames,
          percent: Math.round((currentFrame / totalFrames) * 100),
          estimatedTimeRemaining: calculateETA(processingTimes, currentFrame, totalFrames),
          processingRate: calculateProcessingRate(processingStartTime, currentFrame),
          failedFrames,
        });

        // Clear batch and yield to main thread
        batch = [];
        batchStartTime = performance.now();
        await yieldToMainThread();
      }
    }

    // Process remaining frames in the last incomplete batch
    if (batch.length > 0) {
      for (const batchFrame of batch) {
        const result = await processFrame(
          detector,
          batchFrame,
          currentFrame,
          minDetectionConfidence
        );

        frames.push(result);
        if (result.pose === null) {
          failedFrames++;
        }
        currentFrame++;

        // Clean up frame resources
        cleanupFrame(batchFrame);
      }

      onProgress({
        status: 'processing',
        currentFrame,
        totalFrames,
        percent: Math.round((currentFrame / totalFrames) * 100),
        estimatedTimeRemaining: 0,
        processingRate: calculateProcessingRate(processingStartTime, currentFrame),
        failedFrames,
      });
    }

    const completedAt = Date.now();
    const totalProcessingTime = completedAt - createdAt;

    // Calculate summary
    const summary: VideoAnalysisSummary = {
      totalFrames: frames.length,
      successfulFrames: frames.length - failedFrames,
      failedFrames,
      averageConfidence: calculateOverallAverageConfidence(frames),
      totalProcessingTime,
      averageProcessingRate: frames.length / (totalProcessingTime / 1000),
    };

    // Final progress update
    onProgress({
      status: 'completed',
      currentFrame: frames.length,
      totalFrames: frames.length,
      percent: 100,
      estimatedTimeRemaining: 0,
      processingRate: summary.averageProcessingRate,
      failedFrames,
    });

    return {
      id: analysisId,
      videoMetadata: extractVideoMetadata(video),
      config,
      frames,
      summary,
      createdAt,
      completedAt,
    };
  } catch (error) {
    // Handle cancellation
    if (error instanceof DOMException && error.name === 'AbortError') {
      onProgress({
        status: 'cancelled',
        currentFrame,
        totalFrames,
        percent: Math.round((currentFrame / totalFrames) * 100),
        estimatedTimeRemaining: 0,
        processingRate: 0,
        failedFrames,
      });
      throw error;
    }

    // Handle other errors
    onProgress({
      status: 'error',
      currentFrame,
      totalFrames,
      percent: Math.round((currentFrame / totalFrames) * 100),
      estimatedTimeRemaining: 0,
      processingRate: 0,
      failedFrames,
    });
    throw error;
  } finally {
    // Cleanup detector
    if (detector) {
      detector.dispose();
    }
  }
}

/**
 * Calculates estimated time remaining based on recent processing times
 */
function calculateETA(
  processingTimes: number[],
  currentFrame: number,
  totalFrames: number
): number {
  if (processingTimes.length === 0) return 0;

  const averageTimePerFrame =
    processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
  const remainingFrames = totalFrames - currentFrame;

  return Math.round(remainingFrames * averageTimePerFrame);
}

/**
 * Calculates current processing rate in frames per second
 */
function calculateProcessingRate(startTime: number, framesProcessed: number): number {
  const elapsedTime = performance.now() - startTime;
  if (elapsedTime === 0) return 0;
  return framesProcessed / (elapsedTime / 1000);
}

/**
 * Calculates overall average confidence from all frames
 */
function calculateOverallAverageConfidence(frames: FramePoseData[]): number {
  const validConfidences = frames
    .map(f => f.confidence)
    .filter(c => c > 0);

  if (validConfidences.length === 0) return 0;
  return validConfidences.reduce((sum, c) => sum + c, 0) / validConfidences.length;
}

/**
 * Cleans up frame resources to free memory
 */
function cleanupFrame(frame: ExtractedFrame): void {
  // Remove canvas from DOM if it was attached
  if (frame.canvas.parentNode) {
    frame.canvas.parentNode.removeChild(frame.canvas);
  }
  // Clear canvas
  const ctx = frame.canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, frame.canvas.width, frame.canvas.height);
  }
}
