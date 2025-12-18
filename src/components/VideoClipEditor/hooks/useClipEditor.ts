'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  ClipBoundary,
  ClipEditorState,
  RepRangeSelection,
} from '@/types/videoClip';
import { CLIP_CONSTRAINTS } from '@/types/videoClip';
import type { RepAnalysisResult } from '@/types/video';

interface UseClipEditorOptions {
  duration: number;           // Video duration in ms
  frameRate: number;          // Video frame rate
  repBoundaries: RepAnalysisResult[];
  initialBoundary?: ClipBoundary;
}

export function useClipEditor(options: UseClipEditorOptions) {
  const { duration, frameRate, repBoundaries, initialBoundary } = options;

  const totalFrames = Math.floor((duration / 1000) * frameRate);

  const [state, setState] = useState<ClipEditorState>(() => ({
    clipBoundary: initialBoundary ?? {
      startFrame: 0,
      endFrame: totalFrames,
      startTimestamp: 0,
      endTimestamp: duration,
    },
    selectedRepRange: null,
    isDragging: null,
    previewTime: 0,
    undoStack: [],
    redoStack: [],
  }));

  // Convert frame to timestamp
  const frameToTimestamp = useCallback((frame: number): number => {
    return (frame / frameRate) * 1000;
  }, [frameRate]);

  // Convert timestamp to frame
  const timestampToFrame = useCallback((timestamp: number): number => {
    return Math.round((timestamp / 1000) * frameRate);
  }, [frameRate]);

  // Validate clip duration
  const validateClipDuration = useCallback((start: number, end: number): boolean => {
    const durationMs = end - start;
    return durationMs >= CLIP_CONSTRAINTS.MIN_DURATION_MS &&
           durationMs <= CLIP_CONSTRAINTS.MAX_DURATION_MS;
  }, []);

  // Push current state to undo stack
  const pushUndoState = useCallback(() => {
    setState(prev => ({
      ...prev,
      undoStack: [...prev.undoStack.slice(-19), prev.clipBoundary],
      redoStack: [],
    }));
  }, []);

  // Set clip boundary with validation
  const setClipBoundary = useCallback((boundary: Partial<ClipBoundary>) => {
    setState(prev => {
      const newBoundary = { ...prev.clipBoundary };

      if (boundary.startFrame !== undefined) {
        newBoundary.startFrame = Math.max(0, Math.min(boundary.startFrame, totalFrames));
        newBoundary.startTimestamp = frameToTimestamp(newBoundary.startFrame);
      }
      if (boundary.endFrame !== undefined) {
        newBoundary.endFrame = Math.max(0, Math.min(boundary.endFrame, totalFrames));
        newBoundary.endTimestamp = frameToTimestamp(newBoundary.endFrame);
      }

      // Ensure start < end
      if (newBoundary.startFrame >= newBoundary.endFrame) {
        return prev;
      }

      return {
        ...prev,
        clipBoundary: newBoundary,
      };
    });
  }, [totalFrames, frameToTimestamp]);

  // Handle trim handle drag
  const startDrag = useCallback((handle: 'start' | 'end') => {
    pushUndoState();
    setState(prev => ({ ...prev, isDragging: handle }));
  }, [pushUndoState]);

  const endDrag = useCallback(() => {
    setState(prev => ({ ...prev, isDragging: null }));
  }, []);

  // Update trim position during drag
  const updateDragPosition = useCallback((timestampMs: number) => {
    const frame = timestampToFrame(timestampMs);
    setState(prev => {
      if (!prev.isDragging) return prev;

      const newBoundary = { ...prev.clipBoundary };

      if (prev.isDragging === 'start') {
        newBoundary.startFrame = Math.max(0, Math.min(frame, prev.clipBoundary.endFrame - 1));
        newBoundary.startTimestamp = frameToTimestamp(newBoundary.startFrame);
      } else {
        newBoundary.endFrame = Math.max(prev.clipBoundary.startFrame + 1, Math.min(frame, totalFrames));
        newBoundary.endTimestamp = frameToTimestamp(newBoundary.endFrame);
      }

      return {
        ...prev,
        clipBoundary: newBoundary,
        previewTime: prev.isDragging === 'start' ? newBoundary.startTimestamp : newBoundary.endTimestamp,
      };
    });
  }, [timestampToFrame, frameToTimestamp, totalFrames]);

  // Select rep range
  const selectRepRange = useCallback((range: RepRangeSelection | null) => {
    pushUndoState();

    if (range === null) {
      setState(prev => ({ ...prev, selectedRepRange: null }));
      return;
    }

    // Adjust clip boundary to match rep range
    const startRep = repBoundaries[range.startRepIndex];
    const endRep = repBoundaries[range.endRepIndex];

    if (!startRep || !endRep) return;

    const startFrame = timestampToFrame(startRep.startTimestamp);
    const endFrame = timestampToFrame(endRep.endTimestamp);

    setState(prev => ({
      ...prev,
      selectedRepRange: range,
      clipBoundary: {
        startFrame,
        endFrame,
        startTimestamp: startRep.startTimestamp,
        endTimestamp: endRep.endTimestamp,
      },
    }));
  }, [repBoundaries, timestampToFrame, pushUndoState]);

  // Frame stepping for keyboard navigation
  const stepFrame = useCallback((direction: 'forward' | 'backward', handle: 'start' | 'end') => {
    pushUndoState();
    const step = direction === 'forward' ? 1 : -1;

    setState(prev => {
      const newBoundary = { ...prev.clipBoundary };

      if (handle === 'start') {
        newBoundary.startFrame = Math.max(0, Math.min(newBoundary.startFrame + step, newBoundary.endFrame - 1));
        newBoundary.startTimestamp = frameToTimestamp(newBoundary.startFrame);
      } else {
        newBoundary.endFrame = Math.max(newBoundary.startFrame + 1, Math.min(newBoundary.endFrame + step, totalFrames));
        newBoundary.endTimestamp = frameToTimestamp(newBoundary.endFrame);
      }

      return { ...prev, clipBoundary: newBoundary };
    });
  }, [frameToTimestamp, totalFrames, pushUndoState]);

  // Undo/Redo
  const undo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;

      const previousBoundary = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        clipBoundary: previousBoundary,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, prev.clipBoundary],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;

      const nextBoundary = prev.redoStack[prev.redoStack.length - 1];
      return {
        ...prev,
        clipBoundary: nextBoundary,
        redoStack: prev.redoStack.slice(0, -1),
        undoStack: [...prev.undoStack, prev.clipBoundary],
      };
    });
  }, []);

  // Set preview time
  const setPreviewTime = useCallback((time: number) => {
    setState(prev => ({ ...prev, previewTime: time }));
  }, []);

  // Computed values
  const clipDurationMs = useMemo(() => {
    return state.clipBoundary.endTimestamp - state.clipBoundary.startTimestamp;
  }, [state.clipBoundary]);

  const isValidDuration = useMemo(() => {
    return validateClipDuration(state.clipBoundary.startTimestamp, state.clipBoundary.endTimestamp);
  }, [state.clipBoundary, validateClipDuration]);

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  return {
    clipBoundary: state.clipBoundary,
    selectedRepRange: state.selectedRepRange,
    isDragging: state.isDragging,
    previewTime: state.previewTime,
    clipDurationMs,
    isValidDuration,
    canUndo,
    canRedo,
    setClipBoundary,
    startDrag,
    endDrag,
    updateDragPosition,
    selectRepRange,
    stepFrame,
    undo,
    redo,
    setPreviewTime,
    frameToTimestamp,
    timestampToFrame,
  };
}
