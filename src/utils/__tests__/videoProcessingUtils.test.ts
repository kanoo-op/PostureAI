import {
  formatFileSize,
  formatDuration,
  DEFAULT_VALIDATION_CONFIG,
} from '../videoProcessingUtils';

describe('videoProcessingUtils', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to mm:ss', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(605)).toBe('10:05');
    });
  });

  describe('DEFAULT_VALIDATION_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_VALIDATION_CONFIG.maxFileSizeMB).toBe(500);
      expect(DEFAULT_VALIDATION_CONFIG.minDurationSeconds).toBe(10);
      expect(DEFAULT_VALIDATION_CONFIG.maxDurationSeconds).toBe(600);
      expect(DEFAULT_VALIDATION_CONFIG.acceptedFormats).toContain('video/mp4');
      expect(DEFAULT_VALIDATION_CONFIG.acceptedFormats).toContain('video/webm');
    });
  });
});
