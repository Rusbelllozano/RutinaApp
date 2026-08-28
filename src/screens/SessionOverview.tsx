import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRoutineStore } from '../store/useRoutineStore'
import { useExerciseStore } from '../store/useExerciseStore'
import { exercisesForSession, effectiveSetsFor, repsRangeLabel } from '../lib/sessionRules'
import { equipmentLabels } from '../lib/equipmentLabels'
import { getRoutineColor } from '../lib/routineColor'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { SessionTimerBar } from '../components/SessionTimerBar'

/**
 * First screen after "Empezar": the full exercise list for this session before touching
 * any weight — what's coming, how many series, and what equipment each one needs.
 */
export function SessionOverview() {
  const navigate = useNavigate()
  const { routineId } = useParams<{ routineId: string }>()
  const [searchParams] = useSearchParams()
  const minimal = searchParams.get('minimal') === '1'
  const suffix = minimal ? '?minimal=1' : ''

  const routine = useRoutineStore((s) => (routineId ? s.getRoutineById(routineId) : undefined))
  const getExerciseById = useExerciseStore((s) => s.getExerciseById)

  if (!routine) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="text-text-secondary">No se encontró esa rutina.</div>
        <Button onClick={() => navigate('/')}>Volver a inicio</Button>
      </div>
    )
  }

  const exercises = exercisesForSession(routine, minimal)

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Ejercicios de la sesión" />
      <SessionTimerBar />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${getRoutineColor(routine.id).bg}`} />
          <div className="text-lg font-semibold">{routine.name}</div>
          {minimal && <Chip active>Mínima</Chip>}
        </div>

        <div className="flex flex-col gap-2">
          {exercises.map((re, i) => {
            const exercise = getExerciseById(re.exerciseId)
            const sets = effectiveSetsFor(re, minimal)
            return (
              <div key={re.exerciseId} className="flex items-center gap-3 rounded-2xl bg-bg-elevated p-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated-2 font-mono text-xs text-text-secondary">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-text">{exercise?.name ?? 'Ejercicio'}</div>
                  <div className="mt-0.5 text-xs text-text-secondary">
                    {sets} series × {repsRangeLabel(re)}
                  </div>
                </div>
                <Chip className="flex-shrink-0">{equipmentLabels[exercise?.equipmentType ?? 'bodyweight']}</Chip>
              </div>
            )
          })}
        </div>

        <div className="mt-auto pt-2">
          <Button onClick={() => navigate(`/plate-setup/${routine.id}${suffix}`)}>Continuar</Button>
        </div>
      </div>
    </div>
  )
}
