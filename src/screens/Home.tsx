import { useNavigate } from 'react-router-dom'
import { useRotationStore } from '../store/useRotationStore'
import { useRoutineStore } from '../store/useRoutineStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionLabel } from '../components/ui/SectionLabel'
import { ClockIcon, DumbbellIcon } from '../components/ui/icons'
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

function routineColorClass(routineId: string): string {
  if (routineId === 'base-a') return 'bg-routine-a'
  if (routineId === 'base-b') return 'bg-routine-b'
  if (routineId === 'base-c') return 'bg-routine-c'
  return 'bg-accent'
}

function daysSince(dateIso: string): number {
  const last = new Date(`${dateIso}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - last.getTime()) / 86_400_000)
}

/** Home screen — docs/HANDOFF.md §5.1. "What's due, how long it'll take" at a glance. */
export function Home() {
  const navigate = useNavigate()
  const nextRoutineId = useRotationStore((s) => s.getNextRoutineId())
  const getRoutineById = useRoutineStore((s) => s.getRoutineById)
  const logs = useHistoryStore((s) => s.logs)

  const routine = nextRoutineId ? getRoutineById(nextRoutineId) : undefined
  const lastLog = logs[logs.length - 1]
  const gapDays = lastLog ? daysSince(lastLog.date) : null
  const showNudge = gapDays !== null && gapDays >= 3
  // Sunday suggests rest but never blocks training (docs/HANDOFF.md §3.1).
  const isSunday = new Date().getDay() === 0

  function start(minimal: boolean) {
    if (!routine) return
    navigate(`/warmup/${routine.id}${minimal ? '?minimal=1' : ''}`)
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
                <span className={`h-2.5 w-2.5 rounded-full ${routineColorClass(routine.id)}`} />
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

          {isSunday && (
            <div className="text-sm text-text-secondary">
              Hoy es domingo, un día habitual de descanso — pero puedes entrenar si quieres.
            </div>
          )}

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
