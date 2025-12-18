'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { VIDEO_COLORS } from './constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class VideoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VideoErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="p-6 rounded-xl text-center"
          style={{ backgroundColor: VIDEO_COLORS.errorBg }}
        >
          <svg
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: VIDEO_COLORS.error }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3
            className="font-semibold mb-2"
            style={{ color: VIDEO_COLORS.error }}
          >
            오류가 발생했습니다
          </h3>
          <p
            className="text-sm mb-4"
            style={{ color: VIDEO_COLORS.textSecondary }}
          >
            비디오 처리 중 문제가 발생했습니다.
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: VIDEO_COLORS.primary,
              color: '#FFFFFF',
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
