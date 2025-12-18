'use client';

import React from 'react';
import { CLIP_EDITOR_COLORS } from './constants';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: UndoRedoControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 rounded-lg transition-all disabled:opacity-30"
        style={{
          backgroundColor: CLIP_EDITOR_COLORS.backgroundElevated,
          color: CLIP_EDITOR_COLORS.textSecondary,
        }}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 rounded-lg transition-all disabled:opacity-30"
        style={{
          backgroundColor: CLIP_EDITOR_COLORS.backgroundElevated,
          color: CLIP_EDITOR_COLORS.textSecondary,
        }}
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
        </svg>
      </button>
    </div>
  );
}
