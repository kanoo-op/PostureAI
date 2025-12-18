'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { PoseDetector } from '@tensorflow-models/pose-detection'
import type { Pose3D, PoseDetectionState, LoadingState } from '@/types/pose'

interface UsePoseDetectionOptions {
  modelComplexity?: 0 | 1 | 2
  smoothLandmarks?: boolean
  enableSegmentation?: boolean
  minDetectionConfidence?: number
  minTrackingConfidence?: number
}

export function usePoseDetection(options: UsePoseDetectionOptions = {}) {
  const {
    modelComplexity = 1,
    smoothLandmarks = true,
    enableSegmentation = false,
    minDetectionConfidence = 0.5,
    minTrackingConfidence = 0.5,
  } = options

  const detectorRef = useRef<PoseDetector | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const fpsCounterRef = useRef<number[]>([])

  const [state, setState] = useState<PoseDetectionState>({
    pose: null,
    fps: 0,
    loadingState: 'idle',
    error: null,
  })

  const setLoadingState = useCallback((loadingState: LoadingState) => {
    setState(prev => ({ ...prev, loadingState }))
  }, [])

  const initializeDetector = useCallback(async () => {
    try {
      setLoadingState('loading-model')

      // Dynamic imports for better code splitting
      const [tf, poseDetection] = await Promise.all([
        import('@tensorflow/tfjs-core'),
        import('@tensorflow-models/pose-detection'),
      ])

      // Import and set backend
      await import('@tensorflow/tfjs-backend-webgl')
      await tf.setBackend('webgl')
      await tf.ready()

      const model = poseDetection.SupportedModels.BlazePose
      const detectorConfig = {
        runtime: 'mediapipe' as const,
        modelType: (['lite', 'full', 'heavy'] as const)[modelComplexity],
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',
        enableSmoothing: smoothLandmarks,
        enableSegmentation,
      }

      const detector = await poseDetection.createDetector(model, detectorConfig)
      detectorRef.current = detector

      setLoadingState('ready')
      return detector
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '모델 로딩 실패'
      setState(prev => ({
        ...prev,
        loadingState: 'error',
        error: `포즈 감지 모델을 로드할 수 없습니다: ${errorMessage}`,
      }))
      return null
    }
  }, [modelComplexity, smoothLandmarks, enableSegmentation, setLoadingState])

  const detectPose = useCallback(async (
    video: HTMLVideoElement,
    onPoseDetected?: (pose: Pose3D | null) => void
  ) => {
    if (!detectorRef.current || !video || video.readyState < 2) {
      return
    }

    const now = performance.now()

    try {
      const poses = await detectorRef.current.estimatePoses(video, {
        flipHorizontal: false,
      })

      const pose = poses[0] as Pose3D | undefined

      // Calculate FPS
      if (lastTimeRef.current > 0) {
        const deltaTime = now - lastTimeRef.current
        const currentFps = 1000 / deltaTime

        fpsCounterRef.current.push(currentFps)
        if (fpsCounterRef.current.length > 30) {
          fpsCounterRef.current.shift()
        }

        const avgFps = Math.round(
          fpsCounterRef.current.reduce((a, b) => a + b, 0) / fpsCounterRef.current.length
        )

        setState(prev => ({
          ...prev,
          pose: pose || null,
          fps: avgFps,
        }))
      } else {
        setState(prev => ({
          ...prev,
          pose: pose || null,
        }))
      }

      lastTimeRef.current = now

      if (onPoseDetected) {
        onPoseDetected(pose || null)
      }
    } catch (error) {
      console.error('Pose detection error:', error)
    }
  }, [])

  const startDetection = useCallback((
    video: HTMLVideoElement,
    onPoseDetected?: (pose: Pose3D | null) => void
  ) => {
    const detect = async () => {
      await detectPose(video, onPoseDetected)
      animationFrameRef.current = requestAnimationFrame(detect)
    }

    detect()
  }, [detectPose])

  const stopDetection = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    fpsCounterRef.current = []
    lastTimeRef.current = 0

    setState(prev => ({
      ...prev,
      pose: null,
      fps: 0,
    }))
  }, [])

  const cleanup = useCallback(() => {
    stopDetection()

    if (detectorRef.current) {
      detectorRef.current.dispose()
      detectorRef.current = null
    }

    setState({
      pose: null,
      fps: 0,
      loadingState: 'idle',
      error: null,
    })
  }, [stopDetection])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    ...state,
    initializeDetector,
    startDetection,
    stopDetection,
    cleanup,
    isModelLoaded: detectorRef.current !== null,
  }
}
