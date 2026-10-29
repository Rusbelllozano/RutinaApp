import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useExerciseStore } from '../store/useExerciseStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionLabel } from '../components/ui/SectionLabel'
import { ClockIcon } from '../components/ui/icons'
import { EFFORT_OPTIONS } from '../lib/effort'
import type { ExerciseEffort, SessionLog, SessionLogExercise } from '../types/routine'

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
  const updateLog = useHistoryStore((s) => s.updateLog)

  const stateLog = (location.state as SummaryFlowState | null)?.sessionLog
  // Refreshing mid-flow loses router state — fall back to the most recently written log.
  // Read the stored copy so effort/note edits made here show up immediately.
  const sessionLog = (stateLog && logs.find((l) => l.id === stateLog.id)) ?? stateLog ?? logs[logs.length - 1]
  const [note, setNote] = useState(sessionLog?.note ?? '')

  if (!sessionLog) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="text-text-secondary">No hay una sesión reciente para mostrar.</div>
        <Button onClick={() => navigate('/')}>Volver a inicio</Button>
      </div>
    )
  }

  const totalSets = sessionLog.exercises.reduce((sum, e) => sum + e.sets.length, 0)

  function setEffort(exerciseId: string, effort: ExerciseEffort) {
    updateLog(sessionLog.id, {
      exercises: sessionLog.exercises.map((e) =>
        e.exerciseId === exerciseId ? { ...e, effort: e.effort === effort ? undefined : effort } : e,
      ),
    })
  }

  function saveNote() {
    const trimmed = note.trim()
    if (trimmed !== (sessionLog.note ?? '')) updateLog(sessionLog.id, { note: trimmed || undefined })
  }

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
              <div className="mt-2 flex gap-2">
                {EFFORT_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={entry.effort === o.id}
                    onClick={() => setEffort(entry.exerciseId, o.id)}
                  >
                    <Chip active={entry.effort === o.id}>{o.label}</Chip>
                  </button>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>NOTA (OPCIONAL)</SectionLabel>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          rows={3}
          placeholder="Cómo dormiste, molestias, algo del equipo…"
          className="w-full rounded-xl border border-border bg-bg-elevated-2 px-3 py-2.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none"
        />
      </div>

      <div className="mt-auto pt-2">
        <Button
          onClick={() => {
            saveNote()
            navigate('/')
          }}
        >
          Volver a inicio
        </Button>
      </div>
    </div>
  )
}
