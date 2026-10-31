import type { Exercise, Routine } from '../types/routine'

/**
 * Seeded running entries (docs/specs/07-exercise-types-and-backfill.md): a "Trotar"
 * exercise of kind `run` — logged as km + time + effort — and a one-exercise "Trote"
 * routine. The routine has no `mode`, so it shows in Base and PRO and stays outside the
 * A-B-C rotation, like any custom routine. No target distance: the first run starts
 * blank and later ones pre-fill from the last one.
 */
export const cardioExercises: Exercise[] = [
  {
    id: 'base-trotar',
    name: 'Trotar',
    kind: 'run',
    equipmentType: 'bodyweight',
    muscleGroups: ['cardio', 'piernas'],
    defaultSets: 1,
    defaultRestSec: 0,
    source: 'base',
  },
]

export const cardioRoutines: Routine[] = [
  {
    id: 'cardio-trote',
    name: 'Trote',
    muscleGroups: ['cardio'],
    exercises: [{ exerciseId: 'base-trotar', order: 1, sets: 1, restSec: 0 }],
    source: 'base',
  },
]
