import type { ExerciseEffort } from '../types/routine'

/** Post-exercise effort ratings, in display order (docs/specs/06-ai-analysis.md). */
export const EFFORT_OPTIONS: { id: ExerciseEffort; label: string }[] = [
  { id: 'easy', label: 'Fácil' },
  { id: 'right', label: 'Justo' },
  { id: 'limit', label: 'Al límite' },
]

export function effortLabel(effort: ExerciseEffort): string {
  return EFFORT_OPTIONS.find((o) => o.id === effort)!.label
}
