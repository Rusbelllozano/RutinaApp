import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutineStore } from '../store/useRoutineStore'
import { useRotationStore } from '../store/useRotationStore'
import { useSessionTimerStore } from '../store/useSessionTimerStore'
import { useModeStore } from '../store/useModeStore'
import { proRoutineForDate, routinesForMode } from '../lib/proSchedule'
import { getRoutineColor } from '../lib/routineColor'
import type { Routine } from '../types/routine'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { EditIcon } from '../components/ui/icons'

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
  // Run/cardio slots with a target time count that time instead of the per-set guess.
  const totalSeconds = routine.exercises.reduce(
    (sum, ex) => sum + (ex.targetMin !== undefined ? ex.targetMin * 60 : ex.sets * (SECONDS_PER_SET + ex.restSec)),
    0,
  )
  const minutes = totalSeconds / 60
  return Math.max(5, Math.round(minutes / 5) * 5)
}

/**
 * docs/specs/04-routine-picker.md: list every routine of the active mode (plus custom
 * ones), tap to start it directly. In PRO, starting another weekday's routine logs it
 * normally but never changes what Home suggests — that only follows the date
 * (docs/specs/05-pro-mode.md, "Routine picker in PRO").
 */
export function RoutinePicker() {
  const navigate = useNavigate()
  const mode = useModeStore((s) => s.mode)
  const allRoutines = useRoutineStore((s) => s.routines)
  const rotationNextId = useRotationStore((s) => s.getNextRoutineId())
  const routines = routinesForMode(allRoutines, mode)
  const addRoutine = useRoutineStore((s) => s.addRoutine)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const nextRoutineId = mode === 'pro' ? proRoutineForDate(allRoutines, new Date())?.id : rotationNextId

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <ScreenHeader title="Elegir rutina" />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-3">
        {routines.map((routine) => {
          const isNext = routine.id === nextRoutineId
          const dotClass = getRoutineColor(routine.id).bg
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
                      {mode === 'pro' ? 'Hoy' : 'Siguiente'}
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

        {creating ? (
          <Card className="flex flex-col gap-3">
            <div className="text-[15px] font-semibold text-text">Nueva rutina</div>
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ej. Trote"
              className="h-11 w-full rounded-xl border border-border bg-bg-elevated-2 px-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none"
            />
            <div className="text-xs text-text-tertiary">
              Las rutinas que creas no cambian la rotación: puedes hacerlas o registrarlas cualquier día.
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="md" className="flex-1" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button
                size="md"
                className="flex-1 disabled:opacity-40"
                disabled={newName.trim() === ''}
                onClick={() => {
                  const routine = addRoutine({ name: newName.trim(), muscleGroups: [] })
                  navigate(`/routines/${routine.id}/edit`)
                }}
              >
                Crear y agregar ejercicios
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="secondary" size="md" onClick={() => setCreating(true)}>
            + Nueva rutina
          </Button>
        )}
      </div>
    </div>
  )
}
