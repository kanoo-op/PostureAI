'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VideoUploader from '@/components/VideoAnalysis/VideoUploader';
import VideoAnalysisProgressCard from '@/components/VideoAnalysis/VideoAnalysisProgressCard';
import ResumeAnalysisModal from '@/components/VideoAnalysis/ResumeAnalysisModal';
import AnalysisHistoryList from '@/components/VideoAnalysis/AnalysisHistoryList';
import CacheManagementDialog from '@/components/VideoAnalysis/CacheManagementDialog';
import ExerciseDetectionContainer from '@/components/VideoAnalysis/ExerciseDetectionContainer';
import VideoRecorder from '@/components/VideoAnalysis/VideoRecorder';
import VideoUploadTabs from '@/components/VideoAnalysis/VideoUploadTabs';
import { ANALYSIS_COLORS, DEFAULT_VIDEO_ANALYSIS_CONFIG } from '@/components/VideoAnalysis/constants';
import { processVideoFrames } from '@/utils/videoPoseProcessor';
import { analyzeVideoReps } from '@/utils/videoRepAnalyzer';
import { useExerciseDetection } from '@/hooks/useExerciseDetection';
import { extractDetectionFrames } from '@/utils/extractDetectionFrames';
import {
  generateVideoChecksum,
  generateAnalysisId,
  createCacheEntry,
  updateCacheProgress,
  completeCacheEntry,
  pauseCacheEntry,
  findResumableAnalysis,
  getAllAnalysisSummaries,
  deleteCacheEntry,
  removeExpiredEntries,
  getCacheEntry,
  CACHE_SAVE_INTERVAL,
} from '@/utils/videoAnalysisCache';
import type {
  VideoMetadata,
  VideoAnalysisProgress,
  VideoExerciseType,
  VideoAnalysisConfig,
  AnalysisCacheEntry,
  AnalysisCacheSummary,
  FramePoseData,
} from '@/types/video';

type PageState = 'upload' | 'ready' | 'detecting' | 'detected' | 'analyzing' | 'completed' | 'error';

const EXERCISE_OPTIONS: Array<{ value: VideoExerciseType | 'auto'; label: string; labelKo: string }> = [
  { value: 'auto', label: 'Auto-detect', labelKo: '자동 감지' },
  { value: 'squat', label: 'Squat', labelKo: '스쿼트' },
  { value: 'pushup', label: 'Push-up', labelKo: '푸시업' },
  { value: 'lunge', label: 'Lunge', labelKo: '런지' },
  { value: 'deadlift', label: 'Deadlift', labelKo: '데드리프트' },
  { value: 'plank', label: 'Plank', labelKo: '플랭크' },
];

