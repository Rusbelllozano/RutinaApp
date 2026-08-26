import { useMemo, useState } from 'react'
import { useExerciseStore } from '../store/useExerciseStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useRoutineStore } from '../store/useRoutineStore'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionLabel } from '../components/ui/SectionLabel'
import { getRoutineColor } from '../lib/routineColor'
import type { LoggedSet, SessionLog } from '../types/routine'

interface ChartPoint {
  date: string
  maxWeight: number
}

type Tab = 'exercise' | 'sessions'

const TABS: { id: Tab; label: string }[] = [
  { id: 'exercise', label: 'Por ejercicio' },
  { id: 'sessions', label: 'Sesiones completas' },
]

/** History/HANDOFF.md §5.6: per-exercise progress, and every completed session in full. */
export function History() {
  const [tab, setTab] = useState<Tab>('exercise')

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-3 pt-7">
      <div className="text-lg font-semibold">Historial</div>

      <div className="flex rounded-full bg-bg-elevated-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full px-2 py-2.5 text-[13px] font-semibold transition-colors ${
              tab === t.id ? 'bg-accent text-accent-ink' : 'text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'exercise' ? <ByExerciseTab /> : <SessionsTab />}
    </div>
  )
}

function ByExerciseTab() {
  const exercises = useExerciseStore((s) => s.exercises)
  const getLogsForExercise = useHistoryStore((s) => s.getLogsForExercise)
  const [selectedId, setSelectedId] = useState<string | undefined>(exercises[0]?.id)

  const activeId = selectedId ?? exercises[0]?.id
  const selectedExercise = exercises.find((e) => e.id === activeId)

  const logs = useMemo(
    () => (activeId ? getLogsForExercise(activeId) : []),
    [activeId, getLogsForExercise],
  )

  // Heaviest set of each session is the representative point for the progression line.
  const points: ChartPoint[] = logs
    .map((l) => ({
      date: l.date,
      maxWeight: Math.max(0, ...l.entry.sets.map((s) => s.weightKg ?? 0)),
    }))
    .filter((p) => p.maxWeight > 0)

  if (exercises.length === 0) {
    return <div className="text-text-secondary">Todavía no hay ejercicios en el catálogo.</div>
  }

  return (
    <>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
        {exercises.map((ex) => (
          <Chip
            key={ex.id}
            active={ex.id === activeId}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(ex.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedId(ex.id)
              }
            }}
            className="flex-shrink-0 cursor-pointer whitespace-nowrap"
          >
            {ex.name}
          </Chip>
        ))}
      </div>

      {selectedExercise && (
        <>
          <Card className="flex flex-col gap-4">
            <SectionLabel>Progreso de peso</SectionLabel>
            {points.length >= 2 ? (
              <WeightChart points={points} />
            ) : (
              <div className="text-sm text-text-tertiary">
                Todavía no hay suficientes sesiones con peso registrado para graficar.
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-3">
            <SectionLabel>Sesiones registradas</SectionLabel>
            {logs.length === 0 ? (
              <div className="text-sm text-text-tertiary">Sin sesiones registradas todavía.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {[...logs].reverse().map((log, i) => (
                  <Card key={`${log.date}-${i}`} className="flex flex-col gap-1">
                    <div className="text-xs text-text-secondary">{formatDate(log.date)}</div>
                    <div className="font-mono text-sm text-text">{formatSets(log.entry.sets)}</div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

/** Every logged session in full — date, routine, and every exercise's sets that day. */
function SessionsTab() {
  const logs = useHistoryStore((s) => s.logs)
  const getRoutineById = useRoutineStore((s) => s.getRoutineById)
  const getExerciseById = useExerciseStore((s) => s.getExerciseById)

  if (logs.length === 0) {
    return <div className="text-text-secondary">Todavía no completaste ninguna sesión.</div>
  }

  const sorted = [...logs].reverse()

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((log: SessionLog) => {
        const routine = getRoutineById(log.routineId)
        const totalSets = log.exercises.reduce((sum, e) => sum + e.sets.length, 0)
        return (
          <Card key={log.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${getRoutineColor(log.routineId).bg}`} />
                <div className="font-semibold">{routine?.name ?? 'Rutina eliminada'}</div>
              </div>
              <div className="text-xs text-text-tertiary">{formatDate(log.date)}</div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
              <span>{log.exercises.length} ejercicios</span>
              <span>{totalSets} series</span>
              {log.durationMin != null && <span>{log.durationMin} min</span>}
              {log.isMinimalVersion && <span className="text-accent">versión mínima</span>}
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              {log.exercises.map((e) => {
                const exercise = getExerciseById(e.exerciseId)
                return (
                  <div key={e.exerciseId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-secondary">{exercise?.name ?? 'Ejercicio eliminado'}</span>
                    <span className="flex-shrink-0 font-mono text-text">{formatSets(e.sets)}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/** Flat, muted line chart — plain inline SVG per docs/DESIGN.md, no charting library. */
function WeightChart({ points }: { points: ChartPoint[] }) {
  const width = 320
  const height = 140
  const padding = 10

  const weights = points.map((p) => p.maxWeight)
  const maxW = Math.max(...weights)
  const minW = Math.min(...weights)
  const range = maxW - minW || 1

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : padding + (i / (points.length - 1)) * (width - padding * 2)
    const y = height - padding - ((p.maxWeight - minW) / range) * (height - padding * 2)
    return { x, y }
  })

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const gridLines = [0.25, 0.5, 0.75]

  return (
    <div className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Gráfico de peso a lo largo del tiempo"
      >
        {gridLines.map((f) => (
          <line key={f} x1={0} x2={width} y1={height * f} y2={height * f} className="stroke-border" strokeWidth={1} />
        ))}
        <polyline
          points={polylinePoints}
          fill="none"
          className="stroke-accent"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={3} className="fill-accent" />
        ))}
      </svg>
      <div className="flex justify-between text-[11px] text-text-tertiary">
        <span>{formatDate(points[0].date)}</span>
        <span>{formatDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatSets(sets: LoggedSet[]): string {
  return sets
    .map((s) => {
      if (s.weightKg != null && s.reps != null) return `${s.weightKg}kg×${s.reps}`
      if (s.reps != null) return `${s.reps} reps`
      if (s.durationSec != null) return `${s.durationSec}s`
      return '—'
    })
    .join(', ')
}
