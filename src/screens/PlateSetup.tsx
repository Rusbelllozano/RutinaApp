import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRoutineStore } from '../store/useRoutineStore'
import { useExerciseStore } from '../store/useExerciseStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { exercisesForSession } from '../lib/sessionRules'
import { equipmentLabels } from '../lib/equipmentLabels'
import { suggestProgression } from '../lib/progression'
import { resolveInitialLoad, withResolvedInitialWeight } from '../lib/initialLoad'
import { getBuildableWeights, getPlateBreakdown, clampToBuildable, describePlateBreakdown } from '../lib/plates'
import { getRoutineColor } from '../lib/routineColor'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { PlateDiagram } from '../components/ui/PlateDiagram'
import { SessionTimerBar } from '../components/SessionTimerBar'

/**
 * Second screen after "Empezar": how to load every bar/dumbbell before warming up, using
 * the same suggested-weight logic Session mode will use for the first set of each
 * exercise. Purely informational — weights are still adjustable live in Session mode.
 */
export function PlateSetup() {
  const navigate = useNavigate()
  const { routineId } = useParams<{ routineId: string }>()
  const [searchParams] = useSearchParams()
  const minimal = searchParams.get('minimal') === '1'
  const suffix = minimal ? '?minimal=1' : ''

  const routine = useRoutineStore((s) => (routineId ? s.getRoutineById(routineId) : undefined))
  const getExerciseById = useExerciseStore((s) => s.getExerciseById)
  const getProgressionLog = useHistoryStore((s) => s.getProgressionLog)
  const equipment = useSettingsStore((s) => s.equipment)

  if (!routine) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="text-text-secondary">No se encontró esa rutina.</div>
        <Button onClick={() => navigate('/')}>Volver a inicio</Button>
      </div>
    )
  }

  const weighted = exercisesForSession(routine, minimal)
    .map((re) => {
      const exercise = getExerciseById(re.exerciseId)
      const equipmentType = exercise?.equipmentType ?? 'bodyweight'
      if (equipmentType === 'bodyweight') return null
      const lastLog = getProgressionLog(re.exerciseId, routine.id)?.entry
      const initialLoad = resolveInitialLoad(routine, re, (id) => getExerciseById(id)?.equipmentType, equipment)
      const suggestion = suggestProgression(withResolvedInitialWeight(re, initialLoad), lastLog)
      const buildable = getBuildableWeights(equipmentType, equipment)
      const weight = clampToBuildable(suggestion.suggestedWeightKg, buildable)
      // First time on this slot: the prescribed plates, chosen to avoid inventory conflicts.
      const prescribed = !lastLog && initialLoad.breakdown?.totalKg === weight ? initialLoad.breakdown : undefined
      const breakdown =
        weight !== undefined ? (prescribed ?? getPlateBreakdown(equipmentType, weight, equipment)) : null
      return {
        exerciseId: re.exerciseId,
        name: re.nameOverride ?? exercise?.name ?? 'Ejercicio',
        equipmentType,
        weight,
        breakdown,
        keepPlates: re.keepPlates === true,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Armado de pesas" />
      <SessionTimerBar />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-2">
        <div className="text-sm text-text-secondary">
          Así arrancás cada peso hoy. Se van a ir ajustando ejercicio a ejercicio durante la sesión.
        </div>

        {weighted.length === 0 && <div className="text-sm text-text-tertiary">Esta sesión no usa discos.</div>}

        {weighted.map(({ exerciseId, name, equipmentType, weight, breakdown, keepPlates }) => (
          <div key={exerciseId} className="flex flex-col gap-2 rounded-2xl bg-bg-elevated p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[15px] font-medium text-text">{name}</div>
              <span className="text-xs text-text-secondary">{equipmentLabels[equipmentType]}</span>
            </div>
            {keepPlates && <div className="text-xs text-text-secondary">Misma carga que el anterior, sin tocar los discos.</div>}
            {breakdown ? (
              <div className="flex flex-col gap-2">
                <PlateDiagram breakdown={breakdown} colorClassName={getRoutineColor(routine.id).bg} />
                <div className="flex items-center justify-between text-xs text-text-tertiary">
                  <span>{describePlateBreakdown(breakdown)}</span>
                  <span className="font-mono text-text-secondary">{weight} kg</span>
                </div>
              </div>
            ) : weight !== undefined ? (
              <div className="text-sm text-danger">No armable con tu inventario actual ({weight} kg).</div>
            ) : (
              <div className="text-sm text-text-tertiary">Sin peso sugerido todavía — se define en la sesión.</div>
            )}
          </div>
        ))}

        <div className="mt-auto pt-2">
          <Button onClick={() => navigate(`/warmup/${routine.id}${suffix}`)}>Continuar</Button>
        </div>
      </div>
    </div>
  )
}