export default function VideoUploadPage() {
  const [pageState, setPageState] = useState<PageState>('upload');
  const [inputMode, setInputMode] = useState<'upload' | 'record'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<VideoExerciseType | 'auto'>('auto');
  const [detectedExercise, setDetectedExercise] = useState<VideoExerciseType | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<VideoAnalysisProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoChecksum, setVideoChecksum] = useState<string | null>(null);

  // Cache-related state
  const [resumableAnalysis, setResumableAnalysis] = useState<AnalysisCacheEntry | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showCacheDialog, setShowCacheDialog] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisCacheSummary[]>([]);
  const [currentCacheId, setCurrentCacheId] = useState<string | null>(null);

  // Detection hook
  const { state: detectionState, detect, reset: resetDetection } = useExerciseDetection();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const framesRef = useRef<FramePoseData[]>([]);
  const router = useRouter();

  // Initialize cache: garbage collection and load history
  useEffect(() => {
    const initCache = async () => {
      try {
        await removeExpiredEntries();
        const history = await getAllAnalysisSummaries();
        setAnalysisHistory(history);
      } catch (error) {
        console.error('Cache initialization failed:', error);
      }
    };
    initCache();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // beforeunload handler during analysis
  useEffect(() => {
    if (pageState === 'analyzing' || pageState === 'detecting') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '분석이 진행 중입니다. 페이지를 떠나면 진행 상황이 저장됩니다.';
        return e.returnValue;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [pageState]);

  const handleVideoReady = useCallback(async (file: File, metadata: VideoMetadata) => {
    setVideoFile(file);
    setVideoMetadata(metadata);
    resetDetection();
    setDetectedExercise(null);

    // Generate checksum for caching
    try {
      const checksum = await generateVideoChecksum(file);
      setVideoChecksum(checksum);

      // Check for resumable analysis
      const resumable = await findResumableAnalysis(checksum);
      if (resumable) {
        setResumableAnalysis(resumable);
        setShowResumeModal(true);
      }
    } catch (error) {
      console.error('Resume check failed:', error);
    }

    setPageState('ready');
    setErrorMessage(null);
  }, [resetDetection]);

  const handleVideoRemoved = useCallback(() => {
    setVideoFile(null);
    setVideoMetadata(null);
    setVideoChecksum(null);
    setPageState('upload');
    setErrorMessage(null);
    resetDetection();
    setDetectedExercise(null);
  }, [resetDetection]);

  const handleUploadError = useCallback((error: string) => {
    setErrorMessage(error);
  }, []);

  const handleCancelAnalysis = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (currentCacheId) {
      try {
        await pauseCacheEntry(currentCacheId);
        // Refresh history
        const history = await getAllAnalysisSummaries();
        setAnalysisHistory(history);
      } catch (error) {
        console.error('Failed to pause cache:', error);
      }
    }
  }, [currentCacheId]);

  // Run exercise detection when "자동 감지" is selected and user clicks "분석 시작"
  const handleRunDetection = useCallback(async () => {
    if (!videoFile || !videoChecksum) return;

    setPageState('detecting');

    try {
      // Extract frames for detection
      const frames = await extractDetectionFrames(videoFile, 30);

      // Run detection
      const result = await detect(frames, videoChecksum);

      if (result) {
        setDetectedExercise(result.detectedType);
        setPageState('detected');
      } else {
        // Detection failed or timed out - handled by hook state
        setPageState('detected');
      }
    } catch (error) {
      console.error('Detection failed:', error);
      setPageState('ready');
      setErrorMessage('운동 감지에 실패했습니다. 직접 선택해 주세요.');
    }
  }, [videoFile, videoChecksum, detect]);

  // Confirm detected exercise and proceed to analysis
  const handleConfirmDetection = useCallback((exerciseType: VideoExerciseType) => {
    setDetectedExercise(exerciseType);
    setSelectedExercise(exerciseType);
    handleStartAnalysis(undefined, exerciseType);
  }, []);

  // Switch to manual selection
  const handleChangeExercise = useCallback(() => {
    setSelectedExercise('squat'); // Default to first manual option
    setPageState('ready');
    resetDetection();
    setDetectedExercise(null);
  }, [resetDetection]);

  // Retry detection
  const handleRetryDetection = useCallback(() => {
    resetDetection();
    handleRunDetection();
  }, [resetDetection, handleRunDetection]);

  const handleStartAnalysis = useCallback(async (resumeFrom?: AnalysisCacheEntry, overrideExercise?: VideoExerciseType) => {
    if (!videoFile || !videoMetadata) return;

    // If auto-detect is selected and we haven't detected yet, run detection first
    if (selectedExercise === 'auto' && !overrideExercise && !resumeFrom) {
      handleRunDetection();
      return;
    }

    if (!resumeFrom && pageState !== 'ready' && pageState !== 'detected') return;

    // Create hidden video element for processing
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;
    videoRef.current = video;

    // Wait for video to be ready
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('비디오 로드 실패'));
      });
    } catch (error) {
      setPageState('error');
      setErrorMessage(error instanceof Error ? error.message : '비디오 로드 실패');
      URL.revokeObjectURL(video.src);
      return;
    }

    // Create abort controller
    abortControllerRef.current = new AbortController();
    setPageState('analyzing');
    setErrorMessage(null);

    // Configure analysis
    const config: VideoAnalysisConfig = {
      ...DEFAULT_VIDEO_ANALYSIS_CONFIG,
      frameRate: 10,
      batchSize: 5,
    };

    // Determine exercise type to use
    const exerciseToUse = overrideExercise || (selectedExercise === 'auto' ? (detectedExercise || 'unknown') : selectedExercise);

    // Setup cache entry
    let cacheId: string;
    let initialFrames: FramePoseData[] | undefined;

    if (resumeFrom) {
      cacheId = resumeFrom.id;
      initialFrames = resumeFrom.frames;
      framesRef.current = [...resumeFrom.frames];
    } else {
      try {
        const checksum = videoChecksum || await generateVideoChecksum(videoFile);
        const newCacheEntry = await createCacheEntry(
          generateAnalysisId(),
          videoMetadata,
          checksum,
          config,
          exerciseToUse
        );
        cacheId = newCacheEntry.id;
        framesRef.current = [];
      } catch (error) {
        console.error('Failed to create cache entry:', error);
        cacheId = generateAnalysisId();
        framesRef.current = [];
      }
    }

    setCurrentCacheId(cacheId);
    let framesSinceLastSave = 0;

    try {
      // Process video frames with pose detection and cache updates
      const analysisResult = await processVideoFrames(
        video,
        config,
        async (progress) => {
          setAnalysisProgress(progress);

          // Track frames for cache save
          if (progress.status === 'processing' && progress.currentFrame > framesRef.current.length) {
            framesSinceLastSave++;

            // Save to cache periodically
            if (framesSinceLastSave >= CACHE_SAVE_INTERVAL) {
              try {
                await updateCacheProgress(cacheId, framesRef.current, progress);
                framesSinceLastSave = 0;
              } catch (error) {
                console.error('Cache save failed:', error);
              }
            }
          }
        },
        abortControllerRef.current.signal,
        initialFrames
      );

      // Update frames ref with final result
      framesRef.current = analysisResult.frames;

      // Mark as completed in cache
      try {
        await completeCacheEntry(cacheId);
        const history = await getAllAnalysisSummaries();
        setAnalysisHistory(history);
      } catch (error) {
        console.error('Failed to complete cache entry:', error);
      }

      // Determine exercise type for rep analysis
      const exerciseType: VideoExerciseType = exerciseToUse === 'unknown' ? 'unknown' : exerciseToUse;

      // Run rep analysis
      const repAnalysisResult = analyzeVideoReps(analysisResult, {
        exerciseType: exerciseType === 'unknown' ? undefined : exerciseType,
      });

      // Store results in sessionStorage
      const videoUrl = URL.createObjectURL(videoFile);
      sessionStorage.setItem('videoAnalysisData', JSON.stringify({
        videoUrl,
        analysisResult,
        repAnalysisResult,
      }));
      sessionStorage.setItem('videoExerciseType', repAnalysisResult.exerciseType);

      setPageState('completed');

      // Navigate to results page after short delay
      setTimeout(() => {
        router.push('/video-analysis');
      }, 500);

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setPageState('ready');
        setAnalysisProgress(null);
      } else {
        setPageState('error');
        setErrorMessage(error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.');
      }
    } finally {
      URL.revokeObjectURL(video.src);
      setCurrentCacheId(null);
    }
  }, [videoFile, videoMetadata, pageState, selectedExercise, detectedExercise, videoChecksum, router, handleRunDetection]);

  // History handlers
  const handleHistorySelect = useCallback(async (id: string) => {
    try {
      const entry = await getCacheEntry(id);
      if (!entry) return;

      if (entry.status === 'completed') {
        // For completed entries, we could navigate to results if we stored them
        // For now, just show info
        console.log('Selected completed analysis:', entry);
      } else {
        // For incomplete entries, offer to resume
        setResumableAnalysis(entry);
        setShowResumeModal(true);
      }
    } catch (error) {
      console.error('Failed to get cache entry:', error);
    }
  }, []);

  const handleHistoryDelete = useCallback(async (id: string) => {
    try {
      await deleteCacheEntry(id);
      const history = await getAllAnalysisSummaries();
      setAnalysisHistory(history);
    } catch (error) {
      console.error('Failed to delete cache entry:', error);
    }
  }, []);

  // Handle recording completion
  const handleRecordingComplete = useCallback((file: File, metadata: VideoMetadata) => {
    handleVideoReady(file, metadata);
    setInputMode('upload'); // Switch back to upload view to show the ready state
  }, [handleVideoReady]);

  // Handle recording cancel
  const handleRecordingCancel = useCallback(() => {
    setInputMode('upload');
  }, []);

  return (
    <div
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: ANALYSIS_COLORS.backgroundSolid }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ color: ANALYSIS_COLORS.textPrimary }}
          >
            운동 영상 분석
          </h1>
          <p style={{ color: ANALYSIS_COLORS.textSecondary }}>
            운동 영상을 업로드하여 자세를 분석하세요
          </p>
        </div>

        {/* Tabs - Only show when in upload/ready state */}
        {(pageState === 'upload' || pageState === 'ready') && (
          <VideoUploadTabs
            activeTab={inputMode}
            onTabChange={setInputMode}
            className="mb-6"
          />
        )}

        {/* Main Content Card */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            backgroundColor: ANALYSIS_COLORS.surface,
            border: `1px solid ${ANALYSIS_COLORS.border}`,
          }}
        >
          {/* Conditional content based on pageState */}
          {(pageState === 'upload' || pageState === 'ready') && inputMode === 'upload' && (
            <>
              {/* Video Uploader */}
              <VideoUploader
                onVideoReady={handleVideoReady}
                onVideoRemoved={handleVideoRemoved}
                onError={handleUploadError}
                className="mb-6"
              />

              {/* Exercise Selector (show when video ready) */}
              {pageState === 'ready' && (
                <div className="mb-6">
                  <label
                    className="block mb-3 font-medium"
                    style={{ color: ANALYSIS_COLORS.textPrimary }}
                  >
                    운동 유형 선택
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {EXERCISE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedExercise(option.value)}
                        className="py-3 px-4 rounded-xl text-sm font-medium transition-all"
                        style={{
                          backgroundColor: selectedExercise === option.value
                            ? 'rgba(0, 245, 160, 0.15)'
                            : ANALYSIS_COLORS.surfaceElevated,
                          border: `1px solid ${
                            selectedExercise === option.value
                              ? ANALYSIS_COLORS.primary
                              : ANALYSIS_COLORS.border
                          }`,
                          color: selectedExercise === option.value
                            ? ANALYSIS_COLORS.primary
                            : ANALYSIS_COLORS.textSecondary,
                        }}
                      >
                        {option.labelKo}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Analysis Button */}
              {pageState === 'ready' && (
                <button
                  onClick={() => handleStartAnalysis()}
                  className="w-full py-4 rounded-xl font-semibold text-lg transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${ANALYSIS_COLORS.primary}, ${ANALYSIS_COLORS.secondary})`,
                    color: ANALYSIS_COLORS.backgroundSolid,
                    boxShadow: `0 4px 20px ${ANALYSIS_COLORS.primaryGlow}`,
                  }}
                >
                  {selectedExercise === 'auto' ? '운동 감지 시작' : '분석 시작'}
                </button>
              )}
            </>
          )}

          {/* Video Recorder - Show when record tab is active */}
          {(pageState === 'upload' || pageState === 'ready') && inputMode === 'record' && (
            <VideoRecorder
              onRecordingComplete={handleRecordingComplete}
              onCancel={handleRecordingCancel}
              maxDurationSeconds={300}
              showPoseOverlay={true}
            />
          )}

          {/* Detection state UI */}
          {(pageState === 'detecting' || pageState === 'detected') && (
            <ExerciseDetectionContainer
              state={detectionState}
              onConfirm={handleConfirmDetection}
              onChangeExercise={handleChangeExercise}
              onRetry={handleRetryDetection}
            />
          )}

          {pageState === 'analyzing' && analysisProgress && (
            <VideoAnalysisProgressCard
              progress={analysisProgress}
              onCancel={handleCancelAnalysis}
            />
          )}

          {pageState === 'completed' && (
            <div className="text-center py-8">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: ANALYSIS_COLORS.statusSuccessBg }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: ANALYSIS_COLORS.statusSuccess }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: ANALYSIS_COLORS.textPrimary }}
              >
                분석 완료!
              </h2>
              <p style={{ color: ANALYSIS_COLORS.textSecondary }}>
                결과 페이지로 이동 중...
              </p>
            </div>
          )}

          {pageState === 'error' && (
            <div className="text-center py-8">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: ANALYSIS_COLORS.statusErrorBg }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: ANALYSIS_COLORS.statusError }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: ANALYSIS_COLORS.statusError }}
              >
                분석 실패
              </h2>
              <p
                className="mb-4"
                style={{ color: ANALYSIS_COLORS.textSecondary }}
              >
                {errorMessage}
              </p>
              <button
                onClick={() => {
                  setPageState('ready');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: ANALYSIS_COLORS.surfaceElevated,
                  color: ANALYSIS_COLORS.textPrimary,
                  border: `1px solid ${ANALYSIS_COLORS.border}`,
                }}
              >
                다시 시도
              </button>
            </div>
          )}
        </div>

        {/* Analysis History Section */}
        {analysisHistory.length > 0 && (pageState === 'upload' || pageState === 'ready') && (
          <div
            className="rounded-2xl p-6 sm:p-8 mt-6"
            style={{
              backgroundColor: ANALYSIS_COLORS.surface,
              border: `1px solid ${ANALYSIS_COLORS.border}`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: ANALYSIS_COLORS.textPrimary }}
              >
                분석 기록
              </h2>
              <button
                onClick={() => setShowCacheDialog(true)}
                className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: ANALYSIS_COLORS.surfaceElevated,
                  color: ANALYSIS_COLORS.textSecondary,
                }}
              >
                캐시 관리
              </button>
            </div>
            <AnalysisHistoryList
              analyses={analysisHistory}
              onSelect={handleHistorySelect}
              onDelete={handleHistoryDelete}
            />
          </div>
        )}
      </div>

      {/* Resume Analysis Modal */}
      {resumableAnalysis && (
        <ResumeAnalysisModal
          isOpen={showResumeModal}
          cacheEntry={resumableAnalysis}
          onResume={() => {
            setShowResumeModal(false);
            handleStartAnalysis(resumableAnalysis);
          }}
          onStartNew={() => {
            setShowResumeModal(false);
            setResumableAnalysis(null);
          }}
          onClose={() => setShowResumeModal(false)}
        />
      )}

      {/* Cache Management Dialog */}
      <CacheManagementDialog
        isOpen={showCacheDialog}
        onClose={() => setShowCacheDialog(false)}
        onCacheCleared={async () => {
          const history = await getAllAnalysisSummaries();
          setAnalysisHistory(history);
        }}
      />
    </div>
  );
}
