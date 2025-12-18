import type { FeedbackLevel } from '@/utils/squatAnalyzer'

export interface TorsoSegmentAngles {
  upper: number      // Neck/shoulder segment angle (degrees)
  mid: number        // Shoulder to mid-spine angle (degrees)
  lower: number      // Mid-spine to hip angle (degrees)
}

export interface TorsoSegmentResult {
  angles: TorsoSegmentAngles
  levels: {
    upper: FeedbackLevel
    mid: FeedbackLevel
    lower: FeedbackLevel
  }
  alignmentScore: number           // 0-100 composite score
  alignmentLevel: 'excellent' | 'good' | 'fair' | 'poor'
  roundingDetection: {
    upper: RoundingState
    mid: RoundingState
    lower: RoundingState
  }
  isValid: boolean
}

export interface RoundingState {
  detected: boolean
  type: 'rounding' | 'extension' | 'neutral'
  magnitude: number                // Deviation from neutral (degrees)
  direction: 'forward' | 'backward' | 'none'
}

export interface TorsoSegmentFeedback {
  segment: 'upper' | 'mid' | 'lower'
  level: FeedbackLevel
  angle: number
  message: string                  // Bilingual format: "Korean / English"
  correctionDirection: 'forward' | 'backward' | 'none'
}

export interface TorsoSegmentVisualizationData {
  upperStart: { x: number; y: number }   // Neck/ear center
  upperEnd: { x: number; y: number }     // Shoulder center
  midEnd: { x: number; y: number }       // Mid-spine (estimated)
  lowerEnd: { x: number; y: number }     // Hip center
}
