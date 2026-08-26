import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRotationStore } from '../store/useRotationStore'
import { useRoutineStore } from '../store/useRoutineStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useCalendarStore } from '../store/useCalendarStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionLabel } from '../components/ui/SectionLabel'
import { ClockIcon, DumbbellIcon, CheckIcon } from '../components/ui/icons'
import { todayISODate } from '../lib/date'
import { getRoutineColor } from '../lib/routineColor'
import type { Routine } from '../types/routine'

/**
 * Rough session-length heuristic (no timing data exists yet to calibrate against):
 * each working set costs ~40s of actual work/setup plus its prescribed rest, and the
 * warmup/cooldown checklists add a fixed ~9 min together. Rounded to the nearest 5 min
 * since it's explicitly an estimate, not a promise.
 */
const SECONDS_PER_SET = 40
const WARMUP_COOLDOWN_MIN = 9

function estimateDurationMin(routine: Routine, maxExercises?: number, maxSetsPerExercise?: number): number {
  const exercises = maxExercises ? routine.exercises.slice(0, maxExercises) : routine.exercises
  const totalSeconds = exercises.reduce((sum, re) => {
    const sets = maxSetsPerExercise ? Math.min(maxSetsPerExercise, re.sets) : re.sets
    return sum + sets * (SECONDS_PER_SET + re.restSec)
  }, 0)
  const totalMin = totalSeconds / 60 + WARMUP_COOLDOWN_MIN
  return Math.max(5, Math.round(totalMin / 5) * 5)
}

function daysSince(dateIso: string): number {
  const last = new Date(`${dateIso}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - last.getTime()) / 86_400_000)
}

/**
 * Home screen — docs/HANDOFF.md §5.1. "What's due, how long it'll take" at a glance.
 *
 * What's due today comes from the calendar (docs/specs/03-routine-calendar.md), not
 * straight from the rotation, so a routine planned by hand on the Calendar screen is
 * respected here. The first time a given day has no calendar entry yet, this screen
 * seeds one automatically from the rotation's "next up" — this is the one place that
 * auto-assignment happens; every other day keeps deriving its state from what's
 * actually stored (a log, or nothing), never overwriting it.
 */
export function Home() {
  const navigate = useNavigate()
  const nextRoutineId = useRotationStore((s) => s.getNextRoutineId())
  const getRoutineById = useRoutineStore((s) => s.getRoutineById)
  const logs = useHistoryStore((s) => s.logs)
  const getLogForDate = useHistoryStore((s) => s.getLogForDate)
  const today = todayISODate()
  const todayEntry = useCalendarStore((s) => s.getEntryForDate(today))
  const planRoutine = useCalendarStore((s) => s.planRoutine)

  const todayLog = getLogForDate(today)

  // Seed today's calendar entry from the rotation the first time it's blank — never
  // touches the rotation queue itself (only a logged session advances that, in
  // Session.tsx), and never overwrites an entry that's already there.
  useEffect(() => {
    if (!todayEntry && nextRoutineId && !todayLog) {
      planRoutine(today, nextRoutineId)
    }
  }, [todayEntry, nextRoutineId, todayLog, today, planRoutine])

  const isRestDay = todayEntry?.status === 'rest'
  const assignedRoutineId = todayEntry?.status === 'planned' ? todayEntry.routineId : nextRoutineId
  const routine = assignedRoutineId ? getRoutineById(assignedRoutineId) : undefined

  const lastLog = logs[logs.length - 1]
  const gapDays = lastLog ? daysSince(lastLog.date) : null
  const showNudge = gapDays !== null && gapDays >= 3
  // Sunday suggests rest but never blocks training (docs/HANDOFF.md §3.1).
  const isSunday = new Date().getDay() === 0
  const restNote = isRestDay
    ? 'Hoy planificaste descanso en el calendario — pero puedes entrenar si quieres.'
    : isSunday
      ? 'Hoy es domingo, un día habitual de descanso — pero puedes entrenar si quieres.'
      : null

  function start(minimal: boolean) {
    if (!routine) return
    navigate(`/warmup/${routine.id}${minimal ? '?minimal=1' : ''}`)
  }

  if (todayLog) {
    const trainedRoutine = getRoutineById(todayLog.routineId)
    return (
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-3 pt-7">
        <div className="text-xs font-semibold tracking-wider text-text-tertiary">RUTINA</div>
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-accent">
            <CheckIcon width={20} height={20} />
            <div className="text-lg font-semibold text-text">Ya entrenaste hoy</div>
          </div>
          {trainedRoutine && (
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${getRoutineColor(trainedRoutine.id).bg}`} />
              <div className="text-sm text-text-secondary">{trainedRoutine.name}</div>
            </div>
          )}
          <div className="text-sm text-text-secondary">
            {todayLog.exercises.length} ejercicios registrados
            {todayLog.isMinimalVersion ? ' · versión mínima' : ''}
          </div>
        </Card>
        <button
          type="button"
          className="py-1 text-center text-sm font-medium text-text-secondary"
          onClick={() => navigate('/calendar')}
        >
          Ver en el calendario
        </button>
        <button
          type="button"
          className="mt-auto py-1 text-center text-sm font-medium text-text-secondary"
          onClick={() => navigate('/routines')}
        >
          Entrenar otra rutina de todos modos
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-3 pt-7">
      <div className="text-xs font-semibold tracking-wider text-text-tertiary">RUTINA</div>

      {!routine ? (
        <Card>
          <div className="text-text-secondary">
            No hay ninguna rutina configurada todavía. Elige una para empezar.
          </div>
          <Button variant="secondary" size="md" className="mt-4" onClick={() => navigate('/routines')}>
            Elegir rutina
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <SectionLabel>HOY TOCA</SectionLabel>
            <Card className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${getRoutineColor(routine.id).bg}`} />
                <div className="text-lg font-semibold">{routine.name}</div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {routine.muscleGroups.map((mg) => (
                  <Chip key={mg}>{mg}</Chip>
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <DumbbellIcon width={16} height={16} />
                  {routine.exercises.length} ejercicios
                </span>
                <span className="flex items-center gap-1.5">
                  <ClockIcon width={16} height={16} />
                  <span className="font-mono">~{estimateDurationMin(routine)} min</span>
                </span>
              </div>
            </Card>
          </div>

          {showNudge && (
            <div className="text-sm text-text-secondary">
              Hace {gapDays} días de tu última sesión. La versión mínima toma 20 min.
            </div>
          )}

          {restNote && <div className="text-sm text-text-secondary">{restNote}</div>}

          <div className="mt-auto flex flex-col gap-3">
            <Button onClick={() => start(false)}>Empezar</Button>
            <Button variant="secondary" onClick={() => start(true)}>
              Versión mínima (20 min)
            </Button>
            <button
              type="button"
              className="py-1 text-center text-sm font-medium text-text-secondary"
              onClick={() => navigate('/routines')}
            >
              Elegir otra rutina
            </button>
          </div>
        </>
      )}
    </div>
  )
}
