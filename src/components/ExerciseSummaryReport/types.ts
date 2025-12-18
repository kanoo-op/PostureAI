import { ExerciseType, JointAngleType, SessionRecord, AngleData, TrendDirection } from '@/types/angleHistory';
import { MobilityAssessment, JointROMResult, ROMRecommendation } from '@/utils/jointROMAnalyzer';

// Summary report props
export interface ExerciseSummaryReportProps {
  session: SessionRecord;
  isVisible?: boolean;
  onClose?: () => void;
  onShare?: () => void;
  onSaveNotes?: (notes: string) => void;
  className?: string;
  language?: 'ko' | 'en';
}

// 3D Angle statistics for a single joint
export interface AngleStatistics {
  jointType: JointAngleType;
  min: number;
  max: number;
  average: number;
  stdDev: number;
  range: number; // max - min
}

// ROM achievement comparison
export interface ROMAchievement {
  jointType: JointAngleType;
  achieved: number;
  benchmarkMin: number;
  benchmarkMax: number;
  percentOfBenchmark: number;
  assessment: MobilityAssessment;
}

// Bilateral symmetry score
export interface SymmetryScore {
  jointType: JointAngleType;
  leftAverage: number;
  rightAverage: number;
  difference: number;
  symmetryPercent: number; // 0-100
  level: 'good' | 'warning' | 'error';
}

// Form breakdown entry
export interface FormBreakdown {
  type: 'good' | 'warning' | 'error';
  label: string;
  labelEn: string;
  count: number;
  percentage: number;
}

// Rep quality trend point
export interface RepQualityPoint {
  repNumber: number;
  score: number;
  trend: TrendDirection;
}

// Complete summary data
export interface SummaryData {
  sessionId: string;
  exerciseType: ExerciseType;
  timestamp: number;
  duration: number;
  repCount: number;
  overallScore: number;
  angleStatistics: AngleStatistics[];
  romAchievements: ROMAchievement[];
  symmetryScores: SymmetryScore[];
  formBreakdown: FormBreakdown[];
  repQualityTrend: RepQualityPoint[];
  recommendations: ROMRecommendation[];
}

// Sub-component props
export interface SummaryHeaderProps {
  exerciseType: ExerciseType;
  timestamp: number;
  duration: number;
  overallScore: number;
  language?: 'ko' | 'en';
}

export interface AngleStatisticsCardProps {
  statistics: AngleStatistics[];
  language?: 'ko' | 'en';
}

export interface ROMAchievementSectionProps {
  achievements: ROMAchievement[];
  language?: 'ko' | 'en';
}

export interface SymmetryScoreCardProps {
  scores: SymmetryScore[];
  language?: 'ko' | 'en';
}

export interface FormBreakdownChartProps {
  breakdown: FormBreakdown[];
  language?: 'ko' | 'en';
}

export interface RepQualityTrendChartProps {
  trend: RepQualityPoint[];
  language?: 'ko' | 'en';
}

export interface CollapsibleSectionProps {
  title: string;
  titleEn?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  language?: 'ko' | 'en';
}

export interface TrendIndicatorBadgeProps {
  trend: TrendDirection;
  size?: 'sm' | 'md';
}

export interface SessionActionsFooterProps {
  onClose?: () => void;
  onShare?: () => void;
  onSaveNotes?: (notes: string) => void;
  language?: 'ko' | 'en';
}
