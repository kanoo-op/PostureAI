/**
 * Audio Feedback System Type Definitions
 * Types for real-time 3D angle audio feedback
 */

// Verbosity levels for audio output
export type VerbosityLevel = 'minimal' | 'moderate' | 'detailed';

// Priority levels for audio queue management
export type AudioPriority = 'critical' | 'high' | 'medium' | 'low';

// Supported languages
export type AudioLanguage = 'ko' | 'en';

// Phase beep types
export type PhaseBeepType = 'descending' | 'bottom' | 'ascending' | 'success';

// Audio queue item structure
export interface AudioQueueItem {
  id: string;
  type: 'voice' | 'beep';
  priority: AudioPriority;
  content: string | PhaseBeepType;
  timestamp: number;
  feedbackLevel?: 'good' | 'warning' | 'error';
}

// Main configuration interface
export interface AudioFeedbackConfig {
  enabled: boolean;
  language: AudioLanguage;
  verbosity: VerbosityLevel;
  masterVolume: number;      // 0-1
  voiceVolume: number;       // 0-1
  beepVolume: number;        // 0-1
  voiceThrottleMs: number;   // Default 2000ms
  enablePhaseBeeps: boolean;
  enableVoiceCorrections: boolean;
}

// Audio system state
export interface AudioFeedbackState {
  isInitialized: boolean;
  isPlaying: boolean;
  isSpeaking: boolean;
  lastVoiceTime: number;
  queueLength: number;
  audioSupported: boolean;
  speechSupported: boolean;
}

// ============================================
// Video Voice Feedback Types
// ============================================

// Video-specific audio queue item with timestamp
export interface VideoAudioQueueItem extends AudioQueueItem {
  videoTimestamp: number;  // Video timestamp in ms when this should be spoken
  repNumber?: number;      // Associated rep number
  isRepSummary?: boolean;  // True for rep boundary summaries
}

// Video voice feedback configuration
export interface VideoVoiceFeedbackConfig extends AudioFeedbackConfig {
  autoPauseOnCritical: boolean;     // Pause video on critical issues
  syncVoiceToPlaybackRate: boolean; // Adjust speech rate with video speed
  minSpeechRate: number;            // 0.7 minimum
  maxSpeechRate: number;            // 1.5 maximum
  announcementLeadTime: number;     // Ms before timestamp to start speaking
  enableRepSummaries: boolean;      // Speak summaries at rep boundaries
}

// Video voice feedback state
export interface VideoVoiceFeedbackState extends AudioFeedbackState {
  currentVideoTime: number;
  queuedFeedbackCount: number;
  nextFeedbackTimestamp: number | null;
  isAutoPaused: boolean;
  currentRepBeingNarrated: number | null;
}
