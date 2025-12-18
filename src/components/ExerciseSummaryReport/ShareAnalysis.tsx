'use client';

import React, { useState, useCallback } from 'react';
import { SessionRecord } from '@/types/angleHistory';
import { SummaryData } from './types';
import { SUMMARY_COLORS } from './constants';
import { exportSessionAsCSV, exportSessionAsJSON, generateFilename, downloadFile } from '@/utils/exportUtils';
import { PDFReportGenerator } from '@/utils/pdfReportGenerator';

export interface ShareAnalysisProps {
  session: SessionRecord;
  summaryData: SummaryData;
  language?: 'ko' | 'en';
  onExportStart?: () => void;
  onExportComplete?: (format: string) => void;
  onExportError?: (error: string) => void;
}

type ExportFormat = 'csv' | 'json' | 'pdf';
type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

const formats: { id: ExportFormat; label: string; labelEn: string; icon: string; description: string; descriptionEn: string }[] = [
  {
    id: 'csv',
    label: 'CSV',
    labelEn: 'CSV',
    icon: '📊',
    description: '스프레드시트 프로그램에서 열기',
    descriptionEn: 'Open in spreadsheet apps'
  },
  {
    id: 'json',
    label: 'JSON',
    labelEn: 'JSON',
    icon: '{ }',
    description: '기술 데이터 형식',
    descriptionEn: 'Technical data format'
  },
  {
    id: 'pdf',
    label: 'PDF 리포트',
    labelEn: 'PDF Report',
    icon: '📄',
    description: '전문가와 공유하기 좋음',
    descriptionEn: 'Best for sharing with professionals'
  }
];

export default function ShareAnalysis({
  session,
  summaryData,
  language = 'ko',
  onExportStart,
  onExportComplete,
  onExportError,
}: ShareAnalysisProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleExport = useCallback(async () => {
    setExportStatus('exporting');
    setErrorMessage('');
    onExportStart?.();

    try {
      let content: string | Blob;
      let filename: string;
      let mimeType: string;

      switch (selectedFormat) {
        case 'csv':
          content = exportSessionAsCSV(session, language);
          filename = generateFilename(session.exerciseType, 'csv');
          mimeType = 'text/csv;charset=utf-8';
          break;

        case 'json':
          content = exportSessionAsJSON(session, language);
          filename = generateFilename(session.exerciseType, 'json');
          mimeType = 'application/json';
          break;

        case 'pdf':
          const pdfGenerator = new PDFReportGenerator({
            language,
            includeCharts: true,
            includeSummary: true,
            includeRecommendations: true
          });
          content = await pdfGenerator.generateReport(session, summaryData);
          filename = generateFilename(session.exerciseType, 'pdf');
          mimeType = 'application/pdf';
          break;

        default:
          throw new Error('Unknown format');
      }

      downloadFile(content, filename, mimeType);
      setExportStatus('success');
      onExportComplete?.(selectedFormat);

      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setErrorMessage(message);
      setExportStatus('error');
      onExportError?.(message);
    }
  }, [selectedFormat, session, summaryData, language, onExportStart, onExportComplete, onExportError]);

  return (
    <div className="p-4 space-y-4" style={{ backgroundColor: SUMMARY_COLORS.surface }}>
      {/* Title */}
      <h3 className="text-lg font-semibold" style={{ color: SUMMARY_COLORS.textPrimary }}>
        {language === 'ko' ? '분석 결과 공유' : 'Share Analysis'}
      </h3>

      {/* Format Selection */}
      <div className="grid grid-cols-3 gap-3">
        {formats.map(format => (
          <button
            key={format.id}
            onClick={() => setSelectedFormat(format.id)}
            className="p-3 rounded-lg text-center transition-all"
            style={{
              backgroundColor: SUMMARY_COLORS.surfaceElevated,
              border: `2px solid ${selectedFormat === format.id ? SUMMARY_COLORS.primary : SUMMARY_COLORS.border}`,
              boxShadow: selectedFormat === format.id ? `0 0 12px ${SUMMARY_COLORS.primaryGlow}` : 'none'
            }}
          >
            <div className="text-2xl mb-1" style={{ color: selectedFormat === format.id ? SUMMARY_COLORS.primary : SUMMARY_COLORS.textSecondary }}>
              {format.icon}
            </div>
            <div className="text-sm font-medium" style={{ color: SUMMARY_COLORS.textPrimary }}>
              {language === 'ko' ? format.label : format.labelEn}
            </div>
            <div className="text-xs mt-1" style={{ color: SUMMARY_COLORS.textMuted }}>
              {language === 'ko' ? format.description : format.descriptionEn}
            </div>
          </button>
        ))}
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exportStatus === 'exporting'}
        className="w-full py-3 rounded-lg font-medium transition-all"
        style={{
          backgroundColor: exportStatus === 'exporting' ? SUMMARY_COLORS.surfaceElevated : SUMMARY_COLORS.primary,
          color: SUMMARY_COLORS.backgroundSolid,
          opacity: exportStatus === 'exporting' ? 0.7 : 1,
          cursor: exportStatus === 'exporting' ? 'not-allowed' : 'pointer'
        }}
      >
        {exportStatus === 'exporting'
          ? (language === 'ko' ? '내보내는 중...' : 'Exporting...')
          : (language === 'ko' ? '내보내기' : 'Export')}
      </button>

      {/* Success Message */}
      {exportStatus === 'success' && (
        <div
          className="p-3 rounded-lg flex items-center gap-2"
          style={{ backgroundColor: SUMMARY_COLORS.status.goodBg }}
        >
          <span style={{ color: SUMMARY_COLORS.status.good }}>✓</span>
          <span style={{ color: SUMMARY_COLORS.status.good }}>
            {language === 'ko' ? '내보내기 완료!' : 'Export complete!'}
          </span>
        </div>
      )}

      {/* Error Message */}
      {exportStatus === 'error' && (
        <div
          className="p-3 rounded-lg flex items-center gap-2"
          style={{ backgroundColor: SUMMARY_COLORS.status.errorBg }}
        >
          <span style={{ color: SUMMARY_COLORS.status.error }}>✗</span>
          <span style={{ color: SUMMARY_COLORS.status.error }}>
            {language === 'ko' ? '오류: ' : 'Error: '}{errorMessage}
          </span>
        </div>
      )}
    </div>
  );
}
