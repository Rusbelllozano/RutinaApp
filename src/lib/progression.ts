import type { RoutineExercise, SessionLog, SessionLogExercise } from '../types/routine'

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
  // A weight set by an accepted AI analysis change wins for one session — no jump offer.
  if (routineExercise.nextWeightKg !== undefined) {
    return { suggestedWeightKg: routineExercise.nextWeightKg, atTopOfRange: false, increasedWeightKg: undefined }
  }
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

/** Double progression's "+1 rep per set per week", read off the same set index last time. */
export function suggestedReps(
  re: RoutineExercise,
  lastLog: SessionLogExercise | undefined,
  setIndex: number,
  progressionAccepted: boolean,
): number | undefined {
  if (re.maxReps === undefined) {
    const last = lastLog?.sets[setIndex]?.reps
    if (last !== undefined) return last
    const match = re.reps?.match(/\d+/)
    return match ? Number(match[0]) : undefined
  }
  if (progressionAccepted) return re.minReps
  const last = lastLog?.sets[setIndex]?.reps
  if (last === undefined) return re.minReps
  return Math.min(re.maxReps, last + 1)
}

export interface LastExerciseLog {
  entry: SessionLogExercise
  routineId: string
  date: string
}

/** Most recent logged entry for `exerciseId`, optionally restricted to one routine. `logs` is oldest-first. */
export function findLastExerciseLog(
  logs: SessionLog[],
  exerciseId: string,
  routineId?: string,
): LastExerciseLog | undefined {
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i]
    if (routineId !== undefined && log.routineId !== routineId) continue
    const entry = log.exercises.find((e) => e.exerciseId === exerciseId)
    if (entry) return { entry, routineId: log.routineId, date: log.date }
  }
  return undefined
}

/**
 * The log double progression compares against (docs/specs/05-pro-mode.md, "Changes to
 * earlier specs"): the last time this exercise was done **in this routine**, falling
 * back to the last time in any routine. PRO repeats some exercises at deliberately
 * different loads in one week (glute bridge 31 kg Tue / 41 kg Fri), so each slot follows
 * its own history; the fallback keeps progress continuous across modes (the first PRO
 * squat continues from the last Base squat).
 */
export function findProgressionLog(
  logs: SessionLog[],
  exerciseId: string,
  routineId: string,
): LastExerciseLog | undefined {
  return findLastExerciseLog(logs, exerciseId, routineId) ?? findLastExerciseLog(logs, exerciseId)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
