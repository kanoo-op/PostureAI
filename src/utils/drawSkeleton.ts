import type { Keypoint } from '@tensorflow-models/pose-detection'
import type { Pose3D, PoseDetectorConfig } from '@/types/pose'
import { SKELETON_CONNECTIONS } from '@/types/pose'

interface DrawOptions extends PoseDetectorConfig {
  width: number
  height: number
  keypointColor?: string
  skeletonColor?: string
  keypointRadius?: number
  lineWidth?: number
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  pose: Pose3D | null,
  options: DrawOptions
): void {
  const {
    width,
    height,
    mirrored = true,
    showSkeleton = true,
    showKeypoints = true,
    minKeypointScore = 0.3,
    keypointColor = '#00ff00',
    skeletonColor = '#ffffff',
    keypointRadius = 5,
    lineWidth = 2,
  } = options

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  if (!pose || !pose.keypoints) {
    return
  }

  // Apply mirroring transform
  ctx.save()
  if (mirrored) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }

  const keypoints = pose.keypoints

  // Draw skeleton connections
  if (showSkeleton) {
    ctx.strokeStyle = skeletonColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const startPoint = keypoints[startIdx]
      const endPoint = keypoints[endIdx]

      if (
        startPoint &&
        endPoint &&
        (startPoint.score ?? 0) >= minKeypointScore &&
        (endPoint.score ?? 0) >= minKeypointScore
      ) {
        drawSegment(ctx, startPoint, endPoint, skeletonColor, lineWidth)
      }
    }
  }

  // Draw keypoints
  if (showKeypoints) {
    for (const keypoint of keypoints) {
      if ((keypoint.score ?? 0) >= minKeypointScore) {
        drawKeypoint(ctx, keypoint, keypointColor, keypointRadius)
      }
    }
  }

  ctx.restore()
}

function drawKeypoint(
  ctx: CanvasRenderingContext2D,
  keypoint: Keypoint,
  color: string,
  radius: number
): void {
  const { x, y, score } = keypoint

  // Vary opacity based on confidence
  const opacity = Math.max(0.3, score ?? 0.5)

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.fillStyle = hexToRgba(color, opacity)
  ctx.fill()

  // Draw border
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  start: Keypoint,
  end: Keypoint,
  color: string,
  lineWidth: number
): void {
  // Calculate opacity based on average confidence
  const avgScore = ((start.score ?? 0) + (end.score ?? 0)) / 2
  const opacity = Math.max(0.3, avgScore)

  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.strokeStyle = hexToRgba(color, opacity)
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

function hexToRgba(hex: string, alpha: number): string {
  // Remove # if present
  hex = hex.replace('#', '')

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Draw video frame to canvas with optional mirroring
export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  mirrored: boolean = true
): void {
  ctx.save()

  if (mirrored) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }

  ctx.drawImage(video, 0, 0, width, height)
  ctx.restore()
}

// Get 3D keypoints for advanced pose analysis
export function get3DKeypoints(pose: Pose3D): Map<string, { x: number; y: number; z: number; score: number }> {
  const keypoints3D = new Map()

  if (!pose.keypoints3D) {
    return keypoints3D
  }

  const keypointNames = [
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
    'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
    'left_index', 'right_index', 'left_thumb', 'right_thumb',
    'left_hip', 'right_hip', 'left_knee', 'right_knee',
    'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
    'left_foot_index', 'right_foot_index',
  ]

  pose.keypoints3D.forEach((kp, index) => {
    if (keypointNames[index]) {
      keypoints3D.set(keypointNames[index], {
        x: kp.x,
        y: kp.y,
        z: kp.z ?? 0,
        score: kp.score ?? 0,
      })
    }
  })

  return keypoints3D
}
