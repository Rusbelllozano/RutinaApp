import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedFromProgram } from '../data/seed'
import type { Routine, RoutineExercise } from '../types/routine'

interface RoutineState {
  routines: Routine[]
  addRoutine: (input: { name: string; muscleGroups: string[] }) => Routine
  /** Returns false without deleting when `id` is a base routine. */
  deleteRoutine: (id: string) => boolean
  addExerciseToRoutine: (routineId: string, routineExercise: RoutineExercise) => void
  removeExerciseFromRoutine: (routineId: string, exerciseId: string) => void
  updateRoutineExercise: (routineId: string, exerciseId: string, patch: Partial<RoutineExercise>) => void
  removeExerciseFromAllRoutines: (exerciseId: string) => void
  getRoutineById: (id: string) => Routine | undefined
}

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set, get) => ({
      routines: seedFromProgram().routines,

      addRoutine: (input) => {
        const routine: Routine = { id: crypto.randomUUID(), exercises: [], source: 'custom', ...input }
        set((s) => ({ routines: [...s.routines, routine] }))
        return routine
      },

      deleteRoutine: (id) => {
        const routine = get().routines.find((r) => r.id === id)
        if (!routine || routine.source === 'base') return false
        set((s) => ({ routines: s.routines.filter((r) => r.id !== id) }))
        return true
      },

      addExerciseToRoutine: (routineId, routineExercise) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId ? { ...r, exercises: [...r.exercises, routineExercise] } : r,
          ),
        })),

      removeExerciseFromRoutine: (routineId, exerciseId) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId
              ? { ...r, exercises: r.exercises.filter((re) => re.exerciseId !== exerciseId) }
              : r,
          ),
        })),

      updateRoutineExercise: (routineId, exerciseId, patch) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId
              ? {
                  ...r,
                  exercises: r.exercises.map((re) => (re.exerciseId === exerciseId ? { ...re, ...patch } : re)),
                }
              : r,
          ),
        })),

      removeExerciseFromAllRoutines: (exerciseId) =>
        set((s) => ({
          routines: s.routines.map((r) => ({
            ...r,
            exercises: r.exercises.filter((re) => re.exerciseId !== exerciseId),
          })),
        })),

      getRoutineById: (id) => get().routines.find((r) => r.id === id),
    }),
    { name: 'routine-app:routines' },
  ),
)
