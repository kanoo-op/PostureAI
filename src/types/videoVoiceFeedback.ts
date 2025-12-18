/**
 * Video Voice Feedback Type Definitions
 * Extended types for video-synchronized voice feedback
 */

import type { AudioPriority, AudioLanguage, AudioFeedbackConfig, AudioFeedbackState } from './audioFeedback';
import type { RepAnalysisResult, VideoRepAnalysisResult } from './video';

// Queue item for video-synchronized feedback
export interface VideoFeedbackQueueItem {
  id: string;
  type: 'correction' | 'rep_summary' | 'worst_moment' | 'critical_pause' | 'analysis_start' | 'analysis_end';
  priority: AudioPriority;  // critical > high > medium > low
  content: string;          // Message to speak
  timestamp: number;        // System timestamp when queued
  videoTimestamp: number;   // Video time in ms when this should be spoken
  repNumber?: number;       // Associated rep number (1-based)
  isRepSummary: boolean;    // True for rep boundary summaries
  feedbackLevel: 'good' | 'warning' | 'error' | 'info';
}

// Extended config for video voice feedback
export interface VideoVoiceFeedbackConfig extends AudioFeedbackConfig {
  autoPauseOnCritical: boolean;      // Pause video on critical issues (default: true)
  syncVoiceToPlaybackRate: boolean;  // Adjust speech rate with video speed (default: true)
  minSpeechRate: number;             // Minimum speech rate (default: 0.7)
  maxSpeechRate: number;             // Maximum speech rate (default: 1.5)
  lookaheadWindowMs: number;         // Pre-fetch window in ms (default: 500)
  enableRepSummaries: boolean;       // Speak summaries at rep boundaries (default: true)
  seekDebounceMs: number;            // Debounce delay for seek handling (default: 150)
}

// Extended state for video voice feedback
export interface VideoVoiceFeedbackState extends AudioFeedbackState {
  currentVideoTime: number;             // Current video time in ms
  queuedFeedbackCount: number;          // Number of items in queue
  nextFeedbackTimestamp: number | null; // Video timestamp of next feedback
  isAutoPaused: boolean;                // True if video auto-paused for critical issue
  currentRepBeingNarrated: number | null; // Rep number currently being narrated
  upcomingFeedback: VideoFeedbackQueueItem[]; // Next 3-5 items for preview
}

// Auto-pause callback parameters
export interface AutoPauseCallback {
  isPaused: boolean;
  issueDescription: string;
  feedbackItem: VideoFeedbackQueueItem;
}

// Hook return type
export interface UseVideoVoiceFeedbackReturn {
  state: VideoVoiceFeedbackState;
  config: VideoVoiceFeedbackConfig;
  controls: {
    initialize: () => Promise<boolean>;
    loadAnalysis: (analysis: VideoRepAnalysisResult) => void;
    syncToVideo: (videoElement: HTMLVideoElement) => void;
    detachFromVideo: () => void;
    play: () => void;
    pause: () => void;
    seekTo: (timeMs: number) => void;
    setPlaybackRate: (rate: number) => void;
    skipCurrentFeedback: () => void;
    resumeFromAutoPause: () => void;
  };
  updateConfig: (config: Partial<VideoVoiceFeedbackConfig>) => void;
  upcomingPreview: VideoFeedbackQueueItem[];
}

// Timeline marker for overlay display
export interface TimelineMarker {
  timestamp: number;
  priority: AudioPriority;
  type: VideoFeedbackQueueItem['type'];
  repNumber?: number;
}

// localStorage key
export const VIDEO_VOICE_CONFIG_KEY = 'video-voice-feedback-config';
