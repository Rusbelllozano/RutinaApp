import type { RoutineExercise } from '../types/routine'
import type { SessionLogExercise } from '../types/routine'

export const MIN_WEIGHT_JUMP_KG = 2.5

export interface ProgressionSuggestion {
  /** Weight to suggest for the next session. Falls back to the routine's initial weight when there's no history. */
  suggestedWeightKg: number | undefined
  /** True when every logged set last time hit the top of the rep range — the trigger for suggesting a jump. */
  atTopOfRange: boolean
  /** Weight to offer if the user accepts the +2.5 kg suggestion (only set when atTopOfRange). */
  increasedWeightKg: number | undefined
}

/**
 * Double progression (docs/HANDOFF.md §3.2): add 1 rep per set per week; once every set
 * hits the top of the rep range, suggest +2.5 kg and back to the bottom of the range.
 * This never applies the increase automatically — callers show Accept/Not yet.
 */
export function suggestProgression(
  routineExercise: RoutineExercise,
  lastLog: SessionLogExercise | undefined,
): ProgressionSuggestion {
  if (!lastLog || lastLog.sets.length === 0) {
    return {
      suggestedWeightKg: routineExercise.initialWeightKg,
      atTopOfRange: false,
      increasedWeightKg: undefined,
    }
  }

  const lastWeight = lastLog.sets[lastLog.sets.length - 1]?.weightKg ?? routineExercise.initialWeightKg
  const { maxReps } = routineExercise

  const atTopOfRange =
    maxReps !== undefined &&
    lastLog.sets.length >= routineExercise.sets &&
    lastLog.sets.every((s) => (s.reps ?? 0) >= maxReps)

  return {
    suggestedWeightKg: lastWeight,
    atTopOfRange,
    increasedWeightKg: atTopOfRange && lastWeight !== undefined ? round2(lastWeight + MIN_WEIGHT_JUMP_KG) : undefined,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
