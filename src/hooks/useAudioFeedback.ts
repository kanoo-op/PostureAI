/**
 * useAudioFeedback React Hook
 * Provides audio feedback functionality for exercise coaching
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AudioFeedbackSystem,
  DEFAULT_AUDIO_CONFIG,
  isAudioSupported,
  isSpeechSupported,
} from '@/utils/audioFeedbackSystem';
import type {
  AudioFeedbackConfig,
  AudioFeedbackState,
  PhaseBeepType,
  AudioPriority,
  VerbosityLevel,
} from '@/types/audioFeedback';
import type { FeedbackItem, SquatPhase } from '@/utils/squatAnalyzer';

interface UseAudioFeedbackOptions {
  initialConfig?: Partial<AudioFeedbackConfig>;
  autoInitialize?: boolean;
}

interface UseAudioFeedbackReturn {
  state: AudioFeedbackState;
  config: AudioFeedbackConfig;
  initialize: () => Promise<boolean>;
  playPhaseBeep: (phase: PhaseBeepType) => void;
  announceCorrection: (messageKey: string, priority: AudioPriority) => void;
  processFeedback: (feedback: FeedbackItem, context: string) => void;
  onPhaseChange: (prevPhase: SquatPhase, currentPhase: SquatPhase) => void;
  updateConfig: (config: Partial<AudioFeedbackConfig>) => void;
  setEnabled: (enabled: boolean) => void;
  setVerbosity: (verbosity: VerbosityLevel) => void;
  setVolume: (type: 'master' | 'voice' | 'beep', value: number) => void;
  isSupported: boolean;
}

export function useAudioFeedback({
  initialConfig = {},
  autoInitialize = false,
}: UseAudioFeedbackOptions = {}): UseAudioFeedbackReturn {
  const systemRef = useRef<AudioFeedbackSystem | null>(null);
  const [config, setConfig] = useState<AudioFeedbackConfig>({
    ...DEFAULT_AUDIO_CONFIG,
    ...initialConfig,
  });
  const [state, setState] = useState<AudioFeedbackState>({
    isInitialized: false,
    isPlaying: false,
    isSpeaking: false,
    lastVoiceTime: 0,
    queueLength: 0,
    audioSupported: false,
    speechSupported: false,
  });

  // Initialize system lazily - use ref for config to avoid dependency issues
  const configRef = useRef(config);
  configRef.current = config;

  const getSystem = useCallback(() => {
    if (!systemRef.current) {
      systemRef.current = new AudioFeedbackSystem(configRef.current);
    }
    return systemRef.current;
  }, []);

  // Check support on mount
  useEffect(() => {
    setState(prev => ({
      ...prev,
      audioSupported: isAudioSupported(),
      speechSupported: isSpeechSupported(),
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      systemRef.current?.destroy();
      systemRef.current = null;
    };
  }, []);

  const initialize = useCallback(async () => {
    const system = getSystem();
    const success = await system.initialize();
    setState(system.getState());
    return success;
  }, [getSystem]);

  const playPhaseBeep = useCallback((phase: PhaseBeepType) => {
    getSystem().playPhaseBeep(phase);
  }, [getSystem]);

  const announceCorrection = useCallback((messageKey: string, priority: AudioPriority) => {
    getSystem().announceCorrection(messageKey, priority);
    setState(getSystem().getState());
  }, [getSystem]);

  const processFeedback = useCallback((feedback: FeedbackItem, context: string) => {
    getSystem().processFeedbackItem(feedback, context);
    setState(getSystem().getState());
  }, [getSystem]);

  const onPhaseChange = useCallback((prevPhase: SquatPhase, currentPhase: SquatPhase) => {
    getSystem().onPhaseChange(prevPhase, currentPhase);
  }, [getSystem]);

  const updateConfig = useCallback((newConfig: Partial<AudioFeedbackConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    getSystem().updateConfig(newConfig);
  }, [config, getSystem]);

  const setEnabled = useCallback((enabled: boolean) => {
    updateConfig({ enabled });
  }, [updateConfig]);

  const setVerbosity = useCallback((verbosity: VerbosityLevel) => {
    updateConfig({ verbosity });
  }, [updateConfig]);

  const setVolume = useCallback((type: 'master' | 'voice' | 'beep', value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    const key = type === 'master' ? 'masterVolume' :
      type === 'voice' ? 'voiceVolume' : 'beepVolume';
    updateConfig({ [key]: clampedValue });
  }, [updateConfig]);

  return {
    state,
    config,
    initialize,
    playPhaseBeep,
    announceCorrection,
    processFeedback,
    onPhaseChange,
    updateConfig,
    setEnabled,
    setVerbosity,
    setVolume,
    isSupported: state.audioSupported || state.speechSupported,
  };
}
