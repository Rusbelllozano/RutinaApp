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
}

export interface Routine {
  id: string
  name: string
  muscleGroups: string[]
  exercises: RoutineExercise[]
  source: 'base' | 'custom'
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
