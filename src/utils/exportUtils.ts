import { SessionRecord, JointAngleType, ExerciseType } from '@/types/angleHistory';
import { JOINT_LABELS, EXERCISE_LABELS } from '@/components/ExerciseSummaryReport/constants';

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  language: 'ko' | 'en';
  includeCharts: boolean;
  includeSummary: boolean;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  data?: Blob;
  error?: string;
}

export interface CSVRow {
  timestamp: string;
  exerciseType: string;
  jointType: string;
  minAngle: number;
  maxAngle: number;
  avgAngle: number;
  stdDev: number;
  repCount: number;
  overallScore: number;
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate a filename for export
 */
export function generateFilename(exerciseType: string, format: string): string {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].slice(0, 8).replace(/:/g, '-');
  return `posture-analysis_${exerciseType}_${date}_${time}.${format}`;
}

/**
 * Download a file to the user's device
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export a session record as CSV format
 */
export function exportSessionAsCSV(session: SessionRecord, language: 'ko' | 'en'): string {
  // CSV headers (bilingual)
  const headers = language === 'ko'
    ? '타임스탬프,운동유형,관절,최소각도(°),최대각도(°),평균각도(°),표준편차,샘플수,반복수,점수'
    : 'Timestamp,Exercise Type,Joint,Min Angle(°),Max Angle(°),Avg Angle(°),Std Dev,Samples,Rep Count,Score';

  const timestamp = new Date(session.timestamp).toISOString();
  const exerciseLabel = EXERCISE_LABELS[session.exerciseType][language];

  const rows = session.angles.map(angle => {
    const jointLabel = JOINT_LABELS[angle.jointType][language];
    return [
      timestamp,
      exerciseLabel,
      jointLabel,
      angle.min.toFixed(1),
      angle.max.toFixed(1),
      angle.average.toFixed(1),
      angle.stdDev.toFixed(2),
      angle.sampleCount,
      session.repCount,
      session.overallScore
    ].join(',');
  });

  // Use \r\n for Windows compatibility
  return [headers, ...rows].join('\r\n');
}

/**
 * Export a session record as JSON format
 */
export function exportSessionAsJSON(session: SessionRecord, language: 'ko' | 'en'): string {
  const exportData = {
    exportInfo: {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      language: language
    },
    session: {
      id: session.id,
      timestamp: session.timestamp,
      timestampFormatted: new Date(session.timestamp).toISOString(),
      exerciseType: session.exerciseType,
      exerciseLabel: EXERCISE_LABELS[session.exerciseType][language],
      duration: session.duration,
      durationFormatted: formatDuration(session.duration),
      repCount: session.repCount,
      overallScore: session.overallScore
    },
    angles: session.angles.map(angle => ({
      jointType: angle.jointType,
      jointLabel: JOINT_LABELS[angle.jointType][language],
      measurements: {
        min: angle.min,
        max: angle.max,
        average: angle.average,
        stdDev: angle.stdDev,
        range: angle.max - angle.min,
        sampleCount: angle.sampleCount
      }
    })),
    metadata: session.metadata || null
  };

  return JSON.stringify(exportData, null, 2);
}
