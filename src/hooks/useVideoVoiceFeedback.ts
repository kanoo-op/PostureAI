/**
 * useVideoVoiceFeedback Hook
 * React hook for voice-guided feedback during video playback analysis
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  VideoPlaybackAudioController,
  DEFAULT_VIDEO_VOICE_CONFIG,
} from '@/utils/videoPlaybackAudioController';
import type {
  VideoVoiceFeedbackConfig,
  VideoVoiceFeedbackState,
  VideoAudioQueueItem,
  VerbosityLevel,
  AudioLanguage,
} from '@/types/audioFeedback';
import type { VideoRepAnalysisResult } from '@/types/video';

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'video-voice-feedback-config';

// ============================================
// Storage Helpers
// ============================================

function loadPersistedConfig(): Partial<VideoVoiceFeedbackConfig> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function persistConfig(config: VideoVoiceFeedbackConfig): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Handle quota exceeded silently
  }
}

// ============================================
// Hook Interface
// ============================================

interface UseVideoVoiceFeedbackOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  repAnalysisResult: VideoRepAnalysisResult | null;
  language?: AudioLanguage;
  onAutoPause?: (paused: boolean, issue: string) => void;
}

interface UseVideoVoiceFeedbackReturn {
  // State
  state: VideoVoiceFeedbackState;
  config: VideoVoiceFeedbackConfig;
  isEnabled: boolean;
  isSpeaking: boolean;
  isAutoPaused: boolean;
  currentSpeechContent: string | null;
  upcomingFeedback: VideoAudioQueueItem[];

  // Controls
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  setVerbosity: (level: VerbosityLevel) => void;
  setVolume: (volume: number) => void;
  setLanguage: (language: AudioLanguage) => void;
  toggleAutoPause: () => void;
  toggleRepSummaries: () => void;
  resumeFromPause: () => void;
  updateConfig: (config: Partial<VideoVoiceFeedbackConfig>) => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useVideoVoiceFeedback(
  options: UseVideoVoiceFeedbackOptions
): UseVideoVoiceFeedbackReturn {
  const { videoRef, repAnalysisResult, language = 'ko', onAutoPause } = options;

  // Load persisted config and merge with defaults
  const [config, setConfig] = useState<VideoVoiceFeedbackConfig>(() => ({
    ...DEFAULT_VIDEO_VOICE_CONFIG,
    language,
    ...loadPersistedConfig(),
  }));

  const [state, setState] = useState<VideoVoiceFeedbackState>({
    isInitialized: false,
    isPlaying: false,
    isSpeaking: false,
    lastVoiceTime: 0,
    queueLength: 0,
    audioSupported: false,
    speechSupported: false,
    currentVideoTime: 0,
    queuedFeedbackCount: 0,
    nextFeedbackTimestamp: null,
    isAutoPaused: false,
    currentRepBeingNarrated: null,
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [currentSpeechContent, setCurrentSpeechContent] = useState<string | null>(null);
  const [upcomingFeedback, setUpcomingFeedback] = useState<VideoAudioQueueItem[]>([]);

  // Controller ref
  const controllerRef = useRef<VideoPlaybackAudioController | null>(null);

  // Initialize controller
  useEffect(() => {
    const persistedConfig = loadPersistedConfig();
    const mergedConfig = {
      ...DEFAULT_VIDEO_VOICE_CONFIG,
      language,
      ...persistedConfig,
    };

    controllerRef.current = new VideoPlaybackAudioController(mergedConfig);

    // Set up state change callback
    controllerRef.current.onStateChange((newState) => {
      setState(newState);
      setIsSpeaking(newState.isSpeaking);
      setIsAutoPaused(newState.isAutoPaused);
    });

    // Set up auto-pause callback
    if (onAutoPause) {
      controllerRef.current.onAutoPause((paused, issue) => {
        setIsAutoPaused(paused);
        onAutoPause(paused, issue);
      });
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.detach();
        controllerRef.current = null;
      }
    };
  }, [language, onAutoPause]);

  // Attach to video element when available
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !controllerRef.current) return;

    controllerRef.current.attachToVideo(video);

    return () => {
      if (controllerRef.current) {
        controllerRef.current.detach();
      }
    };
  }, [videoRef]);

  // Load analysis when available
  useEffect(() => {
    if (repAnalysisResult && controllerRef.current) {
      controllerRef.current.loadAnalysis(repAnalysisResult);
    }
  }, [repAnalysisResult]);

  // Update upcoming feedback periodically
  useEffect(() => {
    if (!controllerRef.current) return;

    const interval = setInterval(() => {
      if (controllerRef.current) {
        const upcoming = controllerRef.current.getUpcomingFeedback(3);
        setUpcomingFeedback(upcoming);
        setCurrentSpeechContent(controllerRef.current.getCurrentSpeechContent());
        setIsSpeaking(controllerRef.current.isSpeaking());
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // ============================================
  // Control Functions
  // ============================================

  const updateConfigAndPersist = useCallback((newConfig: Partial<VideoVoiceFeedbackConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      persistConfig(updated);

      if (controllerRef.current) {
        controllerRef.current.updateConfig(newConfig);
      }

      return updated;
    });
  }, []);

  const enable = useCallback(() => {
    updateConfigAndPersist({ enabled: true });
  }, [updateConfigAndPersist]);

  const disable = useCallback(() => {
    updateConfigAndPersist({ enabled: false });
  }, [updateConfigAndPersist]);

  const toggle = useCallback(() => {
    updateConfigAndPersist({ enabled: !config.enabled });
  }, [config.enabled, updateConfigAndPersist]);

  const setVerbosity = useCallback((level: VerbosityLevel) => {
    updateConfigAndPersist({ verbosity: level });
  }, [updateConfigAndPersist]);

  const setVolume = useCallback((volume: number) => {
    updateConfigAndPersist({ masterVolume: Math.max(0, Math.min(1, volume)) });
  }, [updateConfigAndPersist]);

  const setLanguageConfig = useCallback((lang: AudioLanguage) => {
    updateConfigAndPersist({ language: lang });
  }, [updateConfigAndPersist]);

  const toggleAutoPause = useCallback(() => {
    updateConfigAndPersist({ autoPauseOnCritical: !config.autoPauseOnCritical });
  }, [config.autoPauseOnCritical, updateConfigAndPersist]);

  const toggleRepSummaries = useCallback(() => {
    updateConfigAndPersist({ enableRepSummaries: !config.enableRepSummaries });
  }, [config.enableRepSummaries, updateConfigAndPersist]);

  const resumeFromPause = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.resumeFromAutoPause();
      setIsAutoPaused(false);
    }
  }, []);

  return {
    // State
    state,
    config,
    isEnabled: config.enabled,
    isSpeaking,
    isAutoPaused,
    currentSpeechContent,
    upcomingFeedback,

    // Controls
    enable,
    disable,
    toggle,
    setVerbosity,
    setVolume,
    setLanguage: setLanguageConfig,
    toggleAutoPause,
    toggleRepSummaries,
    resumeFromPause,
    updateConfig: updateConfigAndPersist,
  };
}
