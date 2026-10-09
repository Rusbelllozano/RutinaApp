import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useThemeStore } from './store/useThemeStore'
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
  const theme = useThemeStore((s) => s.theme)

  // Applied to <html> so every `var(--color-*)` utility (see src/index.css's
  // `[data-theme="..."]` blocks) picks up the chosen palette, including outside the
  // router-rendered tree (e.g. the browser's own scrollbar via color-scheme).
  useEffect(() => {
    document.documentElement.dataset.theme = theme
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
