import type { VideoAnalysisResult, VideoRepAnalysisResult } from '@/types/video';
import type { VideoSessionRecord } from '@/types/sessionHistory';
import { SESSION_HISTORY_SCHEMA_VERSION } from '@/types/sessionHistory';

export function mapAnalysisToSessionRecord(
  analysisResult: VideoAnalysisResult,
  repAnalysisResult: VideoRepAnalysisResult
): VideoSessionRecord {
  return {
    id: crypto.randomUUID(),
    schemaVersion: SESSION_HISTORY_SCHEMA_VERSION,
    timestamp: Date.now(),
    exerciseType: repAnalysisResult.exerciseType,
    duration: repAnalysisResult.summary.totalDuration,
    totalReps: repAnalysisResult.totalReps,
    overallScore: Math.round(repAnalysisResult.summary.averageScore),
    perRepScores: repAnalysisResult.reps.map(r => Math.round(r.score)),
    problemMoments: repAnalysisResult.reps
      .filter(r => r.worstMoment.score < 70)
      .map(r => ({
        timestamp: r.worstMoment.timestamp,
        score: r.worstMoment.score,
        issues: r.worstMoment.feedbacks,
      })),
    videoMetadata: {
      fileName: analysisResult.videoMetadata.fileName,
      fileSize: analysisResult.videoMetadata.fileSize,
      width: analysisResult.videoMetadata.width,
      height: analysisResult.videoMetadata.height,
    },
    consistency: repAnalysisResult.consistency,
  };
}
