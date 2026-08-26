import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedFromProgram } from '../data/seed'
import type { Exercise, EquipmentType } from '../types/routine'
import { useRoutineStore } from './useRoutineStore'

export interface NewExerciseInput {
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
}

interface ExerciseState {
  exercises: Exercise[]
  addExercise: (input: NewExerciseInput) => Exercise
  updateExercise: (id: string, patch: Partial<NewExerciseInput>) => void
  /** Returns false without deleting when `id` is a base exercise — see docs/specs/02-exercise-library.md. */
  deleteExercise: (id: string) => boolean
  getExerciseById: (id: string) => Exercise | undefined
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set, get) => ({
      exercises: seedFromProgram().exercises,

      addExercise: (input) => {
        const exercise: Exercise = { id: crypto.randomUUID(), source: 'custom', ...input }
        set((s) => ({ exercises: [...s.exercises, exercise] }))
        return exercise
      },

      updateExercise: (id, patch) =>
        set((s) => ({ exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

      deleteExercise: (id) => {
        const exercise = get().exercises.find((e) => e.id === id)
        if (!exercise || exercise.source === 'base') return false
        set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) }))
        useRoutineStore.getState().removeExerciseFromAllRoutines(id)
        return true
      },

      getExerciseById: (id) => get().exercises.find((e) => e.id === id),
    }),
    { name: 'routine-app:exercises' },
  ),
)
