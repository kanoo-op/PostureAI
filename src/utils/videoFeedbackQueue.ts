/**
 * VideoFeedbackQueue - Timeline-based feedback queue management for video playback
 * Manages audio feedback items synchronized to video timestamps
 */

import type { VideoRepAnalysisResult, RepAnalysisResult } from '@/types/video';
import type { VideoAudioQueueItem, AudioPriority, AudioLanguage } from '@/types/audioFeedback';

// ============================================
// Voice Messages for Rep Summaries
// ============================================

const REP_MESSAGES: Record<AudioLanguage, Record<string, string>> = {
  ko: {
    'rep_complete_good': '반복 {repNumber} 완료, 점수 {score}점, 좋은 자세입니다',
    'rep_complete_warning': '반복 {repNumber} 완료, 점수 {score}점, {issue} 주의',
    'rep_complete_error': '반복 {repNumber} 완료, 점수 {score}점, {issue} 수정 필요',
    'worst_moment': '문제 구간, {feedback}',
    'critical_pause': '심각한 문제 발견, {feedback}',
    'analysis_start': '영상 분석 피드백을 시작합니다',
    'analysis_end': '분석 완료, 평균 점수 {score}점',
    'no_issues': '문제가 발견되지 않았습니다',
  },
  en: {
    'rep_complete_good': 'Rep {repNumber} complete, score {score}, good form',
    'rep_complete_warning': 'Rep {repNumber} complete, score {score}, minor {issue} detected',
    'rep_complete_error': 'Rep {repNumber} complete, score {score}, {issue} needs correction',
    'worst_moment': 'Problem moment, {feedback}',
    'critical_pause': 'Critical issue detected, {feedback}',
    'analysis_start': 'Starting video analysis feedback',
    'analysis_end': 'Analysis complete, average score {score}',
    'no_issues': 'No form issues detected',
  },
};

// ============================================
// VideoFeedbackQueue Class
// ============================================

export class VideoFeedbackQueue {
  private queue: VideoAudioQueueItem[] = [];
  private processedIds: Set<string> = new Set();
  private currentPosition = 0;
  private language: AudioLanguage = 'ko';
  private currentItemId: string | null = null;

  constructor(
    private repAnalysis: VideoRepAnalysisResult | null,
    language: AudioLanguage = 'ko'
  ) {
    this.language = language;
    if (repAnalysis) {
      this.buildQueueFromAnalysis(repAnalysis);
    }
  }

  /**
   * Build queue items from analysis result
   * Creates items for:
   * 1. Worst moments in each rep
   * 2. Rep boundary summaries
   * 3. Primary issues at specific timestamps
   */
  private buildQueueFromAnalysis(analysis: VideoRepAnalysisResult): void {
    this.queue = [];

    // Add start announcement
    this.queue.push({
      id: 'analysis_start',
      type: 'voice',
      priority: 'low',
      content: REP_MESSAGES[this.language]['analysis_start'],
      timestamp: Date.now(),
      videoTimestamp: 0,
      isRepSummary: false,
    });

    // Process each rep
    analysis.reps.forEach((rep, index) => {
      // Add worst moment feedback
      if (rep.worstMoment && rep.worstMoment.feedbacks.length > 0) {
        const priority = this.determinePriority(rep.worstMoment.score);
        const feedback = rep.worstMoment.feedbacks[0] || '';

        this.queue.push({
          id: `rep_${index}_worst_${rep.worstMoment.timestamp}`,
          type: 'voice',
          priority,
          content: this.formatMessage('worst_moment', { feedback }),
          timestamp: Date.now(),
          videoTimestamp: rep.worstMoment.timestamp,
          repNumber: rep.repNumber,
          isRepSummary: false,
          feedbackLevel: priority === 'critical' ? 'error' : priority === 'high' ? 'warning' : 'good',
        });
      }

      // Add rep summary at end of rep
      const summaryMessage = this.getRepSummary(rep.repNumber, rep);
      this.queue.push({
        id: `rep_${index}_summary_${rep.endTimestamp}`,
        type: 'voice',
        priority: 'medium',
        content: summaryMessage,
        timestamp: Date.now(),
        videoTimestamp: rep.endTimestamp,
        repNumber: rep.repNumber,
        isRepSummary: true,
        feedbackLevel: rep.score >= 80 ? 'good' : rep.score >= 60 ? 'warning' : 'error',
      });
    });

    // Add end summary
    this.queue.push({
      id: 'analysis_end',
      type: 'voice',
      priority: 'low',
      content: this.formatMessage('analysis_end', { score: Math.round(analysis.summary.averageScore).toString() }),
      timestamp: Date.now(),
      videoTimestamp: analysis.reps.length > 0
        ? analysis.reps[analysis.reps.length - 1].endTimestamp + 500
        : 0,
      isRepSummary: true,
    });

    // Sort queue by video timestamp
    this.queue.sort((a, b) => a.videoTimestamp - b.videoTimestamp);
  }

