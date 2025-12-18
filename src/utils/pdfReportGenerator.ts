import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { SessionRecord } from '@/types/angleHistory';
import { SummaryData, AngleStatistics, ROMAchievement, FormBreakdown } from '@/components/ExerciseSummaryReport/types';
import { JOINT_LABELS, EXERCISE_LABELS } from '@/components/ExerciseSummaryReport/constants';
import { formatDuration } from './exportUtils';

export interface PDFReportOptions {
  language: 'ko' | 'en';
  includeCharts: boolean;
  includeSummary: boolean;
  includeRecommendations: boolean;
}

export class PDFReportGenerator {
  private doc: jsPDF;
  private language: 'ko' | 'en';
  private yPosition: number = 20;
  private pageWidth: number;
  private margin: number = 20;
  private options: PDFReportOptions;

  // Design tokens converted to RGB arrays for jsPDF
  private colors = {
    primary: [0, 245, 160] as [number, number, number],
    secondary: [0, 221, 255] as [number, number, number],
    background: [17, 24, 39] as [number, number, number],
    text: [255, 255, 255] as [number, number, number],
    textSecondary: [156, 163, 175] as [number, number, number],
    statusGood: [0, 245, 160] as [number, number, number],
    statusWarning: [255, 184, 0] as [number, number, number],
    statusError: [255, 61, 113] as [number, number, number],
  };

