import type { EquipmentType } from './program'

export type { EquipmentType }

/**
 * What kind of work an exercise is (docs/specs/07-exercise-types-and-backfill.md).
 * `strength`/`isometric` log sets; `run`/`cardio`/`mobility` log one entry (distance
 * and/or time) and never get progression suggestions.
 */
export type ExerciseKind = 'strength' | 'isometric' | 'run' | 'cardio' | 'mobility'

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
  /** Unset on exercises saved before spec 07 — read it through `exerciseKind()`. */
  kind?: ExerciseKind
  /** Run/cardio only: default target distance copied into a routine slot. */
  defaultTargetKm?: number
  /** Run/cardio/mobility only: default target duration in minutes. */
  defaultTargetMin?: number
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
  /**
   * One-shot working weight for the next session of this slot, overriding what double
   * progression would suggest — set by an accepted AI analysis change
   * (docs/specs/06-ai-analysis.md) and cleared once that session is logged.
   */
  nextWeightKg?: number
  /** Run/cardio slots: informative target distance shown in session mode. */
  targetKm?: number
  /** Run/cardio/mobility slots: informative target duration in minutes. */
  targetMin?: number
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
  /** Run/cardio entries: distance covered. */
  distanceKm?: number
  /** Epoch ms when the set was confirmed. */
  completedAt?: number
  /** Rest actually taken before this set: rest timer start → its end or skip, pauses included. */
  restTakenSec?: number
}

/** Post-exercise effort rating — "Fácil" / "Justo" / "Al límite" in the UI. */
export type ExerciseEffort = 'easy' | 'right' | 'limit'

export interface SessionLogExercise {
  exerciseId: string
  sets: LoggedSet[]
  effort?: ExerciseEffort
}

export interface SessionLog {
  id: string
  /** ISO date. */
  date: string
  routineId: string
  exercises: SessionLogExercise[]
  isMinimalVersion: boolean
  durationMin?: number
  /** Epoch ms when the session timer started. */
  startedAt?: number
  /** Free-text note from the Summary screen (sleep, pain, equipment…). */
  note?: string
  /**
   * `manual` = logged after the fact from the calendar/history (no timer, no rest data;
   * editable and deletable). Unset on live sessions and on logs saved before spec 07.
   */
  source?: 'live' | 'manual'
}
