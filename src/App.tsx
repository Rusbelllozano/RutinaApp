import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
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

function App() {
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
          <Route path="warmup" element={<Warmup />} />
          <Route path="session/:routineId" element={<Session />} />
          <Route path="cooldown" element={<Cooldown />} />
          <Route path="summary" element={<Summary />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="exercises" element={<ExerciseLibrary />} />
          <Route path="exercises/new" element={<AddExercise />} />
          <Route path="routines" element={<RoutinePicker />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
