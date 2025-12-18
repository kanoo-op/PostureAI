'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { Pose3D } from '@/types/pose'
import { SKELETON_CONNECTIONS } from '@/types/pose'

export interface CanvasInfo {
  width: number
  height: number
  scaleX: number
  scaleY: number
}

interface ImagePoseAnalyzerProps {
  onPoseDetected?: (pose: Pose3D | null) => void
  onCanvasSizeChange?: (info: CanvasInfo) => void
  onError?: (error: string) => void
  showBuiltInSkeleton?: boolean
  className?: string
}

type Status = 'idle' | 'loading-model' | 'analyzing' | 'complete' | 'error'

export default function ImagePoseAnalyzer({
  onPoseDetected,
  onCanvasSizeChange,
  onError,
  showBuiltInSkeleton = true,
  className = '',
}: ImagePoseAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const detectorRef = useRef<any>(null)

  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [pose, setPose] = useState<Pose3D | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 480 })

  // Initialize detector
  const initializeDetector = useCallback(async () => {
    if (detectorRef.current) return detectorRef.current

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
        enableSmoothing: false,
      }
    )

    detectorRef.current = detector
    return detector
  }, [])

  // Draw image on canvas
  const drawImageOnCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate display size (fit within max dimensions while maintaining aspect ratio)
    const maxWidth = 640
    const maxHeight = 560

    let displayWidth = img.naturalWidth
    let displayHeight = img.naturalHeight

    // Scale down if needed
    if (displayWidth > maxWidth) {
      const ratio = maxWidth / displayWidth
      displayWidth = maxWidth
      displayHeight = displayHeight * ratio
    }

    if (displayHeight > maxHeight) {
      const ratio = maxHeight / displayHeight
      displayHeight = displayHeight * ratio
      displayWidth = displayWidth * ratio
    }

    // Calculate scale factors
    const scaleX = displayWidth / img.naturalWidth
    const scaleY = displayHeight / img.naturalHeight

    // Update canvas size
    canvas.width = displayWidth
    canvas.height = displayHeight
    setCanvasSize({ width: displayWidth, height: displayHeight })
    onCanvasSizeChange?.({ width: displayWidth, height: displayHeight, scaleX, scaleY })

    // Clear and draw image
    ctx.clearRect(0, 0, displayWidth, displayHeight)
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight)
  }, [onCanvasSizeChange])

  // Draw skeleton on canvas
  const drawSkeleton = useCallback((detectedPose: Pose3D, img: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate scale factors
    const scaleX = canvas.width / img.naturalWidth
    const scaleY = canvas.height / img.naturalHeight

    const minScore = 0.3

    // Draw connections
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const startPoint = detectedPose.keypoints[startIdx]
      const endPoint = detectedPose.keypoints[endIdx]

      if (
        startPoint &&
        endPoint &&
        (startPoint.score ?? 0) >= minScore &&
        (endPoint.score ?? 0) >= minScore
      ) {
        ctx.beginPath()
        ctx.moveTo(startPoint.x * scaleX, startPoint.y * scaleY)
        ctx.lineTo(endPoint.x * scaleX, endPoint.y * scaleY)
        ctx.stroke()
      }
    }

    // Draw keypoints
    for (const keypoint of detectedPose.keypoints) {
      if ((keypoint.score ?? 0) >= minScore) {
        const x = keypoint.x * scaleX
        const y = keypoint.y * scaleY

        // Outer circle
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, 2 * Math.PI)
        ctx.fillStyle = '#00ff00'
        ctx.fill()

        // Inner circle
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      }
    }
  }, [])

  // Analyze image
  const analyzeImage = useCallback(async () => {
    const img = imageRef.current
    if (!img) return

    try {
      setStatus('loading-model')
      // 분석 시작 시 이전 pose 초기화 (외부 스켈레톤 오버레이 숨김)
      setPose(null)
      onPoseDetected?.(null)

      const detector = await initializeDetector()

      setStatus('analyzing')

      // Estimate poses from the original image element
      const poses = await detector.estimatePoses(img, {
        flipHorizontal: false,
      })

      const detectedPose = (poses[0] as Pose3D) || null
      setPose(detectedPose)

      // Redraw image and skeleton
      drawImageOnCanvas(img)

      if (detectedPose && showBuiltInSkeleton) {
        drawSkeleton(detectedPose, img)
      }

      onPoseDetected?.(detectedPose)
      setStatus('complete')
    } catch (err) {
      console.error('Analysis error:', err)
      const message = err instanceof Error ? err.message : '분석 중 오류 발생'
      setErrorMessage(message)
      setStatus('error')
      onError?.(message)
    }
  }, [initializeDetector, drawImageOnCanvas, drawSkeleton, onPoseDetected, onError])

  // Handle file upload
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMessage('이미지 파일만 업로드 가능합니다')
      setStatus('error')
      return
    }

    // Reset state
    setPose(null)
    setStatus('idle')
    setErrorMessage(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      setUploadedImage(imageUrl)

      // Create image element and wait for load
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        imageRef.current = img
        drawImageOnCanvas(img)
      }

      img.onerror = () => {
        setErrorMessage('이미지를 불러올 수 없습니다')
        setStatus('error')
      }

      img.src = imageUrl
    }

    reader.onerror = () => {
      setErrorMessage('파일을 읽을 수 없습니다')
      setStatus('error')
    }

    reader.readAsDataURL(file)
  }, [drawImageOnCanvas])

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      fileInputRef.current.files = dataTransfer.files
      handleFileChange({ target: { files: dataTransfer.files } } as any)
    }
  }, [handleFileChange])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
  }, [])

  // Reset
  const handleReset = useCallback(() => {
    setUploadedImage(null)
    setPose(null)
    setStatus('idle')
    setErrorMessage(null)
    imageRef.current = null

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }, [])

  const isLoading = status === 'loading-model' || status === 'analyzing'

  return (
    <div className={`${className}`}>
      {/* Upload area */}
      {!uploadedImage ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer bg-gray-50 dark:bg-slate-800/50 min-h-[300px] flex flex-col items-center justify-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            이미지를 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-sm text-gray-400">
            전신이 보이는 정면 또는 측면 사진을 권장합니다
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Canvas container */}
          <div
            className="relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center"
            style={{ minHeight: Math.max(300, canvasSize.height) }}
          >
            <canvas
              ref={canvasRef}
              className="max-w-full rounded-lg"
              style={{
                display: 'block',
                maxHeight: '560px',
              }}
            />

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
                  <p className="text-white text-sm">
                    {status === 'loading-model' ? 'AI 모델 로딩 중...' : '자세 분석 중...'}
                  </p>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {status === 'error' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center p-4">
                  <svg
                    className="w-12 h-12 text-red-500 mx-auto mb-2"
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
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Detection status badge */}
            {status === 'complete' && (
              <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded">
                <div className={`w-2 h-2 rounded-full ${pose ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-white text-xs">
                  {pose ? `${pose.keypoints.filter(k => (k.score ?? 0) > 0.3).length}개 포인트 감지` : '자세를 찾을 수 없음'}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            >
              다른 이미지
            </button>
            <button
              onClick={analyzeImage}
              disabled={isLoading || !imageRef.current}
              className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '분석 중...' : status === 'complete' ? '다시 분석' : '분석하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
