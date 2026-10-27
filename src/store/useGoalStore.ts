import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CycleGoal {
  /** ISO date, inclusive. */
  startDate: string
  /** ISO date, inclusive. */
  endDate: string
  targetSessions: number
}

/** The user's first dated cycle (docs/specs/05-pro-mode.md, "Cycle goal"). */
export const DEFAULT_GOAL: CycleGoal = { startDate: '2026-10-27', endDate: '2026-12-15', targetSessions: 30 }

interface GoalState {
  goal: CycleGoal | null
  setGoal: (goal: CycleGoal | null) => void
}

/** Shown as a progress block on PRO's Home; editable in Settings so the next cycle needs no code change. */
export const useGoalStore = create<GoalState>()(
  persist(
    (set) => ({
      goal: DEFAULT_GOAL,
      setGoal: (goal) => set({ goal }),
    }),
    { name: 'routine-app:goal' },
  ),
)
