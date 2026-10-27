import type { Equipment, EquipmentType } from '../types/program'
import type { Routine, RoutineExercise } from '../types/routine'
import { breakdownFromPlates, type PlateBreakdown } from './plates'
import { sortedExercises } from './sessionRules'

export interface InitialLoad {
  weightKg?: number
  /** The prescribed plate configuration, when the load was defined by plates rather than kg. */
  breakdown?: PlateBreakdown
}

/**
 * First-session load for one routine slot (docs/specs/05-pro-mode.md, "Loads are
 * computed"). An explicit `initialWeightKg` wins (Base data, or a value set in the routine
 * editor); otherwise it's computed from `initialPlates` and the current bar weights, so
 * changing the bar weight in Settings moves it. A `keepPlates` slot inherits the load of
 * the previous exercise in the routine that uses the same implement.
 */
export function resolveInitialLoad(
  routine: Routine,
  re: RoutineExercise,
  equipmentTypeOf: (exerciseId: string) => EquipmentType | undefined,
  equipment: Equipment,
): InitialLoad {
  if (re.initialWeightKg !== undefined) return { weightKg: re.initialWeightKg }
  const equipmentType = equipmentTypeOf(re.exerciseId)
  if (!equipmentType || equipmentType === 'bodyweight') return {}

  if (re.initialPlates) {
    const breakdown = breakdownFromPlates(equipmentType, re.initialPlates, equipment)
    return breakdown ? { weightKg: breakdown.totalKg, breakdown } : {}
  }

  if (re.keepPlates) {
    const previous = sortedExercises(routine)
      .filter((other) => other.order < re.order && equipmentTypeOf(other.exerciseId) === equipmentType)
      .at(-1)
    if (previous) return resolveInitialLoad(routine, previous, equipmentTypeOf, equipment)
  }
  return {}
}

/** `re` with its computed first-session weight filled in — what double progression falls back to. */
export function withResolvedInitialWeight(re: RoutineExercise, load: InitialLoad): RoutineExercise {
  return load.weightKg === undefined || re.initialWeightKg !== undefined ? re : { ...re, initialWeightKg: load.weightKg }
}
