import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCalendarStore } from '../store/useCalendarStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useRoutineStore } from '../store/useRoutineStore'
import { useExerciseStore } from '../store/useExerciseStore'
import type { ScheduledRoutine, SessionLog } from '../types/routine'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SectionLabel } from '../components/ui/SectionLabel'
import { ChevronLeftIcon, ChevronRightIcon, XIcon, CheckIcon, PlayIcon } from '../components/ui/icons'

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/**
 * Literal Tailwind class names (not built via template strings) so the
 * theme tokens from docs/DESIGN.md's routine palette are picked up by
 * Tailwind's scanner — same convention as PlateDiagram.
 */
const ROUTINE_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  'base-a': { bg: 'bg-routine-a', border: 'border-routine-a', text: 'text-routine-a' },
  'base-b': { bg: 'bg-routine-b', border: 'border-routine-b', text: 'text-routine-b' },
  'base-c': { bg: 'bg-routine-c', border: 'border-routine-c', text: 'text-routine-c' },
}
const DEFAULT_ROUTINE_COLOR = { bg: 'bg-accent', border: 'border-accent', text: 'text-accent' }

function getRoutineColor(routineId?: string) {
  if (!routineId) return DEFAULT_ROUTINE_COLOR
  return ROUTINE_COLOR[routineId] ?? DEFAULT_ROUTINE_COLOR
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local-date ISO formatting — avoids the UTC shift of Date#toISOString. */
function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const TODAY_ISO = toISODate(new Date())

interface DayCell {
  date: Date
  iso: string
}

/** 7-column month grid, Monday-first, padded with nulls to full weeks. */
function buildMonthGrid(year: number, month: number): (DayCell | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = (new Date(year, month, 1).getDay() + 6) % 7
  const cells: (DayCell | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    cells.push({ date, iso: toISODate(date) })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

type DayStatus =
  | { kind: 'done'; log: SessionLog }
  | { kind: 'planned'; entry: ScheduledRoutine }
  | { kind: 'rest'; entry: ScheduledRoutine }
  | { kind: 'blank' }

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${MONTH_NAMES[m - 1]} de ${y}`
}

export function Calendar() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [sheetDate, setSheetDate] = useState<string | null>(null)

  const scheduled = useCalendarStore((s) => s.scheduled)
  const planRoutine = useCalendarStore((s) => s.planRoutine)
  const markRest = useCalendarStore((s) => s.markRest)
  const clearDate = useCalendarStore((s) => s.clearDate)
  const logs = useHistoryStore((s) => s.logs)
  const routines = useRoutineStore((s) => s.routines)
  const getRoutineById = useRoutineStore((s) => s.getRoutineById)
  const getExerciseById = useExerciseStore((s) => s.getExerciseById)

  const logsByDate = useMemo(() => {
    const map = new Map<string, SessionLog>()
    for (const log of logs) map.set(log.date, log)
    return map
  }, [logs])

  const scheduledByDate = useMemo(() => {
    const map = new Map<string, ScheduledRoutine>()
    for (const entry of scheduled) map.set(entry.date, entry)
    return map
  }, [scheduled])

  function getDayStatus(iso: string): DayStatus {
    const log = logsByDate.get(iso)
    if (log) return { kind: 'done', log }
    const entry = scheduledByDate.get(iso)
    if (entry?.status === 'planned') return { kind: 'planned', entry }
    if (entry?.status === 'rest') return { kind: 'rest', entry }
    return { kind: 'blank' }
  }

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  function openDay(iso: string, status: DayStatus) {
    // A blank day before today has no data and nothing to plan retroactively —
    // rendered the same as any other blank day, just not tappable.
    if (status.kind === 'blank' && iso < TODAY_ISO) return
    setSheetDate(iso)
  }

  const sheetStatus = sheetDate ? getDayStatus(sheetDate) : null

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-3 pt-7">
      <div className="text-lg font-semibold">Calendario</div>

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => goToMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary"
          >
            <ChevronLeftIcon width={20} height={20} />
          </button>
          <div className="text-[15px] font-semibold capitalize">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => goToMonth(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary"
          >
            <ChevronRightIcon width={20} height={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="text-[11px] font-semibold text-text-tertiary">
              {label}
            </div>
          ))}

          {grid.map((cell, i) => {
            if (!cell) return <div key={i} />

            const status = getDayStatus(cell.iso)
            const isToday = cell.iso === TODAY_ISO
            const isPast = cell.iso < TODAY_ISO
            const isTappable = status.kind !== 'blank' || !isPast

            const routineId =
              status.kind === 'done' ? status.log.routineId : status.kind === 'planned' ? status.entry.routineId : undefined
            const color = getRoutineColor(routineId)

            let cellClasses = 'text-text-tertiary bg-transparent'
            if (status.kind === 'done') {
              cellClasses = `${color.bg} text-bg font-semibold`
            } else if (status.kind === 'planned') {
              cellClasses = `border ${color.border} ${color.text} font-medium`
            } else if (status.kind === 'rest') {
              cellClasses = 'bg-bg-elevated-2 text-text-secondary font-medium'
            } else if (!isPast) {
              cellClasses = 'text-text font-medium'
            }

            return (
              <button
                key={i}
                type="button"
                disabled={!isTappable}
                onClick={() => openDay(cell.iso, status)}
                className={`relative flex h-10 flex-col items-center justify-center rounded-xl text-[13px] ${cellClasses} ${
                  isToday ? 'ring-1 ring-accent' : ''
                } ${!isTappable ? 'cursor-default' : ''}`}
              >
                {cell.date.getDate()}
                {status.kind === 'done' && <CheckIcon width={10} height={10} className="absolute bottom-1" />}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="flex flex-col gap-2.5 p-4">
        <SectionLabel>Leyenda</SectionLabel>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {routines.map((routine) => {
            const color = getRoutineColor(routine.id)
            return (
              <div key={routine.id} className="flex items-center gap-1.5 text-[13px] text-text-secondary">
                <span className={`h-2.5 w-2.5 rounded-full ${color.bg}`} />
                {routine.name}
              </div>
            )
          })}
          <div className="flex items-center gap-1.5 text-[13px] text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full bg-bg-elevated-2" />
            Descanso
          </div>
        </div>
      </Card>

      {sheetDate && sheetStatus && (
        <div className="fixed inset-0 z-20 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-bg/80"
            onClick={() => setSheetDate(null)}
          />
          <div className="relative z-10 mx-auto w-full max-w-md rounded-t-2xl bg-bg-elevated p-5 pb-7">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-[13px] text-text-secondary capitalize">{formatLongDate(sheetDate)}</div>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setSheetDate(null)}
                className="text-text-secondary"
              >
                <XIcon width={20} height={20} />
              </button>
            </div>

            {sheetStatus.kind === 'done' ? (
              <DoneSheet log={sheetStatus.log} getRoutineById={getRoutineById} getExerciseById={getExerciseById} />
            ) : (
              <PlanSheet
                iso={sheetDate}
                status={sheetStatus}
                routines={routines}
                onPlan={(routineId) => {
                  planRoutine(sheetDate, routineId)
                  setSheetDate(null)
                }}
                onRest={() => {
                  markRest(sheetDate)
                  setSheetDate(null)
                }}
                onClear={() => {
                  clearDate(sheetDate)
                  setSheetDate(null)
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface DoneSheetProps {
  log: SessionLog
  getRoutineById: (id: string) => { name: string } | undefined
  getExerciseById: (id: string) => { name: string } | undefined
}

/** Read-only detail for a logged day — history editing from the calendar is out of scope. */
function DoneSheet({ log, getRoutineById, getExerciseById }: DoneSheetProps) {
  const routineName = getRoutineById(log.routineId)?.name ?? 'Rutina'
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="text-[17px] font-semibold">{routineName}</div>
        {log.isMinimalVersion && (
          <span className="rounded-full bg-bg-elevated-2 px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
            Versión mínima
          </span>
        )}
      </div>
      {log.durationMin != null && (
        <div className="text-[13px] text-text-secondary">Duración: {log.durationMin} min</div>
      )}
      <div className="flex flex-col gap-3">
        {log.exercises.map((ex) => (
          <div key={ex.exerciseId} className="flex flex-col gap-1">
            <div className="text-[14px] font-medium">{getExerciseById(ex.exerciseId)?.name ?? 'Ejercicio'}</div>
            <div className="flex flex-wrap gap-1.5">
              {ex.sets.map((set, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-bg-elevated-2 px-2 py-1 font-mono text-[12.5px] text-text-secondary"
                >
                  {set.weightKg != null ? `${set.weightKg}kg` : ''}
                  {set.weightKg != null && set.reps != null ? ' × ' : ''}
                  {set.reps != null ? `${set.reps}` : ''}
                  {set.durationSec != null ? `${set.durationSec}s` : ''}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface PlanSheetProps {
  iso: string
  status: Extract<DayStatus, { kind: 'planned' | 'rest' | 'blank' }>
  routines: { id: string; name: string }[]
  onPlan: (routineId: string) => void
  onRest: () => void
  onClear: () => void
}

/** Assign a routine or mark rest for a day that isn't logged yet — per docs/specs/03-routine-calendar.md. */
function PlanSheet({ iso, status, routines, onPlan, onRest, onClear }: PlanSheetProps) {
  const isToday = iso === TODAY_ISO
  const currentRoutineId = status.kind === 'planned' ? status.entry.routineId : undefined

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel>Asignar rutina</SectionLabel>
      <div className="flex flex-col gap-2">
        {routines.map((routine) => {
          const color = getRoutineColor(routine.id)
          const selected = routine.id === currentRoutineId
          return (
            <button
              key={routine.id}
              type="button"
              onClick={() => onPlan(routine.id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[14px] font-medium ${
                selected ? 'bg-bg-elevated-2 text-text' : 'bg-transparent text-text-secondary'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${color.bg}`} />
              {routine.name}
              {selected && <CheckIcon width={16} height={16} className="ml-auto text-accent" />}
            </button>
          )
        })}
      </div>

      <Button variant="secondary" size="md" onClick={onRest}>
        {status.kind === 'rest' ? 'Descanso ✓' : 'Marcar como descanso'}
      </Button>

      {status.kind !== 'blank' && (
        <Button variant="ghost" size="md" onClick={onClear}>
          Quitar
        </Button>
      )}

      {isToday && status.kind === 'planned' && (
        <Link to="/routines">
          <Button variant="primary" size="lg" className="mt-1 flex items-center justify-center gap-2">
            <PlayIcon width={18} height={18} />
            Empezar
          </Button>
        </Link>
      )}
    </div>
  )
}
