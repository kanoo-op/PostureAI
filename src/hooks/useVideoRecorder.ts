import { useState, useRef, useCallback, useEffect } from 'react';
import type { RecordingState } from '@/types/video';
import { RECORDING_CONFIG } from '@/components/VideoAnalysis/constants';

export interface UseVideoRecorderOptions {
  maxDurationMs?: number;
  videoBitsPerSecond?: number;
  preferredResolution?: { width: number; height: number };
  onDurationWarning?: (secondsRemaining: number) => void;
}

export interface UseVideoRecorderReturn {
  state: RecordingState;
  stream: MediaStream | null;
  recordedBlob: Blob | null;
  duration: number;
  error: string | null;
  startCamera: () => Promise<void>;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  reset: () => void;
  cleanup: () => void;
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

export function useVideoRecorder(options: UseVideoRecorderOptions = {}): UseVideoRecorderReturn {
  const {
    maxDurationMs = RECORDING_CONFIG.defaultMaxDurationMs,
    videoBitsPerSecond = RECORDING_CONFIG.videoBitsPerSecond,
    preferredResolution = RECORDING_CONFIG.preferredResolution,
    onDurationWarning,
  } = options;

  const [state, setState] = useState<RecordingState>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningFiredRef = useRef<Set<number>>(new Set());

  const clearDurationInterval = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearDurationInterval();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);

    chunksRef.current = [];
    startTimeRef.current = 0;
    pausedDurationRef.current = 0;
    warningFiredRef.current = new Set();
  }, [stream, clearDurationInterval]);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setRecordedBlob(null);
    setDuration(0);
    setError(null);
  }, [cleanup]);

  const startCamera = useCallback(async () => {
    try {
      setState('initializing');
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: preferredResolution.width },
          height: { ideal: preferredResolution.height },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);
      setState('idle');
    } catch (err) {
      const error = err as Error;
      let message = '카메라를 시작할 수 없습니다';

      if (error.name === 'NotAllowedError') {
        message = '카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.';
      } else if (error.name === 'NotFoundError') {
        message = '카메라를 찾을 수 없습니다.';
      } else if (error.name === 'NotReadableError') {
        message = '카메라가 다른 프로그램에서 사용 중입니다.';
      }

      setState('error');
      setError(message);
      throw new Error(message);
    }
  }, [preferredResolution]);

  const startRecording = useCallback(() => {
    if (!stream || state !== 'idle') return;

    try {
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond,
      });

      chunksRef.current = [];
      warningFiredRef.current = new Set();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setState('stopped');
        clearDurationInterval();
      };

      recorder.onerror = () => {
        setState('error');
        setError('녹화 중 오류가 발생했습니다.');
        clearDurationInterval();
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      recorder.start(1000);
      setState('recording');

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current + pausedDurationRef.current;
        setDuration(elapsed);

        // Check for warnings
        const remainingSeconds = Math.ceil((maxDurationMs - elapsed) / 1000);
        RECORDING_CONFIG.warningThresholds.forEach(threshold => {
          if (remainingSeconds === threshold && !warningFiredRef.current.has(threshold)) {
            warningFiredRef.current.add(threshold);
            onDurationWarning?.(threshold);
          }
        });

        // Auto-stop at max duration
        if (elapsed >= maxDurationMs) {
          mediaRecorderRef.current?.stop();
        }
      }, 100);
    } catch (err) {
      setState('error');
      setError('녹화를 시작할 수 없습니다. 이 브라우저는 영상 녹화를 지원하지 않습니다.');
    }
  }, [stream, state, videoBitsPerSecond, maxDurationMs, onDurationWarning, clearDurationInterval]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      pausedDurationRef.current += Date.now() - startTimeRef.current;
      setState('paused');
      clearDurationInterval();
    }
  }, [state, clearDurationInterval]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      setState('recording');

      // Resume duration tracking
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current + pausedDurationRef.current;
        setDuration(elapsed);

        const remainingSeconds = Math.ceil((maxDurationMs - elapsed) / 1000);
        RECORDING_CONFIG.warningThresholds.forEach(threshold => {
          if (remainingSeconds === threshold && !warningFiredRef.current.has(threshold)) {
            warningFiredRef.current.add(threshold);
            onDurationWarning?.(threshold);
          }
        });

        if (elapsed >= maxDurationMs) {
          mediaRecorderRef.current?.stop();
        }
      }, 100);
    }
  }, [state, maxDurationMs, onDurationWarning]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (state === 'recording' || state === 'paused')) {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
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
  };
}

export default useVideoRecorder;
