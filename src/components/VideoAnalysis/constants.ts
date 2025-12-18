import type { VideoAnalysisConfig } from '@/types/video';

// Design tokens for video analysis components
export const VIDEO_COLORS = {
  // Primary colors
  primary: '#0284c7',
  primaryHover: '#0369a1',
  primaryLight: '#e0f2fe',
  primaryDark: '#075985',

  // Background colors
  background: '#FAFAFA',
  backgroundDark: '#0f172a',
  surface: '#FFFFFF',
  surfaceDark: '#1e293b',

  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Border colors
  border: '#e5e7eb',
  borderDark: '#334155',

  // Status colors
  success: '#00F5A0',
  successBg: 'rgba(0, 245, 160, 0.1)',
  warning: '#FFB800',
  warningBg: 'rgba(255, 184, 0, 0.1)',
  error: '#FF3D71',
  errorBg: 'rgba(255, 61, 113, 0.1)',

  // Dropzone colors
  dropzoneIdle: '#f8fafc',
  dropzoneActive: '#e0f2fe',
  dropzoneReject: '#fef2f2',

  // Progress colors
  progressTrack: '#e5e7eb',
  progressFill: '#0284c7',
} as const;

// Animation durations
export const ANIMATIONS = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
} as const;

// Playback rate options
export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

// Analysis-specific design tokens
export const ANALYSIS_COLORS = {
  // Primary colors
  primary: '#00F5A0',
  primaryGlow: 'rgba(0, 245, 160, 0.4)',
  secondary: '#00ddff',
  secondaryGlow: 'rgba(0, 221, 255, 0.4)',
  // Background colors
  background: 'rgba(17, 24, 39, 0.95)',
  backgroundSolid: '#111827',
  surface: 'rgba(31, 41, 55, 0.85)',
  surfaceElevated: 'rgba(55, 65, 81, 0.6)',
  // Text colors
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  // Border colors
  border: 'rgba(75, 85, 99, 0.3)',
  borderActive: 'rgba(75, 85, 99, 0.5)',
  // Progress colors
  progressTrack: 'rgba(55, 65, 81, 0.8)',
  progressFillStart: '#00F5A0',
  progressFillEnd: '#00ddff',
  // Status colors
  statusSuccess: '#00F5A0',
  statusSuccessBg: 'rgba(0, 245, 160, 0.1)',
  statusWarning: '#FFB800',
  statusWarningBg: 'rgba(255, 184, 0, 0.1)',
  statusError: '#FF3D71',
  statusErrorBg: 'rgba(255, 61, 113, 0.1)',
  statusProcessing: '#3B82F6',
  statusProcessingGlow: 'rgba(59, 130, 246, 0.4)',
  statusCancelled: '#6B7280',
  statusCancelledBg: 'rgba(107, 114, 128, 0.1)',
  // Cache and history tokens
  statusPaused: '#A855F7',
  statusPausedBg: 'rgba(168, 85, 247, 0.1)',
  historyItemBg: 'rgba(31, 41, 55, 0.6)',
  historyItemHover: 'rgba(55, 65, 81, 0.8)',
  cacheUsageTrack: 'rgba(55, 65, 81, 0.8)',
  cacheUsageFill: '#00F5A0',
  cacheUsageWarning: '#FFB800',
  cacheUsageDanger: '#FF3D71',
} as const;

// Detection-specific design tokens
export const DETECTION_COLORS = {
  // Confidence levels
  confidenceHigh: '#00F5A0',
  confidenceHighGlow: 'rgba(0, 245, 160, 0.4)',
  confidenceMedium: '#FFB800',
  confidenceMediumGlow: 'rgba(255, 184, 0, 0.4)',
  confidenceLow: '#FF3D71',
  confidenceLowGlow: 'rgba(255, 61, 113, 0.4)',

  // Exercise type colors
  exerciseSquat: '#00F5A0',
  exercisePushup: '#38bdf8',
  exerciseLunge: '#a78bfa',
  exerciseDeadlift: '#fb923c',
  exercisePlank: '#f472b6',

  // Detection UI specific
  detectionBorder: 'rgba(14, 165, 233, 0.5)',
  detectionSurface: 'rgba(31, 41, 55, 0.9)',
} as const;

// Default configuration for video analysis
export const DEFAULT_VIDEO_ANALYSIS_CONFIG: VideoAnalysisConfig = {
  frameRate: 10,
  batchSize: 5,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
} as const;

// Recording-specific design tokens
export const RECORDING_COLORS = {
  recording: '#FF3D71',
  recordingGlow: 'rgba(255, 61, 113, 0.5)',
  recordingPulse: 'rgba(255, 61, 113, 0.3)',
  countdownCritical: '#FF3D71',
  countdownWarning: '#FFB800',
  poseOverlay: 'rgba(0, 245, 160, 0.8)',
  poseJoint: '#00F5A0',
  poseBone: 'rgba(0, 221, 255, 0.9)',
  cameraPreviewBg: '#0f172a',
  controlBarBg: 'rgba(17, 24, 39, 0.95)',
} as const;

// Recording configuration
export const RECORDING_CONFIG = {
  defaultMaxDurationMs: 300000,     // 5 minutes
  warningThresholds: [30, 10],      // seconds
  videoBitsPerSecond: 2500000,      // 2.5 Mbps
  preferredResolution: { width: 1280, height: 720 },
  fallbackResolution: { width: 640, height: 480 },
  poseDetectionFps: 15,
} as const;
