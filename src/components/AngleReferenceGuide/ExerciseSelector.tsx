'use client';

import { ExerciseType } from '@/types/angleHistory';
import { EXERCISE_IDEAL_FORMS } from './constants';
import { ANGLE_GUIDE_COLORS } from './colors';

interface ExerciseSelectorProps {
  selectedExercise: ExerciseType;
  onSelectExercise: (exercise: ExerciseType) => void;
  className?: string;
}

const EXERCISE_ICONS: Record<string, string> = {
  squat: '🏋️',
  pushup: '💪',
  lunge: '🚶',
  plank: '🧘',
  deadlift: '🏋️‍♂️',
};

export default function ExerciseSelector({
  selectedExercise,
  onSelectExercise,
  className = '',
}: ExerciseSelectorProps) {
  const exercises = Object.entries(EXERCISE_IDEAL_FORMS);

  return (
    <div
      className={`p-3 rounded-lg ${className}`}
      style={{ backgroundColor: ANGLE_GUIDE_COLORS.backgroundElevated }}
    >
      <label
        className="text-xs font-medium mb-2 block"
        style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}
      >
        운동 선택
      </label>
      <div className="flex flex-wrap gap-2">
        {exercises.map(([key, form]) => (
          <button
            key={key}
            onClick={() => onSelectExercise(key as ExerciseType)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2`}
            style={{
              backgroundColor:
                selectedExercise === key
                  ? ANGLE_GUIDE_COLORS.primary
                  : ANGLE_GUIDE_COLORS.surface,
              color:
                selectedExercise === key
                  ? '#ffffff'
                  : ANGLE_GUIDE_COLORS.textSecondary,
            }}
          >
            <span>{EXERCISE_ICONS[key] || '🏃'}</span>
            <span>{form.nameKo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
