import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeId = 'oceano' | 'bosque' | 'atardecer' | 'violeta'

interface ThemeState {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

/**
 * Full color themes (background ramp + accent together), applied via a `data-theme`
 * attribute on <html> — see the `[data-theme="..."]` blocks in src/index.css for the
 * actual palettes. Routine A/B/C colors and the danger color stay fixed across themes;
 * only the neutral ramp and the accent change.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'oceano',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'routine-app:theme' },
  ),
)
