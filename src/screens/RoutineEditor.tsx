import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoutineStore } from '../store/useRoutineStore'
import { useExerciseStore } from '../store/useExerciseStore'
import { equipmentLabels } from '../lib/equipmentLabels'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Field } from '../components/ui/Field'
import { SectionLabel } from '../components/ui/SectionLabel'
import { Stepper } from '../components/ui/Stepper'
import { PlusIcon, XIcon, ChevronDownIcon } from '../components/ui/icons'
import type { Exercise, RoutineExercise } from '../types/routine'

const inputClass =
  'h-11 w-full rounded-xl border border-border bg-bg-elevated-2 px-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none'

interface RowProps {
  routineId: string
  re: RoutineExercise
  exercise: Exercise | undefined
  isFirst: boolean
  isLast: boolean
}

/** One editable exercise slot within a routine — sets/reps/rest/peso inicial, reorder, remove. */
function RoutineExerciseRow({ routineId, re, exercise, isFirst, isLast }: RowProps) {
  const updateRoutineExercise = useRoutineStore((s) => s.updateRoutineExercise)
  const moveExerciseInRoutine = useRoutineStore((s) => s.moveExerciseInRoutine)
  const removeExerciseFromRoutine = useRoutineStore((s) => s.removeExerciseFromRoutine)

  const [repsText, setRepsText] = useState(re.reps ?? '')
  const [weightText, setWeightText] = useState(re.initialWeightKg?.toString() ?? '')

  function patch(p: Partial<RoutineExercise>) {
    updateRoutineExercise(routineId, re.exerciseId, p)
  }

  function handleRemove() {
    if (!window.confirm(`¿Quitar "${exercise?.name ?? 'este ejercicio'}" de esta rutina?`)) return
    removeExerciseFromRoutine(routineId, re.exerciseId)
  }

  function handleWeightChange(text: string) {
    setWeightText(text)
    const n = text.trim() === '' ? undefined : Number(text)
    patch({ initialWeightKg: n !== undefined && Number.isNaN(n) ? undefined : n })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-bg-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-text">{exercise?.name ?? 'Ejercicio'}</div>
          <div className="mt-0.5 text-xs text-text-secondary">
            {equipmentLabels[exercise?.equipmentType ?? 'bodyweight']}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Subir"
            disabled={isFirst}
            onClick={() => moveExerciseInRoutine(routineId, re.exerciseId, -1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary disabled:opacity-30"
          >
            <ChevronDownIcon width={16} height={16} className="rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Bajar"
            disabled={isLast}
            onClick={() => moveExerciseInRoutine(routineId, re.exerciseId, 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary disabled:opacity-30"
          >
            <ChevronDownIcon width={16} height={16} />
          </button>
          <button
            type="button"
            aria-label={`Quitar ${exercise?.name ?? 'ejercicio'}`}
            onClick={handleRemove}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary"
          >
            <XIcon width={16} height={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Series">
          <Stepper value={re.sets} onChange={(v) => patch({ sets: v })} min={1} max={10} />
        </Field>

        <Field label="Descanso">
          <Stepper value={re.restSec} onChange={(v) => patch({ restSec: v })} min={0} max={300} step={15} suffix="s" />
        </Field>
      </div>

      {re.durationSec !== undefined ? (
        <Field label="Duración">
          {Array.isArray(re.durationSec) ? (
            <div className="flex items-center gap-2">
              <Stepper
                value={re.durationSec[0]}
                onChange={(v) => patch({ durationSec: [v, Math.max(v, (re.durationSec as [number, number])[1])] })}
                min={1}
                max={600}
                step={5}
                suffix="s"
              />
              <span className="text-text-tertiary">–</span>
              <Stepper
                value={re.durationSec[1]}
                onChange={(v) => patch({ durationSec: [Math.min(v, (re.durationSec as [number, number])[0]), v] })}
                min={1}
                max={600}
                step={5}
                suffix="s"
              />
            </div>
          ) : (
            <Stepper value={re.durationSec} onChange={(v) => patch({ durationSec: v })} min={1} max={600} step={5} suffix="s" />
          )}
        </Field>
      ) : re.minReps !== undefined && re.maxReps !== undefined ? (
        <Field label="Repeticiones">
          <div className="flex items-center gap-2">
            <Stepper
              value={re.minReps}
              onChange={(v) => patch({ minReps: v, maxReps: Math.max(v, re.maxReps!) })}
              min={1}
              max={50}
            />
            <span className="text-text-tertiary">–</span>
            <Stepper
              value={re.maxReps}
              onChange={(v) => patch({ maxReps: v, minReps: Math.min(v, re.minReps!) })}
              min={1}
              max={50}
            />
          </div>
        </Field>
      ) : (
        <Field label="Repeticiones">
          <input
            type="text"
            value={repsText}
            onChange={(e) => {
              setRepsText(e.target.value)
              patch({ reps: e.target.value.trim() || undefined })
            }}
            placeholder="ej. 10 por pierna, al fallo"
            className={inputClass}
          />
        </Field>
      )}

      {exercise?.equipmentType !== 'bodyweight' && (
        <Field label="Peso inicial (kg)">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={weightText}
            onChange={(e) => handleWeightChange(e.target.value)}
            placeholder="opcional"
            className={inputClass}
          />
        </Field>
      )}
    </div>
  )
}

/** Add-exercise-to-routine bottom sheet — picks from the catalog, excluding what's already in the routine. */
function AddExerciseSheet({
  candidates,
  onPick,
  onClose,
}: {
  candidates: Exercise[]
  onPick: (exercise: Exercise) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-bg/80" onClick={onClose} />
      <div className="relative z-10 mx-auto flex max-h-[75vh] w-full max-w-md flex-col rounded-t-2xl bg-bg-elevated p-5 pb-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionLabel>Agregar ejercicio</SectionLabel>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="text-text-secondary">
            <XIcon width={20} height={20} />
          </button>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {candidates.length === 0 && (
            <div className="py-4 text-center text-sm text-text-tertiary">
              Ya están todos los ejercicios del catálogo en esta rutina.
            </div>
          )}
          {candidates.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => onPick(exercise)}
              className="flex items-center gap-3 rounded-xl bg-bg-elevated-2 px-4 py-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-text">{exercise.name}</div>
                <div className="text-xs text-text-secondary">{equipmentLabels[exercise.equipmentType]}</div>
              </div>
              <PlusIcon width={18} height={18} className="flex-shrink-0 text-accent" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Edit an existing routine's exercises (add/remove/reorder) and their sets/reps/rest/peso inicial. */
export function RoutineEditor() {
  const navigate = useNavigate()
  const { routineId } = useParams<{ routineId: string }>()
  const routine = useRoutineStore((s) => (routineId ? s.getRoutineById(routineId) : undefined))
  const exercises = useExerciseStore((s) => s.exercises)
  const getExerciseById = useExerciseStore((s) => s.getExerciseById)
  const addExerciseToRoutine = useRoutineStore((s) => s.addExerciseToRoutine)
  const [addSheetOpen, setAddSheetOpen] = useState(false)

  if (!routine) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="text-text-secondary">No se encontró esa rutina.</div>
        <Button onClick={() => navigate('/routines')}>Volver a rutinas</Button>
      </div>
    )
  }

  const sorted = [...routine.exercises].sort((a, b) => a.order - b.order)
  const usedIds = new Set(sorted.map((re) => re.exerciseId))
  const candidates = exercises.filter((e) => !usedIds.has(e.id)).sort((a, b) => a.name.localeCompare(b.name, 'es'))

  function handlePick(exercise: Exercise) {
    const maxOrder = routine!.exercises.reduce((m, re) => Math.max(m, re.order), -1)
    addExerciseToRoutine(routine!.id, {
      exerciseId: exercise.id,
      order: maxOrder + 1,
      sets: exercise.defaultSets,
      minReps: exercise.defaultMinReps,
      maxReps: exercise.defaultMaxReps,
      reps: exercise.defaultReps,
      durationSec: exercise.defaultDurationSec,
      restSec: exercise.defaultRestSec,
    })
    setAddSheetOpen(false)
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <ScreenHeader title={routine.name} />
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-24 pt-2">
        {routine.muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {routine.muscleGroups.map((mg) => (
              <Chip key={mg}>{mg}</Chip>
            ))}
          </div>
        )}

        {sorted.length === 0 && (
          <div className="pt-6 text-center text-sm text-text-tertiary">Esta rutina todavía no tiene ejercicios.</div>
        )}

        {sorted.map((re, i) => (
          <RoutineExerciseRow
            key={re.exerciseId}
            routineId={routine.id}
            re={re}
            exercise={getExerciseById(re.exerciseId)}
            isFirst={i === 0}
            isLast={i === sorted.length - 1}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Agregar ejercicio"
        onClick={() => setAddSheetOpen(true)}
        className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-ink"
      >
        <PlusIcon width={24} height={24} />
      </button>

      {addSheetOpen && (
        <AddExerciseSheet candidates={candidates} onPick={handlePick} onClose={() => setAddSheetOpen(false)} />
      )}
    </div>
  )
}
