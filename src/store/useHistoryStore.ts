import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionLog, SessionLogExercise } from '../types/routine'
import { findLastExerciseLog, findProgressionLog, type LastExerciseLog } from '../lib/progression'
import { insertLogSorted, sortLogsByDate } from '../lib/historyOrder'

interface HistoryState {
  /**
   * Chronological by `date`, oldest first — every read here relies on it. `addLog`
   * inserts in place, so a session logged after the fact for an earlier date never
   * ends up "after" a newer one (docs/specs/07-exercise-types-and-backfill.md).
   */
  logs: SessionLog[]
  addLog: (input: Omit<SessionLog, 'id'>) => SessionLog
  /** Deletes a log entered after the fact (`source: 'manual'`). Live sessions stay. Returns whether it deleted. */
  deleteLog: (id: string) => boolean
  /** Post-session edits from Summary: the note and effort ratings. */
  updateLog: (id: string, patch: Partial<Omit<SessionLog, 'id'>>) => void
  /** Most recent entry for the exercise in any routine — what "La vez pasada" shows. */
  getLastLogForExercise: (exerciseId: string) => LastExerciseLog | undefined
  /** Same-routine entry first, any routine as fallback — what double progression uses. */
  getProgressionLog: (exerciseId: string, routineId: string) => LastExerciseLog | undefined
  getLogsForExercise: (exerciseId: string) => { date: string; entry: SessionLogExercise }[]
  getLogForDate: (date: string) => SessionLog | undefined
  /** Every session logged on `date`, in the order they were logged. */
  getLogsForDate: (date: string) => SessionLog[]
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (input) => {
        const log: SessionLog = { id: crypto.randomUUID(), ...input }
        set((s) => ({ logs: insertLogSorted(s.logs, log) }))
        return log
      },

      deleteLog: (id) => {
        const log = get().logs.find((l) => l.id === id)
        if (!log || log.source !== 'manual') return false
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }))
        return true
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

      getLogsForDate: (date) => get().logs.filter((l) => l.date === date),
    }),
    {
      name: 'routine-app:history',
      // v1: logs are kept sorted by date (spec 07). Older stores were append-only, which
      // was already date order unless a device clock jumped — sort once to be sure.
      version: 1,
      migrate: (persisted) => {
        const state = persisted as Partial<HistoryState>
        return { ...state, logs: sortLogsByDate(state.logs ?? []) } as HistoryState
      },
    },
  ),
)
