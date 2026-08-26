import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionLog, SessionLogExercise } from '../types/routine'

interface HistoryState {
  /** Chronological, oldest first — every read here assumes logs are appended in order. */
  logs: SessionLog[]
  addLog: (input: Omit<SessionLog, 'id'>) => SessionLog
  getLastLogForExercise: (exerciseId: string) => SessionLogExercise | undefined
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

      getLastLogForExercise: (exerciseId) => {
        const { logs } = get()
        for (let i = logs.length - 1; i >= 0; i--) {
          const found = logs[i].exercises.find((e) => e.exerciseId === exerciseId)
          if (found) return found
        }
        return undefined
      },

      getLogsForExercise: (exerciseId) =>
        get()
          .logs.filter((l) => l.exercises.some((e) => e.exerciseId === exerciseId))
          .map((l) => ({ date: l.date, entry: l.exercises.find((e) => e.exerciseId === exerciseId)! })),

      getLogForDate: (date) => get().logs.find((l) => l.date === date),
    }),
    { name: 'routine-app:history' },
  ),
)
