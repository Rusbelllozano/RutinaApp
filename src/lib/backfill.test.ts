import { describe, expect, it } from 'vitest'
import { prefillSessionExercises } from './backfill'
import { program } from '../data/program'
import { clampToBuildable, getBuildableWeights } from './plates'
import type { Exercise, Routine, SessionLog } from '../types/routine'

const exercises: Exercise[] = [
  { id: 'squat', name: 'Sentadilla', equipmentType: 'barbell', muscleGroups: [], defaultSets: 3, defaultRestSec: 90, source: 'custom', kind: 'strength' },
  { id: 'plank', name: 'Plancha', equipmentType: 'bodyweight', muscleGroups: [], defaultSets: 2, defaultDurationSec: 30, defaultRestSec: 30, source: 'custom' },
  { id: 'trote', name: 'Trote', equipmentType: 'bodyweight', muscleGroups: [], defaultSets: 1, defaultRestSec: 0, source: 'custom', kind: 'run' },
]
const buildable = (kg: number) => clampToBuildable(kg, getBuildableWeights('barbell', program.equipment))
const getExercise = (id: string) => exercises.find((e) => e.id === id)

const routine: Routine = {
  id: 'mix',
  name: 'Mixta',
  muscleGroups: [],
  source: 'custom',
  exercises: [
    { exerciseId: 'trote', order: 0, sets: 1, restSec: 0, targetKm: 2 },
    { exerciseId: 'squat', order: 1, sets: 3, minReps: 8, maxReps: 12, restSec: 90, initialWeightKg: 30 },
    { exerciseId: 'plank', order: 2, sets: 2, durationSec: 30, restSec: 30 },
  ],
}

const log = (date: string, exercises: SessionLog['exercises']): SessionLog => ({
  id: date,
  date,
  routineId: 'mix',
  isMinimalVersion: false,
  exercises,
})

describe('prefillSessionExercises', () => {
  it('fills every exercise from the routine when there is no history', () => {
    const out = prefillSessionExercises({ routine, logs: [], date: '2026-10-30', getExercise, equipment: program.equipment })
    expect(out.map((e) => e.exerciseId)).toEqual(['trote', 'squat', 'plank'])
    expect(out[0].sets).toEqual([{ setIndex: 0, distanceKm: 2, durationSec: undefined }])
    expect(out[1].sets).toHaveLength(3)
    expect(out[1].sets[0]).toMatchObject({ weightKg: buildable(30), reps: 8 })
    expect(out[2].sets[0]).toMatchObject({ durationSec: 30, reps: undefined })
  })

  it('only looks at logs before the backfilled date', () => {
    const logs = [
      log('2026-10-28', [{ exerciseId: 'squat', sets: [{ setIndex: 0, weightKg: 35, reps: 9 }] }]),
      log('2026-10-31', [{ exerciseId: 'squat', sets: [{ setIndex: 0, weightKg: 40, reps: 12 }] }]),
    ]
    const out = prefillSessionExercises({ routine, logs, date: '2026-10-30', getExercise, equipment: program.equipment })
    expect(out[1].sets[0]).toMatchObject({ weightKg: buildable(35), reps: 10 })
  })

  it('uses the last run when the slot has no target', () => {
    const noTarget: Routine = { ...routine, exercises: [{ exerciseId: 'trote', order: 0, sets: 1, restSec: 0 }] }
    const logs = [log('2026-10-25', [{ exerciseId: 'trote', sets: [{ setIndex: 0, distanceKm: 5, durationSec: 1800 }] }])]
    const out = prefillSessionExercises({ routine: noTarget, logs, date: '2026-10-30', getExercise, equipment: program.equipment })
    expect(out[0].sets[0]).toMatchObject({ distanceKm: 5, durationSec: 1800 })
  })
})
