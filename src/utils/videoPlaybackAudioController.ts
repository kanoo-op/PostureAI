/**
 * VideoPlaybackAudioController
 * Wrapper around AudioFeedbackSystem that manages video synchronization
 * for voice-guided feedback during video playback
 */

import { AudioFeedbackSystem, isSpeechSupported } from './audioFeedbackSystem';
import { VideoFeedbackQueue } from './videoFeedbackQueue';
import type {
  VideoVoiceFeedbackConfig,
  VideoVoiceFeedbackState,
  VideoAudioQueueItem,
  AudioLanguage,
  VerbosityLevel,
} from '@/types/audioFeedback';
import type { VideoRepAnalysisResult } from '@/types/video';

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_VIDEO_VOICE_CONFIG: VideoVoiceFeedbackConfig = {
  // Base AudioFeedbackConfig defaults
  enabled: true,
  language: 'ko',
  verbosity: 'moderate',
  masterVolume: 0.7,
  voiceVolume: 0.8,
  beepVolume: 0.5,
  voiceThrottleMs: 2000,
  enablePhaseBeeps: false,  // Disable for video playback
  enableVoiceCorrections: true,
  // Video-specific
  autoPauseOnCritical: true,
  syncVoiceToPlaybackRate: true,
  minSpeechRate: 0.7,
  maxSpeechRate: 1.5,
  announcementLeadTime: 500,
  enableRepSummaries: true,
};

// ============================================
// VideoPlaybackAudioController Class
// ============================================

export class VideoPlaybackAudioController {
  private audioSystem: AudioFeedbackSystem;
  private feedbackQueue: VideoFeedbackQueue;
  private videoElement: HTMLVideoElement | null = null;
  private config: VideoVoiceFeedbackConfig;
  private isAutoPaused = false;
  private onAutoPauseCallback?: (paused: boolean, issue: string) => void;
  private onStateChangeCallback?: (state: VideoVoiceFeedbackState) => void;

  // Edge case handling
  private seekDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastVideoTime = 0;
  private repAnalysis: VideoRepAnalysisResult | null = null;
  private isProcessingSpeech = false;
  private currentSpeechItem: VideoAudioQueueItem | null = null;
  private boundTimeUpdateHandler: (() => void) | null = null;
  private boundEndedHandler: (() => void) | null = null;
  private boundSeekHandler: (() => void) | null = null;
  private boundRateChangeHandler: (() => void) | null = null;

