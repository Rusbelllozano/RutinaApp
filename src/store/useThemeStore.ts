import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeId = 'claro' | 'oceano' | 'bosque' | 'atardecer' | 'violeta'

/** Fixed palette PRO mode applies regardless of the user's Base choice (docs/specs/05-pro-mode.md). */
export const PRO_THEME = 'pro'

interface ThemeState {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

/**
 * New installs start on the light "Claro" theme; someone who already used the app before
 * it existed (any other store saved) but never picked a theme keeps the dark "Océano"
 * default they've been seeing. An explicitly stored choice always wins via `persist`.
 */
function defaultTheme(): ThemeId {
  try {
    const hasExistingData =
      localStorage.getItem('routine-app:history') !== null || localStorage.getItem('routine-app:routines') !== null
    return hasExistingData ? 'oceano' : 'claro'
  } catch {
    return 'claro'
  }
}

/**
 * Base mode's color theme (background ramp + accent together), applied via a
 * `data-theme` attribute on <html> — see the `[data-theme="..."]` blocks in src/index.css
 * for the actual palettes. In PRO mode App.tsx applies `PRO_THEME` instead and this
 * choice is kept for when the user switches back.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: defaultTheme(),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'routine-app:theme' },
  ),
)

// Pin the default on first run, so a new install that later gains history doesn't flip
// from "Claro" to the existing-user default on its next load.
try {
  if (localStorage.getItem('routine-app:theme') === null) {
    useThemeStore.getState().setTheme(useThemeStore.getState().theme)
  }
} catch {
  // Storage unavailable — the in-memory default still applies for this session.
}