  /**
   * Get items within lookahead window that haven't been processed
   */
  public getItemsForTimestamp(timestamp: number, lookaheadMs: number): VideoAudioQueueItem[] {
    const windowStart = timestamp;
    const windowEnd = timestamp + lookaheadMs;

    return this.queue.filter(item =>
      item.videoTimestamp >= windowStart &&
      item.videoTimestamp <= windowEnd &&
      !this.processedIds.has(item.id)
    );
  }

  /**
   * Get next unprocessed item
   */
  public getNextItem(currentTimestamp: number): VideoAudioQueueItem | null {
    for (const item of this.queue) {
      if (item.videoTimestamp >= currentTimestamp && !this.processedIds.has(item.id)) {
        return item;
      }
    }
    return null;
  }

  /**
   * Mark item as processed/spoken
   */
  public markAsProcessed(itemId: string): void {
    this.processedIds.add(itemId);
  }

  /**
   * Reset processed items after new timestamp for replay
   * Clears items that occur after the seek position
   */
  public resetForSeek(newTimestamp: number): void {
    const idsToRemove: string[] = [];

    this.processedIds.forEach(id => {
      const item = this.queue.find(q => q.id === id);
      if (item && item.videoTimestamp >= newTimestamp) {
        idsToRemove.push(id);
      }
    });

    idsToRemove.forEach(id => this.processedIds.delete(id));
  }

  /**
   * Get all processed item IDs
   */
  public getProcessedIds(): Set<string> {
    return new Set(this.processedIds);
  }

  /**
   * Get rep summary message
   */
  public getRepSummary(repNumber: number, rep: RepAnalysisResult): string {
    const score = Math.round(rep.score);
    const primaryIssue = rep.primaryIssues.length > 0 ? rep.primaryIssues[0] : '';

    if (score >= 80) {
      return this.formatMessage('rep_complete_good', {
        repNumber: repNumber.toString(),
        score: score.toString()
      });
    } else if (score >= 60) {
      return this.formatMessage('rep_complete_warning', {
        repNumber: repNumber.toString(),
        score: score.toString(),
        issue: primaryIssue
      });
    } else {
      return this.formatMessage('rep_complete_error', {
        repNumber: repNumber.toString(),
        score: score.toString(),
        issue: primaryIssue
      });
    }
  }

  /**
   * Get analysis summary message
   */
  public getAnalysisSummary(analysis: VideoRepAnalysisResult): string {
    return this.formatMessage('analysis_end', {
      score: Math.round(analysis.summary.averageScore).toString()
    });
  }

  /**
   * Get total queue length
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get unprocessed queue length
   */
  public getUnprocessedCount(): number {
    return this.queue.filter(item => !this.processedIds.has(item.id)).length;
  }

  /**
   * Get next feedback timestamp
   */
  public getNextFeedbackTimestamp(currentTimestamp: number): number | null {
    const next = this.getNextItem(currentTimestamp);
    return next ? next.videoTimestamp : null;
  }

  /**
   * Check if analysis has any issues
   */
  public hasIssues(): boolean {
    return this.queue.some(item =>
      item.priority === 'critical' || item.priority === 'high'
    );
  }

  /**
   * Get preview of upcoming items (for UI display)
   */
  public getUpcomingItems(currentTimestamp: number, count: number = 3): VideoAudioQueueItem[] {
    return this.queue
      .filter(item => item.videoTimestamp >= currentTimestamp && !this.processedIds.has(item.id))
      .slice(0, count);
  }

  /**
   * Update language
   */
  public setLanguage(language: AudioLanguage): void {
    if (this.language !== language) {
      this.language = language;
      // Rebuild queue with new language
      if (this.repAnalysis) {
        const processedBackup = new Set(this.processedIds);
        this.buildQueueFromAnalysis(this.repAnalysis);
        this.processedIds = processedBackup;
      }
    }
  }

  /**
   * Clear all processed items
   */
  public reset(): void {
    this.processedIds.clear();
    this.currentPosition = 0;
    this.currentItemId = null;
  }

  /**
   * Set the currently processing item
   */
  public setCurrentItem(id: string | null): void {
    this.currentItemId = id;
  }

  /**
   * Get the currently processing item
   */
  public getCurrentItem(): VideoAudioQueueItem | null {
    return this.queue.find(item => item.id === this.currentItemId) ?? null;
  }

  /**
   * Skip current item and return next unprocessed item
   */
  public skipCurrent(): VideoAudioQueueItem | null {
    if (this.currentItemId) {
      this.markAsProcessed(this.currentItemId);
      this.currentItemId = null;
    }
    // Return next unprocessed item
    return this.queue.find(item => !this.processedIds.has(item.id)) ?? null;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private determinePriority(score: number): AudioPriority {
    if (score < 40) return 'critical';
    if (score < 60) return 'high';
    if (score < 80) return 'medium';
    return 'low';
  }

  private formatMessage(key: string, params: Record<string, string> = {}): string {
    let message = REP_MESSAGES[this.language][key] || key;

    Object.entries(params).forEach(([paramKey, value]) => {
      message = message.replace(`{${paramKey}}`, value);
    });

    return message;
  }
}
