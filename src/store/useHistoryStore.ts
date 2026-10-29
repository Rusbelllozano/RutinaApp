import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionLog, SessionLogExercise } from '../types/routine'
import { findLastExerciseLog, findProgressionLog, type LastExerciseLog } from '../lib/progression'

interface HistoryState {
  /** Chronological, oldest first — every read here assumes logs are appended in order. */
  logs: SessionLog[]
  addLog: (input: Omit<SessionLog, 'id'>) => SessionLog
  /** Post-session edits from Summary: the note and effort ratings. */
  updateLog: (id: string, patch: Partial<Omit<SessionLog, 'id'>>) => void
  /** Most recent entry for the exercise in any routine — what "La vez pasada" shows. */
  getLastLogForExercise: (exerciseId: string) => LastExerciseLog | undefined
  /** Same-routine entry first, any routine as fallback — what double progression uses. */
  getProgressionLog: (exerciseId: string, routineId: string) => LastExerciseLog | undefined
  getLogsForExercise: (exerciseId: string) => { date: string; entry: SessionLogExercise }[]
  getLogForDate: (date: string) => SessionLog | undefined
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (input) => {
        const log: SessionLog = { id: crypto.randomUUID(), ...input }
        set((s) => ({ logs: [...s.logs, log] }))
        return log
      },

      updateLog: (id, patch) => set((s) => ({ logs: s.logs.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

      getLastLogForExercise: (exerciseId) => findLastExerciseLog(get().logs, exerciseId),

      getProgressionLog: (exerciseId, routineId) => findProgressionLog(get().logs, exerciseId, routineId),

      getLogsForExercise: (exerciseId) =>
        get()
          .logs.filter((l) => l.exercises.some((e) => e.exerciseId === exerciseId))
          .map((l) => ({ date: l.date, entry: l.exercises.find((e) => e.exerciseId === exerciseId)! })),

      // Logs are appended chronologically, so the last match for a date is the most
      // recent session logged that day (there can be more than one — see
      // Home.tsx's "entrenar otra rutina de todos modos").
      getLogForDate: (date) => get().logs.findLast((l) => l.date === date),
    }),
    { name: 'routine-app:history' },
  ),
)
