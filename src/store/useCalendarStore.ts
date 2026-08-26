import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduledRoutine } from '../types/routine'

interface CalendarState {
  /** Future-facing planning entries only — past history comes from useHistoryStore, see docs/specs/03-routine-calendar.md. */
  scheduled: ScheduledRoutine[]
  planRoutine: (date: string, routineId: string) => void
  markRest: (date: string) => void
  clearDate: (date: string) => void
  getEntryForDate: (date: string) => ScheduledRoutine | undefined
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      scheduled: [],

      planRoutine: (date, routineId) =>
        set((s) => ({
          scheduled: [...s.scheduled.filter((e) => e.date !== date), { date, status: 'planned', routineId }],
        })),

      markRest: (date) =>
        set((s) => ({
          scheduled: [...s.scheduled.filter((e) => e.date !== date), { date, status: 'rest' }],
        })),

      clearDate: (date) => set((s) => ({ scheduled: s.scheduled.filter((e) => e.date !== date) })),

      getEntryForDate: (date) => get().scheduled.find((e) => e.date === date),
    }),
    { name: 'routine-app:calendar' },
  ),
)
