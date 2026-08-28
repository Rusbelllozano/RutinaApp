import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SessionTimerState {
  routineId: string | null
  /** Epoch ms when the current session started (set by `start`). */
  startedAt: number | null
  /** Epoch ms when the current pause began; null while running. */
  pausedAt: number | null
  /** Total ms spent paused so far, across completed pause segments. */
  accumulatedPausedMs: number
  start: (routineId: string) => void
  pause: () => void
  resume: () => void
  reset: () => void
}

/**
 * Session-wide elapsed-time tracker — starts when the user taps "Empezar" (Home or the
 * routine picker), persists across the whole flow (overview, plate setup, warmup,
 * session) so a reload mid-workout doesn't lose it, and resets once the session is
 * logged. Pausing freezes the elapsed count without losing the start time.
 */
export const useSessionTimerStore = create<SessionTimerState>()(
  persist(
    (set) => ({
      routineId: null,
      startedAt: null,
      pausedAt: null,
      accumulatedPausedMs: 0,

      start: (routineId) => set({ routineId, startedAt: Date.now(), pausedAt: null, accumulatedPausedMs: 0 }),

      pause: () =>
        set((s) => (s.startedAt === null || s.pausedAt !== null ? s : { pausedAt: Date.now() })),

      resume: () =>
        set((s) =>
          s.pausedAt === null
            ? s
            : { pausedAt: null, accumulatedPausedMs: s.accumulatedPausedMs + (Date.now() - s.pausedAt) },
        ),

      reset: () => set({ routineId: null, startedAt: null, pausedAt: null, accumulatedPausedMs: 0 }),
    }),
    { name: 'routine-app:session-timer' },
  ),
)

/** Active (non-paused) elapsed milliseconds since `start` — frozen while paused, 0 before any session starts. */
export function computeElapsedMs(state: {
  startedAt: number | null
  pausedAt: number | null
  accumulatedPausedMs: number
}): number {
  if (state.startedAt === null) return 0
  const now = Date.now()
  const pausedMs = state.accumulatedPausedMs + (state.pausedAt !== null ? now - state.pausedAt : 0)
  return Math.max(0, now - state.startedAt - pausedMs)
}
