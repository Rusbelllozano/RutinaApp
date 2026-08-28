import type { Routine, RoutineExercise } from '../types/routine'

/** Minimum-session mode (docs/HANDOFF.md §3.5): first 3 exercises, 2 sets each. */
export const MIN_SESSION_EXERCISES = 3
export const MIN_SESSION_SETS = 2

export function sortedExercises(routine: Routine): RoutineExercise[] {
  return [...routine.exercises].sort((a, b) => a.order - b.order)
}

/** Exercise list actually run this session — capped to the minimum-session subset when `minimal`. */
export function exercisesForSession(routine: Routine, minimal: boolean): RoutineExercise[] {
  const sorted = sortedExercises(routine)
  return minimal ? sorted.slice(0, MIN_SESSION_EXERCISES) : sorted
}

export function effectiveSetsFor(re: RoutineExercise, minimal: boolean): number {
  return minimal ? Math.min(MIN_SESSION_SETS, re.sets) : re.sets
}

export function repsRangeLabel(re: RoutineExercise): string {
  if (re.durationSec !== undefined) {
    return Array.isArray(re.durationSec) ? `${re.durationSec[0]}-${re.durationSec[1]} s` : `${re.durationSec} s`
  }
  if (re.minReps !== undefined && re.maxReps !== undefined) return `${re.minReps}-${re.maxReps} reps`
  if (re.reps) return re.reps
  return ''
}
