import type { Equipment } from '../types/program'
import type { Exercise, Routine, SessionLog, SessionLogExercise } from '../types/routine'
import { clampToBuildable, getBuildableWeights } from './plates'
import { findLastExerciseLog, findProgressionLog, suggestProgression, suggestedReps } from './progression'
import { resolveInitialLoad, withResolvedInitialWeight } from './initialLoad'
import { sortedExercises } from './sessionRules'
import { exerciseKind, isSingleEntryKind } from './exerciseKind'

interface PrefillInput {
  routine: Routine
  /** Whole history; only logs dated before `date` are used, as if the session happened that day. */
  logs: SessionLog[]
  date: string
  getExercise: (id: string) => Exercise | undefined
  equipment: Equipment
}

/**
 * Draft entries for a session logged after the fact (docs/specs/07-exercise-types-and-backfill.md,
 * Part 2): every exercise of the routine filled with what session mode would have
 * suggested on `date` — strength sets at the progression weight/reps, isometric holds at
 * the prescribed time, run/cardio at the slot target or the last entry. The user edits
 * only what differs.
 */
export function prefillSessionExercises({ routine, logs, date, getExercise, equipment }: PrefillInput): SessionLogExercise[] {
  const before = logs.filter((l) => l.date < date)
  const equipmentTypeOf = (id: string) => getExercise(id)?.equipmentType

  return sortedExercises(routine).map((re) => {
    const exercise = getExercise(re.exerciseId)
    const kind = exerciseKind(exercise)

    if (isSingleEntryKind(kind)) {
      const last = findLastExerciseLog(before, re.exerciseId)?.entry.sets[0]
      const distanceKm = kind === 'mobility' ? undefined : (re.targetKm ?? last?.distanceKm)
      const durationSec = re.targetMin !== undefined ? re.targetMin * 60 : last?.durationSec
      return { exerciseId: re.exerciseId, sets: [{ setIndex: 0, distanceKm, durationSec }] }
    }

    const lastLog = findProgressionLog(before, re.exerciseId, routine.id)?.entry
    const equipmentType = exercise?.equipmentType ?? 'bodyweight'
    const showsWeight = equipmentType !== 'bodyweight'
    const load = resolveInitialLoad(routine, re, equipmentTypeOf, equipment)
    const suggestion = suggestProgression(withResolvedInitialWeight(re, load), lastLog)
    const weightKg = showsWeight
      ? clampToBuildable(suggestion.suggestedWeightKg, getBuildableWeights(equipmentType, equipment))
      : undefined
    const durationSec =
      re.durationSec === undefined
        ? undefined
        : Array.isArray(re.durationSec)
          ? Math.round((re.durationSec[0] + re.durationSec[1]) / 2)
          : re.durationSec

    const sets = Array.from({ length: re.sets }, (_, i) => ({
      setIndex: i,
      weightKg,
      reps: durationSec === undefined ? suggestedReps(re, lastLog, i, false) : undefined,
      durationSec,
    }))
    return { exerciseId: re.exerciseId, sets }
  })
}

/** True when no other log is dated after `date` — i.e. a backfill for it is the latest session. */
export function isLatestDate(logs: SessionLog[], date: string, ignoreId?: string): boolean {
  return logs.every((l) => l.id === ignoreId || l.date <= date)
}
