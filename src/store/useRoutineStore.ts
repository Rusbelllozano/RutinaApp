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
  /** Swaps `order` with the previous (-1) or next (1) exercise in the routine. No-op past either edge. */
  moveExerciseInRoutine: (routineId: string, exerciseId: string, direction: 1 | -1) => void
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

      moveExerciseInRoutine: (routineId, exerciseId, direction) =>
        set((s) => ({
          routines: s.routines.map((r) => {
            if (r.id !== routineId) return r
            const sorted = [...r.exercises].sort((a, b) => a.order - b.order)
            const idx = sorted.findIndex((re) => re.exerciseId === exerciseId)
            const swapIdx = idx + direction
            if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return r
            const a = sorted[idx]
            const b = sorted[swapIdx]
            return {
              ...r,
              exercises: r.exercises.map((re) => {
                if (re.exerciseId === a.exerciseId) return { ...re, order: b.order }
                if (re.exerciseId === b.exerciseId) return { ...re, order: a.order }
                return re
              }),
            }
          }),
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
