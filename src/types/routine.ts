import type { EquipmentType } from './program'

export type { EquipmentType }

export interface Exercise {
  id: string
  name: string
  equipmentType: EquipmentType
  muscleGroups: string[]
  defaultSets: number
  defaultMinReps?: number
  defaultMaxReps?: number
  defaultReps?: string
  defaultDurationSec?: number | [number, number]
  defaultRestSec: number
  video?: string
  note?: string
  alternative?: string
  source: 'base' | 'custom'
}

export interface RoutineExercise {
  exerciseId: string
  order: number
  sets: number
  minReps?: number
  maxReps?: number
  reps?: string
  durationSec?: number | [number, number]
  restSec: number
  initialWeightKg?: number
  plateNote?: string
  /**
   * Plates per side (barbell / single dumbbell) or per end (each dumbbell of a pair) for
   * the first session. When `initialWeightKg` is unset, the starting weight is computed
   * from these and the bar weights in Settings — see docs/specs/05-pro-mode.md.
   */
  initialPlates?: number[]
  /** Same bar/dumbbell as the previous exercise using this implement, plates untouched. */
  keepPlates?: true
  /** Display name for this routine only, overriding the catalog entry's name. */
  nameOverride?: string
}

export type ProgramMode = 'base' | 'pro'

/** ISO weekday, Monday = 1 … Friday = 5 — the only days PRO routines are pinned to. */
export type ProWeekday = 1 | 2 | 3 | 4 | 5

export interface Routine {
  id: string
  name: string
  muscleGroups: string[]
  exercises: RoutineExercise[]
  source: 'base' | 'custom'
  /** Which program a seeded routine belongs to; unset for custom routines (shown in both modes). */
  mode?: ProgramMode
  /** PRO routines only: the weekday this routine is suggested on. */
  weekday?: ProWeekday
}

export interface RotationState {
  /** Routine ids in cyclic order. Only routines in this list participate in "what's next." */
  order: string[]
  nextIndex: number
}

export interface ScheduledRoutine {
  /** ISO date, e.g. "2026-08-27". */
  date: string
  status: 'planned' | 'rest'
  /** Set when status is 'planned'; absent for a rest day. */
  routineId?: string
}

export interface LoggedSet {
  setIndex: number
  weightKg?: number
  reps?: number
  durationSec?: number
}

export interface SessionLogExercise {
  exerciseId: string
  sets: LoggedSet[]
}

export interface SessionLog {
  id: string
  /** ISO date. */
  date: string
  routineId: string
  exercises: SessionLogExercise[]
  isMinimalVersion: boolean
  durationMin?: number
}
