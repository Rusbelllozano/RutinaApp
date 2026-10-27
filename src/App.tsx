import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useThemeStore, PRO_THEME } from './store/useThemeStore'
import { useModeStore } from './store/useModeStore'
import { Home } from './screens/Home'
import { Warmup } from './screens/Warmup'
import { Session } from './screens/Session'
import { Cooldown } from './screens/Cooldown'
import { Summary } from './screens/Summary'
import { History } from './screens/History'
import { Settings } from './screens/Settings'
import { Calculator } from './screens/Calculator'
import { ExerciseLibrary } from './screens/ExerciseLibrary'
import { AddExercise } from './screens/AddExercise'
import { Calendar } from './screens/Calendar'
import { RoutinePicker } from './screens/RoutinePicker'
import { RoutineEditor } from './screens/RoutineEditor'
import { SessionOverview } from './screens/SessionOverview'
import { PlateSetup } from './screens/PlateSetup'

function App() {
  const baseTheme = useThemeStore((s) => s.theme)
  const mode = useModeStore((s) => s.mode)
  // PRO always uses its own fixed palette; Base uses the user's choice, which stays
  // stored while in PRO (docs/specs/05-pro-mode.md, "Theme per mode").
  const theme = mode === 'pro' ? PRO_THEME : baseTheme
  const isFirstThemeApply = useRef(true)

  // Applied to <html> so every `var(--color-*)` utility (see src/index.css's
  // `[data-theme="..."]` blocks) picks up the chosen palette, including outside the
  // router-rendered tree (e.g. the browser's own scrollbar via color-scheme).
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    // Keep the installed PWA's status bar in step with the page background.
    const bg = getComputedStyle(root).getPropertyValue('--color-bg').trim()
    if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
    if (isFirstThemeApply.current) {
      isFirstThemeApply.current = false
      return
    }
    root.classList.add('theme-switching')
    const t = setTimeout(() => root.classList.remove('theme-switching'), 250)
    return () => clearTimeout(t)
  }, [theme])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg text-text">
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="history" element={<History />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="session-overview/:routineId" element={<SessionOverview />} />
          <Route path="plate-setup/:routineId" element={<PlateSetup />} />
          <Route path="warmup/:routineId" element={<Warmup />} />
          <Route path="session/:routineId" element={<Session />} />
          <Route path="cooldown" element={<Cooldown />} />
          <Route path="summary" element={<Summary />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="exercises" element={<ExerciseLibrary />} />
          <Route path="exercises/new" element={<AddExercise />} />
          <Route path="routines" element={<RoutinePicker />} />
          <Route path="routines/:routineId/edit" element={<RoutineEditor />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
