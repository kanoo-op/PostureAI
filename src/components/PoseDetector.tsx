'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { Pose3D, PoseDetectorConfig } from '@/types/pose'
import { drawPose } from '@/utils/drawSkeleton'

interface PoseDetectorProps extends PoseDetectorConfig {
  width?: number
  height?: number
  onPoseDetected?: (pose: Pose3D | null) => void
  onFpsUpdate?: (fps: number) => void
  onError?: (error: string) => void
  onReady?: () => void
  className?: string
}

type Status = 'idle' | 'requesting-camera' | 'loading-model' | 'running' | 'error'

export default function PoseDetector({
  width = 640,
  height = 480,
  mirrored = true,
  showSkeleton = true,
  showKeypoints = true,
  minKeypointScore = 0.3,
  onPoseDetected,
  onFpsUpdate,
  onError,
  onReady,
  className = '',
}: PoseDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const detectorRef = useRef<any>(null)
  const animationRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fpsRef = useRef({ times: [] as number[], value: 0 })

  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const [currentPose, setCurrentPose] = useState<Pose3D | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (detectorRef.current) {
      detectorRef.current.dispose()
      detectorRef.current = null
    }
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      return true
    } catch (err) {
      const error = err as Error
      let message = '카메라를 시작할 수 없습니다'

      if (error.name === 'NotAllowedError') {
        message = '카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.'
      } else if (error.name === 'NotFoundError') {
        message = '카메라를 찾을 수 없습니다.'
      } else if (error.name === 'NotReadableError') {
        message = '카메라가 다른 프로그램에서 사용 중입니다.'
      }

      throw new Error(message)
    }
  }, [width, height])

  // Initialize pose detector
  const initializeDetector = useCallback(async () => {
    // Dynamic import for TensorFlow.js
    const tf = await import('@tensorflow/tfjs-core')
    await import('@tensorflow/tfjs-backend-webgl')
    await tf.setBackend('webgl')
    await tf.ready()

    const poseDetection = await import('@tensorflow-models/pose-detection')

    const detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.BlazePose,
      {
        runtime: 'tfjs',
        modelType: 'full',
        enableSmoothing: true,
      }
    )

    detectorRef.current = detector
    return detector
  }, [])

  // Detection loop
  const runDetection = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    const detector = detectorRef.current

    if (!video || !canvas || !overlayCanvas || !detector) {
      return
    }

    if (video.readyState < 2) {
      animationRef.current = requestAnimationFrame(runDetection)
      return
    }

    const ctx = canvas.getContext('2d')
    const overlayCtx = overlayCanvas.getContext('2d')

    if (!ctx || !overlayCtx) {
      return
    }

    // Calculate FPS
    const now = performance.now()
    fpsRef.current.times.push(now)
    while (fpsRef.current.times.length > 0 && fpsRef.current.times[0] <= now - 1000) {
      fpsRef.current.times.shift()
    }
    const currentFps = fpsRef.current.times.length
    if (currentFps !== fpsRef.current.value) {
      fpsRef.current.value = currentFps
      setFps(currentFps)
      onFpsUpdate?.(currentFps)
    }

    // Draw video frame (mirrored)
    ctx.save()
    if (mirrored) {
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, width, height)
    ctx.restore()

    // Detect pose
    try {
      const poses = await detector.estimatePoses(video, {
        flipHorizontal: false,
      })

      const pose = (poses[0] as Pose3D) || null
      setCurrentPose(pose)
      onPoseDetected?.(pose)

      // Draw skeleton overlay
      drawPose(overlayCtx, pose, {
        width,
        height,
        mirrored,
        showSkeleton,
        showKeypoints,
        minKeypointScore,
      })
    } catch (err) {
      console.error('Pose detection error:', err)
    }

    animationRef.current = requestAnimationFrame(runDetection)
  }, [width, height, mirrored, showSkeleton, showKeypoints, minKeypointScore, onPoseDetected, onFpsUpdate])

  // Start everything
  const start = useCallback(async () => {
    try {
      setErrorMessage(null)
      setStatus('requesting-camera')

      await startCamera()

      setStatus('loading-model')
      await initializeDetector()

      setStatus('running')
      onReady?.()

      // Start detection loop
      runDetection()
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      setErrorMessage(message)
      setStatus('error')
      onError?.(message)
      cleanup()
    }
  }, [startCamera, initializeDetector, runDetection, onReady, onError, cleanup])

  // Stop everything
  const stop = useCallback(() => {
    cleanup()
    setStatus('idle')
    setCurrentPose(null)
    setFps(0)
    fpsRef.current = { times: [], value: 0 }
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return '시작 버튼을 눌러주세요'
      case 'requesting-camera':
        return '카메라 권한 요청 중...'
      case 'loading-model':
        return 'AI 모델 로딩 중... (최초 실행 시 시간이 걸립니다)'
      case 'error':
        return errorMessage
      default:
        return null
    }
  }

  const statusText = getStatusText()
  const isLoading = status === 'requesting-camera' || status === 'loading-model'
  const isRunning = status === 'running'
  const hasError = status === 'error'

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${className}`}>
      {/* Video element (hidden, used as source) */}
      <video
        ref={videoRef}
        className="absolute opacity-0 pointer-events-none"
        width={width}
        height={height}
        playsInline
        muted
      />

      {/* Main canvas for video */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full"
      />

      {/* Overlay canvas for skeleton */}
      <canvas
        ref={overlayCanvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />

      {/* Status overlay */}
      {statusText && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center p-6 max-w-md">
            {isLoading && (
              <div className="mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto" />
              </div>
            )}
            {hasError && (
              <div className="mb-4">
                <svg
                  className="w-12 h-12 text-red-500 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            )}
            <p className={`text-sm ${hasError ? 'text-red-400' : 'text-white'}`}>
              {statusText}
            </p>
            {hasError && (
              <button
                onClick={() => setStatus('idle')}
                className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      )}

      {/* FPS counter */}
      {isRunning && (
        <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
          {fps} FPS
        </div>
      )}

      {/* Pose indicator */}
      {isRunning && (
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 px-2 py-1 rounded">
          <div
            className={`w-2 h-2 rounded-full ${
              currentPose ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <span className="text-white text-xs">
            {currentPose ? '감지됨' : '감지 중...'}
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {!isRunning && !isLoading ? (
          <button
            onClick={start}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-lg"
          >
            시작
          </button>
        ) : isRunning ? (
          <button
            onClick={stop}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-lg"
          >
            중지
          </button>
        ) : null}
      </div>
    </div>
  )
}