  constructor(config: Partial<VideoVoiceFeedbackConfig> = {}) {
    this.config = { ...DEFAULT_VIDEO_VOICE_CONFIG, ...config };
    this.audioSystem = new AudioFeedbackSystem(this.config);
    this.feedbackQueue = new VideoFeedbackQueue(null, this.config.language);
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Attach to video element - sets up event listeners
   */
  attachToVideo(video: HTMLVideoElement): void {
    // Detach from previous video if any
    if (this.videoElement) {
      this.detach();
    }

    this.videoElement = video;

    // Bind handlers to preserve context
    this.boundTimeUpdateHandler = this.onVideoTimeUpdate.bind(this);
    this.boundEndedHandler = this.onVideoEnded.bind(this);
    this.boundSeekHandler = this.onSeekEvent.bind(this);
    this.boundRateChangeHandler = this.onRateChange.bind(this);

    // Attach event listeners
    video.addEventListener('timeupdate', this.boundTimeUpdateHandler);
    video.addEventListener('ended', this.boundEndedHandler);
    video.addEventListener('seeked', this.boundSeekHandler);
    video.addEventListener('ratechange', this.boundRateChangeHandler);

    // Initialize audio system
    this.audioSystem.initialize();
  }

  /**
   * Load analysis data and build feedback queue
   */
  loadAnalysis(analysis: VideoRepAnalysisResult): void {
    this.repAnalysis = analysis;
    this.feedbackQueue = new VideoFeedbackQueue(analysis, this.config.language);
    this.notifyStateChange();
  }

  /**
   * Handle seeking - reset processed items
   */
  onSeek(newTime: number): void {
    // Debounce rapid seeking
    if (this.seekDebounceTimer) {
      clearTimeout(this.seekDebounceTimer);
    }

    this.seekDebounceTimer = setTimeout(() => {
      this.feedbackQueue.resetForSeek(newTime * 1000);
      this.isAutoPaused = false;
      this.notifyStateChange();
    }, 150);
  }

  /**
   * Resume from auto-pause
   */
  resumeFromAutoPause(): void {
    if (this.isAutoPaused && this.videoElement) {
      this.isAutoPaused = false;
      this.videoElement.play();
      this.notifyStateChange();
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VideoVoiceFeedbackConfig>): void {
    const oldLanguage = this.config.language;
    this.config = { ...this.config, ...newConfig };
    this.audioSystem.updateConfig(this.config);

    // Rebuild queue if language changed
    if (this.config.language !== oldLanguage) {
      this.feedbackQueue.setLanguage(this.config.language);
    }

    this.notifyStateChange();
  }

  /**
   * Get current configuration
   */
  getConfig(): VideoVoiceFeedbackConfig {
    return { ...this.config };
  }

  /**
   * Set callback for auto-pause events
   */
  onAutoPause(callback: (paused: boolean, issue: string) => void): void {
    this.onAutoPauseCallback = callback;
  }

  /**
   * Set callback for state changes
   */
  onStateChange(callback: (state: VideoVoiceFeedbackState) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * Get current state
   */
  getState(): VideoVoiceFeedbackState {
    const audioState = this.audioSystem.getState();
    const currentTime = (this.videoElement?.currentTime ?? 0) * 1000;

    return {
      ...audioState,
      currentVideoTime: currentTime,
      queuedFeedbackCount: this.feedbackQueue.getUnprocessedCount(),
      nextFeedbackTimestamp: this.feedbackQueue.getNextFeedbackTimestamp(currentTime),
      isAutoPaused: this.isAutoPaused,
      currentRepBeingNarrated: this.currentSpeechItem?.repNumber ?? null,
    };
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.isProcessingSpeech || (isSpeechSupported() && window.speechSynthesis.speaking);
  }

  /**
   * Get current speech content
   */
  getCurrentSpeechContent(): string | null {
    return this.currentSpeechItem?.content as string | null;
  }

  /**
   * Get upcoming feedback items for preview
   */
  getUpcomingFeedback(count: number = 3): VideoAudioQueueItem[] {
    const currentTime = (this.videoElement?.currentTime ?? 0) * 1000;
    return this.feedbackQueue.getUpcomingItems(currentTime, count);
  }

  /**
   * Enable/disable voice feedback
   */
  setEnabled(enabled: boolean): void {
    this.updateConfig({ enabled });
  }

  /**
   * Set verbosity level
   */
  setVerbosity(level: VerbosityLevel): void {
    this.updateConfig({ verbosity: level });
  }

  /**
   * Set language
   */
  setLanguage(language: AudioLanguage): void {
    this.updateConfig({ language });
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    this.updateConfig({ masterVolume: Math.max(0, Math.min(1, volume)) });
  }

  /**
   * Toggle auto-pause on critical issues
   */
  toggleAutoPause(): void {
    this.updateConfig({ autoPauseOnCritical: !this.config.autoPauseOnCritical });
  }

  /**
   * Toggle rep summaries
   */
  toggleRepSummaries(): void {
    this.updateConfig({ enableRepSummaries: !this.config.enableRepSummaries });
  }

  /**
   * Cleanup
   */
  detach(): void {
    if (this.videoElement) {
      if (this.boundTimeUpdateHandler) {
        this.videoElement.removeEventListener('timeupdate', this.boundTimeUpdateHandler);
      }
      if (this.boundEndedHandler) {
        this.videoElement.removeEventListener('ended', this.boundEndedHandler);
      }
      if (this.boundSeekHandler) {
        this.videoElement.removeEventListener('seeked', this.boundSeekHandler);
      }
      if (this.boundRateChangeHandler) {
        this.videoElement.removeEventListener('ratechange', this.boundRateChangeHandler);
      }
    }

    this.videoElement = null;
    this.boundTimeUpdateHandler = null;
    this.boundEndedHandler = null;
    this.boundSeekHandler = null;
    this.boundRateChangeHandler = null;

    if (this.seekDebounceTimer) {
      clearTimeout(this.seekDebounceTimer);
      this.seekDebounceTimer = null;
    }

    this.audioSystem.destroy();
  }

  // ============================================
  // Private Event Handlers
  // ============================================

  /**
   * Handle video timeupdate event
   */
  private onVideoTimeUpdate(): void {
    if (!this.videoElement || !this.config.enabled) return;

    const currentTime = this.videoElement.currentTime * 1000; // Convert to ms
    const isRewinding = currentTime < this.lastVideoTime - 500;

    // Handle rewind detection
    if (isRewinding) {
      this.feedbackQueue.resetForSeek(currentTime);
    }

    this.lastVideoTime = currentTime;

    // Skip if already speaking or if auto-paused
    if (this.isProcessingSpeech || this.isAutoPaused) return;

    // Get items within announcement window
    const items = this.feedbackQueue.getItemsForTimestamp(
      currentTime,
      this.config.announcementLeadTime
    );

    // Filter based on verbosity and config
    const filteredItems = items.filter(item => this.shouldAnnounce(item));

    // Process items in priority order
    if (filteredItems.length > 0) {
      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      filteredItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      const nextItem = filteredItems[0];
      this.processItem(nextItem);
    }

    this.notifyStateChange();
  }

  /**
   * Handle video ended event
   */
  private onVideoEnded(): void {
    if (!this.config.enableRepSummaries || !this.repAnalysis) return;

    // Speak final summary
    const summary = this.feedbackQueue.getAnalysisSummary(this.repAnalysis);
    this.speak(summary);
  }

  /**
   * Handle seek event
   */
  private onSeekEvent(): void {
    if (this.videoElement) {
      this.onSeek(this.videoElement.currentTime);
    }
  }

  /**
   * Handle playback rate change
   */
  private onRateChange(): void {
    this.notifyStateChange();
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Check if item should be announced based on verbosity
   */
  private shouldAnnounce(item: VideoAudioQueueItem): boolean {
    // Skip rep summaries if disabled
    if (item.isRepSummary && !this.config.enableRepSummaries) {
      return false;
    }

    // Apply verbosity filter
    switch (this.config.verbosity) {
      case 'minimal':
        return item.priority === 'critical';
      case 'moderate':
        return item.priority === 'critical' || item.priority === 'high' || item.isRepSummary === true;
      case 'detailed':
        return true;
    }
  }

  /**
   * Process a feedback item
   */
  private async processItem(item: VideoAudioQueueItem): Promise<void> {
    // Mark as processed immediately to prevent duplicates
    this.feedbackQueue.markAsProcessed(item.id);

    // Handle critical issues with auto-pause
    if (item.priority === 'critical' && this.config.autoPauseOnCritical) {
      this.handleCriticalPause(item);
      return;
    }

    // Speak the item
    await this.speak(item.content as string);
    this.currentSpeechItem = item;
    this.notifyStateChange();
  }

  /**
   * Handle critical issue with auto-pause
   */
  private handleCriticalPause(item: VideoAudioQueueItem): void {
    if (!this.videoElement) return;

    this.videoElement.pause();
    this.isAutoPaused = true;

    // Notify callback
    if (this.onAutoPauseCallback) {
      this.onAutoPauseCallback(true, item.content as string);
    }

    // Speak the critical issue
    this.speak(item.content as string);
    this.notifyStateChange();
  }

  /**
   * Calculate speech rate based on video playback rate
   */
  private calculateSpeechRate(videoPlaybackRate: number): number {
    if (!this.config.syncVoiceToPlaybackRate) return 1.1;

    return Math.max(
      this.config.minSpeechRate,
      Math.min(this.config.maxSpeechRate, videoPlaybackRate)
    );
  }

  /**
   * Speak a message
   */
  private async speak(text: string): Promise<void> {
    if (!isSpeechSupported() || !this.config.enabled) return;

    this.isProcessingSpeech = true;
    this.notifyStateChange();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.config.language === 'ko' ? 'ko-KR' : 'en-US';
      utterance.volume = this.config.voiceVolume * this.config.masterVolume;
      utterance.rate = this.calculateSpeechRate(this.videoElement?.playbackRate ?? 1);

      utterance.onend = () => {
        this.isProcessingSpeech = false;
        this.currentSpeechItem = null;
        this.notifyStateChange();
        resolve();
      };

      utterance.onerror = () => {
        this.isProcessingSpeech = false;
        this.currentSpeechItem = null;
        this.notifyStateChange();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.getState());
    }
  }

  /**
   * Check for screen reader presence (accessibility)
   */
  private isScreenReaderActive(): boolean {
    return document.querySelector('[aria-live]') !== null ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Adjust for accessibility
   */
  private adjustForAccessibility(): void {
    if (this.isScreenReaderActive()) {
      // Use lower volume and increase throttle for screen reader users
      this.updateConfig({
        voiceVolume: Math.min(this.config.voiceVolume, 0.5),
        voiceThrottleMs: Math.max(this.config.voiceThrottleMs, 3000),
      });
    }
  }
}
