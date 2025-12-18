'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ANALYSIS_COLORS, RECORDING_CONFIG } from './constants';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import CameraPreview from './CameraPreview';
import PoseOverlayCanvas from './PoseOverlayCanvas';
import RecordingControls from './RecordingControls';
import RecordingIndicator from './RecordingIndicator';
import TimerDisplay from './TimerDisplay';
import DurationLimitBanner from './DurationLimitBanner';
import RecordingPreview from './RecordingPreview';
import CameraPermissionPrompt from './CameraPermissionPrompt';
import CameraErrorState from './CameraErrorState';
import type { VideoMetadata, CameraError } from '@/types/video';

interface VideoRecorderProps {
  onRecordingComplete: (file: File, metadata: VideoMetadata) => void;
  onCancel?: () => void;
  maxDurationSeconds?: number;
  showPoseOverlay?: boolean;
  className?: string;
}

type RecorderView = 'permission' | 'camera' | 'preview' | 'error';

function mapErrorToCameraError(errorMessage: string | null): CameraError {
  if (!errorMessage) return 'unknown';
  if (errorMessage.includes('권한이 거부')) return 'denied';
  if (errorMessage.includes('다른 프로그램')) return 'in_use';
  if (errorMessage.includes('지원하지 않습니다')) return 'not_supported';
  if (errorMessage.includes('저장 공간')) return 'quota_exceeded';
  return 'unknown';
}

export default function VideoRecorder({
  onRecordingComplete,
  onCancel,
  maxDurationSeconds = 300,
  showPoseOverlay = true,
  className = '',
}: VideoRecorderProps) {
  const maxDurationMs = maxDurationSeconds * 1000;
  const [view, setView] = useState<RecorderView>('permission');
  const [isInitializing, setIsInitializing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    state,
    stream,
    recordedBlob,
    duration,
    error,
    startCamera,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    reset,
    cleanup,
  } = useVideoRecorder({
    maxDurationMs,
    onDurationWarning: (seconds) => {
      console.log(`Recording ending in ${seconds} seconds`);
    },
  });

  // Get video element from stream
  useEffect(() => {
    if (stream) {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(console.error);
      videoRef.current = video;
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      videoRef.current = null;
    }
  }, [stream]);

  // Update view based on state
  useEffect(() => {
    if (state === 'error') {
      setView('error');
    } else if (state === 'stopped' && recordedBlob) {
      setView('preview');
    } else if (stream) {
      setView('camera');
    }
  }, [state, stream, recordedBlob]);

  const handleRequestPermission = useCallback(async () => {
    setIsInitializing(true);
    try {
      await startCamera();
      setView('camera');
    } catch {
      setView('error');
    } finally {
      setIsInitializing(false);
    }
  }, [startCamera]);

  const handleRetry = useCallback(() => {
    reset();
    setView('permission');
  }, [reset]);

  const handleCancel = useCallback(() => {
    cleanup();
    onCancel?.();
  }, [cleanup, onCancel]);

  const handleConfirmRecording = useCallback(() => {
    if (!recordedBlob) return;

    const file = new File([recordedBlob], 'recorded-exercise.webm', {
      type: recordedBlob.type || 'video/webm',
    });

    const metadata: VideoMetadata = {
      duration: duration / 1000,
      width: RECORDING_CONFIG.preferredResolution.width,
      height: RECORDING_CONFIG.preferredResolution.height,
      frameRate: 30,
      fileSize: recordedBlob.size,
      mimeType: recordedBlob.type || 'video/webm',
      fileName: 'recorded-exercise.webm',
      lastModified: Date.now(),
    };

    cleanup();
    onRecordingComplete(file, metadata);
  }, [recordedBlob, duration, cleanup, onRecordingComplete]);

  const handleRetake = useCallback(async () => {
    reset();
    setIsInitializing(true);
    try {
      await startCamera();
      setView('camera');
    } catch {
      setView('error');
    } finally {
      setIsInitializing(false);
    }
  }, [reset, startCamera]);

  const isRecording = state === 'recording';
  const isPaused = state === 'paused';

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Permission prompt */}
      {view === 'permission' && (
        <CameraPermissionPrompt
          onRequestPermission={handleRequestPermission}
          isLoading={isInitializing}
        />
      )}

      {/* Error state */}
      {view === 'error' && (
        <CameraErrorState
          error={mapErrorToCameraError(error)}
          onRetry={handleRetry}
        />
      )}

      {/* Camera view */}
      {view === 'camera' && (
        <>
          {/* Camera preview with overlay */}
          <div className="relative rounded-xl overflow-hidden mb-4">
            <CameraPreview
              stream={stream}
              isRecording={isRecording}
              mirrored={true}
            />

            {/* Pose overlay canvas */}
            {showPoseOverlay && (
              <PoseOverlayCanvas
                videoElement={videoRef.current}
                width={RECORDING_CONFIG.preferredResolution.width}
                height={RECORDING_CONFIG.preferredResolution.height}
                isActive={!isRecording && !isPaused}
                mirrored={true}
              />
            )}

            {/* Recording indicator */}
            <div className="absolute top-3 right-3">
              <RecordingIndicator isRecording={isRecording} />
            </div>

            {/* Duration limit banner */}
            <div className="absolute top-3 left-3 right-16">
              <DurationLimitBanner
                durationMs={duration}
                maxDurationMs={maxDurationMs}
                isRecording={isRecording}
              />
            </div>
          </div>

          {/* Timer display */}
          {(isRecording || isPaused) && (
            <div className="text-center mb-4">
              <TimerDisplay
                durationMs={duration}
                maxDurationMs={maxDurationMs}
                isRecording={isRecording}
              />
            </div>
          )}

          {/* Recording controls */}
          <RecordingControls
            state={state}
            onStart={startRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onStop={stopRecording}
            onCancel={handleCancel}
          />

          {/* Instructions */}
          {state === 'idle' && (
            <p
              className="text-center text-sm mt-4"
              style={{ color: ANALYSIS_COLORS.textSecondary }}
            >
              빨간 버튼을 눌러 녹화를 시작하세요
            </p>
          )}
        </>
      )}

      {/* Preview view */}
      {view === 'preview' && recordedBlob && (
        <RecordingPreview
          videoBlob={recordedBlob}
          onConfirm={handleConfirmRecording}
          onRetake={handleRetake}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
