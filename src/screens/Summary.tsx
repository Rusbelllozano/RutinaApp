import { useLocation, useNavigate } from 'react-router-dom'
import { useExerciseStore } from '../store/useExerciseStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionLabel } from '../components/ui/SectionLabel'
import { ClockIcon } from '../components/ui/icons'
import type { SessionLog, SessionLogExercise } from '../types/routine'

/** Router `state` received from Cooldown — matches the shape Cooldown.tsx forwards. */
interface SummaryFlowState {
  sessionLog: SessionLog
}

function formatExerciseSets(entry: SessionLogExercise): string {
  return entry.sets
    .map((s) => {
      if (s.weightKg !== undefined && s.reps !== undefined) return `${s.weightKg}kg×${s.reps}`
      if (s.reps !== undefined) return `${s.reps} reps`
      if (s.durationSec !== undefined) return `${s.durationSec}s`
      return '—'
    })
    .join(', ')
}

/** Post-session recap — docs/HANDOFF.md §5's summary step. Reads the SessionLog just written to history. */
export function Summary() {
  const navigate = useNavigate()
  const location = useLocation()
  const getExerciseById = useExerciseStore((s) => s.getExerciseById)
  const logs = useHistoryStore((s) => s.logs)

  const stateLog = (location.state as SummaryFlowState | null)?.sessionLog
  // Refreshing mid-flow loses router state — fall back to the most recently written log.
  const sessionLog = stateLog ?? logs[logs.length - 1]

  if (!sessionLog) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="text-text-secondary">No hay una sesión reciente para mostrar.</div>
        <Button onClick={() => navigate('/')}>Volver a inicio</Button>
      </div>
    )
  }

  const totalSets = sessionLog.exercises.reduce((sum, e) => sum + e.sets.length, 0)

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-3 pt-7">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold tracking-wider text-text-tertiary">SESIÓN COMPLETADA</div>
        <div className="text-lg font-semibold">¡Buen trabajo!</div>
      </div>

      <Card className="flex flex-col gap-4">
        {sessionLog.isMinimalVersion && <Chip active>Versión mínima</Chip>}
        <div className="flex items-center gap-6 text-sm text-text-secondary">
          {sessionLog.durationMin !== undefined && (
            <span className="flex items-center gap-1.5">
              <ClockIcon width={16} height={16} />
              <span className="font-mono text-text">{sessionLog.durationMin} min</span>
            </span>
          )}
          <span>{sessionLog.exercises.length} ejercicios</span>
          <span>{totalSets} series</span>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <SectionLabel>DETALLE</SectionLabel>
        {sessionLog.exercises.map((entry) => {
          const exercise = getExerciseById(entry.exerciseId)
          return (
            <Card key={entry.exerciseId} className="flex flex-col gap-1">
              <div className="text-[15px] font-medium">{exercise?.name ?? 'Ejercicio'}</div>
              <div className="font-mono text-sm text-text-secondary">{formatExerciseSets(entry)}</div>
            </Card>
          )
        })}
      </div>

      <div className="mt-auto pt-2">
        <Button onClick={() => navigate('/')}>Volver a inicio</Button>
      </div>
    </div>
  )
}
