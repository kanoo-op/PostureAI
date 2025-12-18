'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { JointFilterDropdownProps } from './types';
import { REP_COMPARISON_COLORS, JOINT_ANGLE_LABELS } from './constants';
import { JointAngleType } from '@/types/angleHistory';

export default function JointFilterDropdown({
  availableJoints,
  selectedJoints,
  onJointChange,
}: JointFilterDropdownProps) {
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

  const handleJointToggle = useCallback(
    (jointType: JointAngleType) => {
      if (selectedJoints.includes(jointType)) {
        // Don't allow deselecting the last joint
        if (selectedJoints.length > 1) {
          onJointChange(selectedJoints.filter((j) => j !== jointType));
        }
      } else {
        onJointChange([...selectedJoints, jointType]);
      }
    },
    [selectedJoints, onJointChange]
  );

  const handleSelectAll = useCallback(() => {
    onJointChange([...availableJoints]);
  }, [availableJoints, onJointChange]);

  if (availableJoints.length === 0) {
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
        aria-label="Filter joints"
      >
        <span>관절 / Joints ({selectedJoints.length})</span>
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
          className="absolute top-full left-0 mt-1 w-56 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{
            backgroundColor: REP_COMPARISON_COLORS.surface,
            borderColor: REP_COMPARISON_COLORS.border,
            borderWidth: 1,
            borderStyle: 'solid',
          }}
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Select All option */}
          <button
            onClick={handleSelectAll}
            className="w-full px-3 py-2 text-left hover:bg-white/5 transition-colors border-b"
            style={{
              borderColor: REP_COMPARISON_COLORS.border,
              color: REP_COMPARISON_COLORS.primary,
            }}
          >
            <span className="text-xs font-medium">전체 선택 / Select All</span>
          </button>

          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {availableJoints.map((jointType) => {
              const isSelected = selectedJoints.includes(jointType);
              const label = JOINT_ANGLE_LABELS[jointType];

              return (
                <button
                  key={jointType}
                  onClick={() => handleJointToggle(jointType)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? REP_COMPARISON_COLORS.status.goodBg
                      : 'transparent',
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span
                    className="text-xs"
                    style={{ color: REP_COMPARISON_COLORS.textPrimary }}
                  >
                    {label.ko} / {label.en}
                  </span>

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
