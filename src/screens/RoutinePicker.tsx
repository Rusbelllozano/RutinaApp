import { useNavigate } from 'react-router-dom'
import { useRoutineStore } from '../store/useRoutineStore'
import { useRotationStore } from '../store/useRotationStore'
import { useSessionTimerStore } from '../store/useSessionTimerStore'
import type { Routine } from '../types/routine'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { EditIcon } from '../components/ui/icons'

const ROUTINE_DOT_CLASS: Record<string, string> = {
  'base-a': 'bg-routine-a',
  'base-b': 'bg-routine-b',
  'base-c': 'bg-routine-c',
}

/** Muscle-group tags shown per card, matching docs/specs/04-routine-picker.md's "2-3 tags". */
const MAX_MUSCLE_GROUP_CHIPS = 3

/**
 * Rough duration estimate, since routines don't store one directly.
 * Heuristic: for every set, assume ~40s of work plus the exercise's own rest
 * between sets, then round to the nearest 5 minutes. This deliberately
 * ignores warmup/cooldown (those are separate screens in the session flow) —
 * it's just enough to compare routines at a glance, not a precise forecast.
 */
function estimateDurationMin(routine: Routine): number {
  const SECONDS_PER_SET = 40
  const totalSeconds = routine.exercises.reduce(
    (sum, ex) => sum + ex.sets * (SECONDS_PER_SET + ex.restSec),
    0,
  )
  const minutes = totalSeconds / 60
  return Math.max(5, Math.round(minutes / 5) * 5)
}

/** docs/specs/04-routine-picker.md: list every routine, tap to start it directly. */
export function RoutinePicker() {
  const navigate = useNavigate()
  const routines = useRoutineStore((s) => s.routines)
  const nextRoutineId = useRotationStore((s) => s.getNextRoutineId())

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <ScreenHeader title="Elegir rutina" />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-3">
        {routines.map((routine) => {
          const isNext = routine.id === nextRoutineId
          const dotClass = ROUTINE_DOT_CLASS[routine.id] ?? 'bg-accent'
          const durationMin = estimateDurationMin(routine)

          return (
            <Card key={routine.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
                  <span className="text-[15px] font-semibold text-text">{routine.name}</span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {isNext && (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
                      Siguiente
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Editar ${routine.name}`}
                    onClick={() => navigate(`/routines/${routine.id}/edit`)}
                    className="text-text-tertiary"
                  >
                    <EditIcon width={18} height={18} />
                  </button>
                </div>
              </div>

              {routine.muscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {routine.muscleGroups.slice(0, MAX_MUSCLE_GROUP_CHIPS).map((group) => (
                    <Chip key={group}>{group}</Chip>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 text-[13px] text-text-secondary">
                <span>
                  {routine.exercises.length}{' '}
                  {routine.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                </span>
                <span className="text-text-tertiary">·</span>
                <span className="font-mono">~{durationMin} min</span>
              </div>

              <Button
                onClick={() => {
                  useSessionTimerStore.getState().start(routine.id)
                  navigate(`/session-overview/${routine.id}`)
                }}
              >
                Empezar
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
