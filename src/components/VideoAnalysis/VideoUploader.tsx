'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { VIDEO_COLORS, ANIMATIONS } from './constants';
import LoadingSpinner from './LoadingSpinner';
import ValidationFeedback from './ValidationFeedback';
import VideoPreviewCard from './VideoPreviewCard';
import UploadProgressBar from './UploadProgressBar';
import VideoErrorBoundary from './VideoErrorBoundary';
import {
  validateVideo,
  DEFAULT_VALIDATION_CONFIG,
} from '@/utils/videoProcessingUtils';
import type {
  UploadState,
  VideoValidationConfig,
  VideoMetadata,
} from '@/types/video';

interface VideoUploaderProps {
  onVideoReady?: (file: File, metadata: VideoMetadata) => void;
  onVideoRemoved?: () => void;
  onError?: (error: string) => void;
  validationConfig?: Partial<VideoValidationConfig>;
  className?: string;
}

export default function VideoUploader({
  onVideoReady,
  onVideoRemoved,
  onError,
  validationConfig,
  className = '',
}: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    file: null,
    metadata: null,
    validationResult: null,
    errorMessage: null,
  });

  const config = useMemo(
    () => ({ ...DEFAULT_VALIDATION_CONFIG, ...validationConfig }),
    [validationConfig]
  );

  const processFile = useCallback(async (file: File) => {
    setState({
      status: 'validating',
      file,
      metadata: null,
      validationResult: null,
      errorMessage: null,
    });

    try {
      const result = await validateVideo(file, config);

      if (result.isValid && result.metadata) {
        setState({
          status: 'ready',
          file,
          metadata: result.metadata,
          validationResult: result,
          errorMessage: null,
        });
        onVideoReady?.(file, result.metadata);
      } else {
        const errorMsg = result.errors[0]?.message || '알 수 없는 오류가 발생했습니다.';
        setState({
          status: 'error',
          file,
          metadata: result.metadata,
          validationResult: result,
          errorMessage: errorMsg,
        });
        onError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.';
      setState({
        status: 'error',
        file,
        metadata: null,
        validationResult: null,
        errorMessage: errorMsg,
      });
      onError?.(errorMsg);
    }
  }, [config, onVideoReady, onError]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemove = useCallback(() => {
    setState({
      status: 'idle',
      file: null,
      metadata: null,
      validationResult: null,
      errorMessage: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onVideoRemoved?.();
  }, [onVideoRemoved]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  const getDropzoneStyles = (): { backgroundColor: string; borderColor: string } => {
    let bgColor: string = VIDEO_COLORS.dropzoneIdle;
    let borderColor: string = VIDEO_COLORS.border;

    if (isDragging) {
      bgColor = VIDEO_COLORS.dropzoneActive;
      borderColor = VIDEO_COLORS.primary;
    } else if (state.status === 'error') {
      bgColor = VIDEO_COLORS.dropzoneReject;
      borderColor = VIDEO_COLORS.error;
    }

    return { backgroundColor: bgColor, borderColor };
  };

  // Show preview card when video is ready
  if (state.status === 'ready' && state.file && state.metadata) {
    return (
      <VideoErrorBoundary>
        <VideoPreviewCard
          file={state.file}
          metadata={state.metadata}
          onRemove={handleRemove}
          className={className}
        />
        {state.validationResult && state.validationResult.warnings.length > 0 && (
          <ValidationFeedback result={state.validationResult} className="mt-4" />
        )}
      </VideoErrorBoundary>
    );
  }

  return (
    <VideoErrorBoundary>
      <div className={className}>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label="동영상 파일 선택"
          className={`
            border-2 border-dashed rounded-2xl p-8 cursor-pointer
            transition-all focus:outline-none focus:ring-2 focus:ring-offset-2
            min-h-[280px] flex flex-col items-center justify-center
          `}
          style={{
            ...getDropzoneStyles(),
            transitionDuration: ANIMATIONS.normal,
          }}
        >
          {state.status === 'validating' ? (
            <div className="text-center">
              <LoadingSpinner size="lg" className="mb-4" />
              <UploadProgressBar status="영상 검증 중..." />
            </div>
          ) : (
            <>
              {/* Upload icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: VIDEO_COLORS.primaryLight }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: VIDEO_COLORS.primary }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>

              {/* Instructions */}
              <p
                className="font-medium mb-2"
                style={{ color: VIDEO_COLORS.textPrimary }}
              >
                {isDragging ? '여기에 놓으세요' : '운동 영상을 업로드하세요'}
              </p>
              <p
                className="text-sm mb-4"
                style={{ color: VIDEO_COLORS.textSecondary }}
              >
                드래그하거나 클릭하여 파일 선택
              </p>

              {/* File requirements */}
              <div
                className="text-xs space-y-1"
                style={{ color: VIDEO_COLORS.textMuted }}
              >
                <p>지원 형식: MP4, WebM</p>
                <p>최대 크기: {config.maxFileSizeMB}MB</p>
                <p>영상 길이: {config.minDurationSeconds}초 ~ {Math.floor(config.maxDurationSeconds / 60)}분</p>
              </div>
            </>
          )}
        </div>

        {/* Error feedback */}
        {state.status === 'error' && state.validationResult && (
          <div className="mt-4 space-y-4">
            <ValidationFeedback result={state.validationResult} />
            <button
              onClick={handleRemove}
              className="w-full py-2.5 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: VIDEO_COLORS.dropzoneIdle,
                color: VIDEO_COLORS.textSecondary,
              }}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </VideoErrorBoundary>
  );
}
