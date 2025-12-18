/**
 * Audio Feedback System
 * Real-time audio feedback for 3D angle analysis with voice cues and audio signals
 */

import type {
  AudioFeedbackConfig,
  AudioFeedbackState,
  AudioQueueItem,
  AudioLanguage,
  AudioPriority,
  PhaseBeepType,
  VerbosityLevel,
} from '@/types/audioFeedback';
import type { FeedbackItem, FeedbackLevel, SquatPhase } from './squatAnalyzer';

// ============================================
// Browser Support Detection
// ============================================

export function isAudioSupported(): boolean {
  return typeof window !== 'undefined' &&
    (typeof AudioContext !== 'undefined' ||
      typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== 'undefined');
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' &&
    'speechSynthesis' in window;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_AUDIO_CONFIG: AudioFeedbackConfig = {
  enabled: true,
  language: 'ko',
  verbosity: 'moderate',
  masterVolume: 0.7,
  voiceVolume: 0.8,
  beepVolume: 0.5,
  voiceThrottleMs: 2000,
  enablePhaseBeeps: true,
  enableVoiceCorrections: true,
};

// ============================================
// Beep Frequency Constants
// ============================================

const BEEP_FREQUENCIES: Record<PhaseBeepType, number> = {
  descending: 220,   // A3 - low tone for going down
  bottom: 440,       // A4 - middle tone (played twice)
  ascending: 660,    // E5 - higher tone for coming up
  success: 880,      // A5 - highest for success
};

const BEEP_DURATIONS: Record<PhaseBeepType, number> = {
  descending: 100,
  bottom: 100,
  ascending: 100,
  success: 200,
};

// ============================================
// Voice Messages (Bilingual)
// ============================================

const VOICE_MESSAGES: Record<AudioLanguage, Record<string, string>> = {
  ko: {
    // Critical corrections (injury risk)
    'knee_valgus_critical': '무릎을 바깥으로 밀어주세요',
    'torso_lean_critical': '상체를 세워주세요',
    'depth_too_deep': '너무 깊습니다',

    // High priority (errors)
    'knee_valgus_error': '무릎 정렬 주의',
    'torso_lean_error': '상체 기울기 주의',
    'hip_hinge_error': '엉덩이 뒤로',

    // Medium priority (warnings)
    'knee_angle_warning': '무릎 각도 조정',
    'ankle_mobility': '발목 가동성 제한',

    // Low priority (good/info)
    'form_good': '좋습니다',
    'rep_complete': '완료',
    'depth_reached': '깊이 도달',

    // Video playback specific
    'rep_complete_good': '반복 {repNumber} 완료, 점수 {score}점, 좋은 자세입니다',
    'rep_complete_warning': '반복 {repNumber} 완료, 점수 {score}점, {issue} 주의',
    'rep_complete_error': '반복 {repNumber} 완료, 점수 {score}점, {issue} 수정 필요',
    'worst_moment': '문제 구간, {feedback}',
    'critical_pause': '심각한 문제 발견, {feedback}',
    'analysis_start': '영상 분석 피드백을 시작합니다',
    'analysis_end': '분석 완료, 평균 점수 {score}점',
  },
  en: {
    'knee_valgus_critical': 'Push knees outward',
    'torso_lean_critical': 'Keep chest up',
    'depth_too_deep': 'Too deep',
    'knee_valgus_error': 'Watch knee alignment',
    'torso_lean_error': 'Watch torso lean',
    'hip_hinge_error': 'Hips back',
    'knee_angle_warning': 'Adjust knee angle',
    'ankle_mobility': 'Ankle mobility limited',
    'form_good': 'Good form',
    'rep_complete': 'Complete',
    'depth_reached': 'Depth reached',

    // Video playback specific
    'rep_complete_good': 'Rep {repNumber} complete, score {score}, good form',
    'rep_complete_warning': 'Rep {repNumber} complete, score {score}, minor {issue} detected',
    'rep_complete_error': 'Rep {repNumber} complete, score {score}, {issue} needs correction',
    'worst_moment': 'Problem moment, {feedback}',
    'critical_pause': 'Critical issue detected, {feedback}',
    'analysis_start': 'Starting video analysis feedback',
    'analysis_end': 'Analysis complete, average score {score}',
  },
};

// ============================================
// AudioFeedbackSystem Class
// ============================================

export class AudioFeedbackSystem {
  private config: AudioFeedbackConfig;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isInitialized = false;
  private audioQueue: AudioQueueItem[] = [];
  private isProcessingQueue = false;
  private lastVoiceTimestamp = 0;
  private userInteracted = false;

  constructor(config: Partial<AudioFeedbackConfig> = {}) {
    this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
  }

  // Must be called after user interaction (click/tap)
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (!isAudioSupported()) return false;

    try {
      const AudioCtx = window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      this.audioContext = new AudioCtx();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.updateMasterVolume();
      this.isInitialized = true;
      this.userInteracted = true;
      return true;
    } catch (e) {
      console.error('AudioFeedbackSystem: Failed to initialize', e);
      return false;
    }
  }

  // Phase transition beep
  playPhaseBeep(phase: PhaseBeepType): void {
    if (!this.config.enablePhaseBeeps || !this.isInitialized || !this.config.enabled) return;

    const frequency = BEEP_FREQUENCIES[phase];
    const duration = BEEP_DURATIONS[phase];

    if (phase === 'bottom') {
      // Double beep for bottom phase
      this.playTone(frequency, duration, this.config.beepVolume);
      setTimeout(() => this.playTone(frequency, duration, this.config.beepVolume), 150);
    } else {
      this.playTone(frequency, duration, this.config.beepVolume);
    }
  }

  // Voice announcement with throttling
  announceCorrection(messageKey: string, priority: AudioPriority): void {
    if (!this.config.enableVoiceCorrections || !this.config.enabled) return;
    if (!this.shouldAnnounce(priority)) return;

    const message = VOICE_MESSAGES[this.config.language][messageKey];
    if (!message) return;

    this.queueVoice(message, priority);
  }

  // Convert FeedbackItem to audio
  processFeedbackItem(feedback: FeedbackItem, context: string): void {
    const priority = this.mapFeedbackLevelToPriority(feedback.level);
    const messageKey = this.determineMessageKey(context, feedback);

    if (this.shouldAnnounceForVerbosity(priority)) {
      this.announceCorrection(messageKey, priority);
    }
  }

  // Phase change handler (integrate with SquatPhase)
  onPhaseChange(previousPhase: SquatPhase, currentPhase: SquatPhase): void {
    if (previousPhase === currentPhase) return;

    switch (currentPhase) {
      case 'descending':
        this.playPhaseBeep('descending');
        break;
      case 'bottom':
        this.playPhaseBeep('bottom');
        break;
      case 'ascending':
        this.playPhaseBeep('ascending');
        break;
      case 'standing':
        if (previousPhase === 'ascending') {
          this.playPhaseBeep('success');
        }
        break;
    }
  }

  // Configuration updates
  updateConfig(newConfig: Partial<AudioFeedbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateMasterVolume();
  }

  // Get current configuration
  getConfig(): AudioFeedbackConfig {
    return { ...this.config };
  }

  // Cleanup
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
    this.isInitialized = false;
    this.audioQueue = [];
    // Cancel any pending speech
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  // State getter
  getState(): AudioFeedbackState {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isProcessingQueue,
      isSpeaking: isSpeechSupported() && window.speechSynthesis.speaking,
      lastVoiceTime: this.lastVoiceTimestamp,
      queueLength: this.audioQueue.length,
      audioSupported: isAudioSupported(),
      speechSupported: isSpeechSupported(),
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private playTone(frequency: number, durationMs: number, volume: number): void {
    if (!this.audioContext || !this.gainNode) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.gainNode);

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = volume * this.config.masterVolume;

      // Fade out to prevent clicks
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(volume * this.config.masterVolume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + durationMs / 1000);

      oscillator.start(now);
      oscillator.stop(now + durationMs / 1000);
    } catch (e) {
      console.error('AudioFeedbackSystem: Failed to play tone', e);
    }
  }

  private queueVoice(message: string, priority: AudioPriority): void {
    const item: AudioQueueItem = {
      id: `voice_${Date.now()}`,
      type: 'voice',
      priority,
      content: message,
      timestamp: Date.now(),
    };

    // Priority insertion
    const priorityOrder: Record<AudioPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = this.audioQueue.findIndex(
      q => priorityOrder[q.priority] > priorityOrder[priority]
    );

    if (insertIndex === -1) {
      this.audioQueue.push(item);
    } else {
      this.audioQueue.splice(insertIndex, 0, item);
    }

    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.audioQueue.length === 0) return;
    if (!isSpeechSupported()) return;

    this.isProcessingQueue = true;

    while (this.audioQueue.length > 0) {
      const item = this.audioQueue.shift()!;

      if (item.type === 'voice') {
        await this.speak(item.content as string);
        this.lastVoiceTimestamp = Date.now();
      }
    }

    this.isProcessingQueue = false;
  }

  private speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.config.language === 'ko' ? 'ko-KR' : 'en-US';
      utterance.volume = this.config.voiceVolume * this.config.masterVolume;
      utterance.rate = 1.1; // Slightly faster for exercise context
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  private shouldAnnounce(priority: AudioPriority): boolean {
    // Critical always announces
    if (priority === 'critical') return true;

    // Check throttle
    const timeSinceLast = Date.now() - this.lastVoiceTimestamp;
    return timeSinceLast >= this.config.voiceThrottleMs;
  }

  private shouldAnnounceForVerbosity(priority: AudioPriority): boolean {
    switch (this.config.verbosity) {
      case 'minimal':
        return priority === 'critical';
      case 'moderate':
        return priority === 'critical' || priority === 'high';
      case 'detailed':
        return true;
    }
  }

  private mapFeedbackLevelToPriority(level: FeedbackLevel): AudioPriority {
    switch (level) {
      case 'error': return 'critical';  // Error with injury risk
      case 'warning': return 'medium';
      case 'good': return 'low';
    }
  }

  private determineMessageKey(context: string, feedback: FeedbackItem): string {
    // Map feedback context + level to message key
    const severity = feedback.level === 'error' ? '_critical' :
      feedback.level === 'warning' ? '_error' : '';
    return `${context}${severity}`;
  }

  private updateMasterVolume(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = this.config.masterVolume;
    }
  }
}
