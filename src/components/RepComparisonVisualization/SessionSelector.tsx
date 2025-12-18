'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { SessionSelectorProps } from './types';
import { REP_COMPARISON_COLORS } from './constants';

export default function SessionSelector({
  sessions,
  selectedSessionIds,
  onSessionChange,
  currentSessionId,
}: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSessionToggle = useCallback(
    (sessionId: string) => {
      if (selectedSessionIds.includes(sessionId)) {
        // Don't allow deselecting the last session
        if (selectedSessionIds.length > 1) {
          onSessionChange(selectedSessionIds.filter((id) => id !== sessionId));
        }
      } else {
        onSessionChange([...selectedSessionIds, sessionId]);
      }
    },
    [selectedSessionIds, onSessionChange]
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          backgroundColor: REP_COMPARISON_COLORS.surfaceElevated,
          color: REP_COMPARISON_COLORS.textPrimary,
          borderColor: isOpen ? REP_COMPARISON_COLORS.primary : REP_COMPARISON_COLORS.border,
          borderWidth: 1,
          borderStyle: 'solid',
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select sessions for comparison"
      >
        <span>세션 / Sessions ({selectedSessionIds.length})</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{
            backgroundColor: REP_COMPARISON_COLORS.surface,
            borderColor: REP_COMPARISON_COLORS.border,
            borderWidth: 1,
            borderStyle: 'solid',
          }}
          role="listbox"
          aria-multiselectable="true"
        >
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {sessions.map((session) => {
              const isSelected = selectedSessionIds.includes(session.id);
              const isCurrent = session.id === currentSessionId;

              return (
                <button
                  key={session.id}
                  onClick={() => handleSessionToggle(session.id)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? REP_COMPARISON_COLORS.status.goodBg
                      : 'transparent',
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex flex-col items-start">
                    <span
                      className="text-xs font-medium"
                      style={{ color: REP_COMPARISON_COLORS.textPrimary }}
                    >
                      {formatDate(session.timestamp)}
                      {isCurrent && (
                        <span
                          className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: REP_COMPARISON_COLORS.primary,
                            color: REP_COMPARISON_COLORS.background,
                          }}
                        >
                          현재 / Current
                        </span>
                      )}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: REP_COMPARISON_COLORS.textMuted }}
                    >
                      {session.repCount} reps | Score: {session.overallScore}
                    </span>
                  </div>

                  {/* Checkbox indicator */}
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: isSelected
                        ? REP_COMPARISON_COLORS.primary
                        : REP_COMPARISON_COLORS.surfaceElevated,
                      borderColor: REP_COMPARISON_COLORS.border,
                      borderWidth: 1,
                      borderStyle: 'solid',
                    }}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke={REP_COMPARISON_COLORS.background}
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
