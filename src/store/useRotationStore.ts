import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RotationState {
  /** Base routine ids in cyclic order. Only these participate in "what's next." */
  order: string[]
  nextIndex: number
  getNextRoutineId: () => string | undefined
  /**
   * Advances the queue to continue after `routineId` — called once a session for it is
   * logged, regardless of whether it was the auto-suggested routine or manually picked
   * (docs/specs/04-routine-picker.md). A routine outside `order` (e.g. a custom one)
   * leaves the queue untouched.
   */
  advanceAfter: (routineId: string) => void
  resetRotation: () => void
}

const DEFAULT_ORDER = ['base-a', 'base-b', 'base-c']

export const useRotationStore = create<RotationState>()(
  persist(
    (set, get) => ({
      order: DEFAULT_ORDER,
      nextIndex: 0,

      getNextRoutineId: () => {
        const { order, nextIndex } = get()
        if (order.length === 0) return undefined
        return order[nextIndex % order.length]
      },

      advanceAfter: (routineId) => {
        const { order } = get()
        const idx = order.indexOf(routineId)
        if (idx === -1) return
        set({ nextIndex: (idx + 1) % order.length })
      },

      resetRotation: () => set({ order: DEFAULT_ORDER, nextIndex: 0 }),
    }),
    { name: 'routine-app:rotation' },
  ),
)
