import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProgramMode } from '../types/routine'

interface ModeState {
  mode: ProgramMode
  setMode: (mode: ProgramMode) => void
}

/**
 * Active program — Base (A→B→C queue) or PRO (Mon–Fri split tied to the weekday), see
 * docs/specs/05-pro-mode.md. Existing users have nothing stored here, so they land in
 * Base. Switching is gated (confirmation, locked mid-session) by the Home screen.
 */
export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'base',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'routine-app:mode' },
  ),
)