  constructor(options: PDFReportOptions) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.options = options;
    this.language = options.language;
    this.pageWidth = this.doc.internal.pageSize.getWidth();
  }

  async generateReport(session: SessionRecord, summaryData: SummaryData): Promise<Blob> {
    // 1. Add header
    this.addHeader(session);

    // 2. Add session overview
    this.addSessionOverview(session);

    // 3. Add angle statistics table
    this.addAngleStatisticsTable(summaryData.angleStatistics);

    // 4. Add ROM achievements
    if (this.options.includeSummary) {
      this.addROMAchievements(summaryData.romAchievements);
    }

    // 5. Add form breakdown
    this.addFormBreakdown(summaryData.formBreakdown);

    // 6. Add recommendations
    if (this.options.includeRecommendations && summaryData.recommendations.length > 0) {
      this.addRecommendations(summaryData.recommendations);
    }

    // 7. Add footer
    this.addFooter();

    return this.doc.output('blob');
  }

  private addHeader(session: SessionRecord): void {
    const title = this.language === 'ko' ? '3D 자세 분석 리포트' : '3D Posture Analysis Report';
    const exerciseLabel = EXERCISE_LABELS[session.exerciseType][this.language];

    // Title
    this.doc.setFontSize(24);
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(title, this.margin, this.yPosition);
    this.yPosition += 10;

    // Exercise subtitle
    this.doc.setFontSize(14);
    this.doc.setTextColor(...this.colors.textSecondary);
    this.doc.text(exerciseLabel, this.margin, this.yPosition);
    this.yPosition += 8;

    // Date
    const dateStr = new Date(session.timestamp).toLocaleDateString(
      this.language === 'ko' ? 'ko-KR' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    );
    this.doc.setFontSize(10);
    this.doc.text(dateStr, this.margin, this.yPosition);
    this.yPosition += 15;

    // Divider
    this.doc.setDrawColor(...this.colors.primary);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 10;
  }

  private addSessionOverview(session: SessionRecord): void {
    const sectionTitle = this.language === 'ko' ? '세션 개요' : 'Session Overview';
    this.addSectionTitle(sectionTitle);

    const overviewData = [
      [this.language === 'ko' ? '총 시간' : 'Duration', formatDuration(session.duration)],
      [this.language === 'ko' ? '반복 횟수' : 'Reps', session.repCount.toString()],
      [this.language === 'ko' ? '전체 점수' : 'Overall Score', `${session.overallScore}/100`],
    ];

    this.doc.setFontSize(11);
    this.doc.setTextColor(...this.colors.text);

    overviewData.forEach(([label, value]) => {
      this.doc.text(`${label}: ${value}`, this.margin, this.yPosition);
      this.yPosition += 6;
    });

    this.yPosition += 8;
  }

  private addAngleStatisticsTable(statistics: AngleStatistics[]): void {
    const sectionTitle = this.language === 'ko' ? '3D 각도 통계' : '3D Angle Statistics';
    this.addSectionTitle(sectionTitle);

    const headers = this.language === 'ko'
      ? [['관절', '최소(°)', '최대(°)', '평균(°)', '표준편차', '범위(°)']]
      : [['Joint', 'Min(°)', 'Max(°)', 'Avg(°)', 'Std Dev', 'Range(°)']];

    const data = statistics.map(stat => [
      JOINT_LABELS[stat.jointType][this.language],
      stat.min.toFixed(1),
      stat.max.toFixed(1),
      stat.average.toFixed(1),
      stat.stdDev.toFixed(1),
      stat.range.toFixed(1)
    ]);

    (this.doc as any).autoTable({
      head: headers,
      body: data,
      startY: this.yPosition,
      margin: { left: this.margin, right: this.margin },
      headStyles: {
        fillColor: this.colors.primary,
        textColor: this.colors.background,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [31, 41, 55]
      },
      styles: {
        textColor: [200, 200, 200],
        fillColor: [17, 24, 39],
        fontSize: 9
      }
    });

    this.yPosition = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addROMAchievements(achievements: ROMAchievement[]): void {
    if (achievements.length === 0) return;

    const sectionTitle = this.language === 'ko' ? 'ROM 달성도' : 'ROM Achievement';
    this.addSectionTitle(sectionTitle);

    const headers = this.language === 'ko'
      ? [['관절', '달성(°)', '기준 범위(°)', '달성률', '평가']]
      : [['Joint', 'Achieved(°)', 'Benchmark(°)', 'Achievement', 'Assessment']];

    const data = achievements.map(ach => [
      JOINT_LABELS[ach.jointType][this.language],
      ach.achieved.toFixed(1),
      `${ach.benchmarkMin}-${ach.benchmarkMax}`,
      `${ach.percentOfBenchmark}%`,
      ach.assessment
    ]);

    (this.doc as any).autoTable({
      head: headers,
      body: data,
      startY: this.yPosition,
      margin: { left: this.margin, right: this.margin },
      headStyles: {
        fillColor: this.colors.secondary,
        textColor: this.colors.background,
        fontStyle: 'bold'
      },
      styles: {
        textColor: [200, 200, 200],
        fillColor: [17, 24, 39],
        fontSize: 9
      }
    });

    this.yPosition = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addFormBreakdown(breakdown: FormBreakdown[]): void {
    const sectionTitle = this.language === 'ko' ? '자세 분석' : 'Form Analysis';
    this.addSectionTitle(sectionTitle);

    this.doc.setFontSize(10);

    breakdown.forEach(item => {
      const color = item.type === 'good' ? this.colors.statusGood
        : item.type === 'warning' ? this.colors.statusWarning
        : this.colors.statusError;

      this.doc.setTextColor(...color);
      const label = this.language === 'ko' ? item.label : item.labelEn;
      this.doc.text(`● ${label}: ${item.percentage}%`, this.margin, this.yPosition);
      this.yPosition += 6;
    });

    this.yPosition += 8;
  }

  private addRecommendations(recommendations: any[]): void {
    const sectionTitle = this.language === 'ko' ? '권장 사항' : 'Recommendations';
    this.addSectionTitle(sectionTitle);

    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.colors.text);

    recommendations.slice(0, 5).forEach((rec, index) => {
      this.doc.text(`${index + 1}. ${rec.message || rec}`, this.margin, this.yPosition, {
        maxWidth: this.pageWidth - (this.margin * 2)
      });
      this.yPosition += 8;
    });
  }

  private addSectionTitle(title: string): void {
    this.doc.setFontSize(14);
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(title, this.margin, this.yPosition);
    this.yPosition += 8;
  }

  private addFooter(): void {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    this.doc.setFontSize(8);
    this.doc.setTextColor(...this.colors.textSecondary);

    const footerText = this.language === 'ko'
      ? 'PostureAI 3D 분석 시스템으로 생성됨'
      : 'Generated by PostureAI 3D Analysis System';

    this.doc.text(footerText, this.margin, pageHeight - 10);
    this.doc.text(new Date().toISOString(), this.pageWidth - this.margin - 50, pageHeight - 10);
  }
}
