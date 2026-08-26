import { program } from './program'
import type { Exercise, Routine, RoutineExercise } from '../types/routine'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface SeedResult {
  exercises: Exercise[]
  routines: Routine[]
}

/**
 * Derives the base exercise catalog and the 3 base routines from
 * src/data/program.ts. Deterministic ids (`base-<slug>`) so every store that
 * calls this independently agrees on the same ids without cross-importing —
 * see docs/specs/00-overview.md.
 */
export function seedFromProgram(): SeedResult {
  const exercises: Exercise[] = []
  const exerciseIdByName = new Map<string, string>()

  const routines: Routine[] = program.days.map((day) => {
    const routineExercises: RoutineExercise[] = day.exercises.map((ex) => {
      let exerciseId = exerciseIdByName.get(ex.name)
      if (!exerciseId) {
        exerciseId = `base-${slugify(ex.name)}`
        exerciseIdByName.set(ex.name, exerciseId)
        exercises.push({
          id: exerciseId,
          name: ex.name,
          equipmentType: ex.equipment,
          // The source program doesn't tag muscle groups per exercise, only per day —
          // inherit the day's tags as a reasonable default.
          muscleGroups: day.muscleGroups,
          defaultSets: ex.sets,
          defaultMinReps: ex.minReps,
          defaultMaxReps: ex.maxReps,
          defaultReps: ex.reps,
          defaultDurationSec: ex.durationSec,
          defaultRestSec: ex.restSec,
          video: ex.video,
          note: ex.note,
          alternative: ex.alternative,
          source: 'base',
        })
      }
      return {
        exerciseId,
        order: ex.order,
        sets: ex.sets,
        minReps: ex.minReps,
        maxReps: ex.maxReps,
        reps: ex.reps,
        durationSec: ex.durationSec,
        restSec: ex.restSec,
        initialWeightKg: ex.initialWeightKg,
        plateNote: ex.plateNote,
      }
    })
    return {
      id: `base-${day.id.toLowerCase()}`,
      name: day.name,
      muscleGroups: day.muscleGroups,
      exercises: routineExercises,
      source: 'base',
    }
  })

  return { exercises, routines }
}
