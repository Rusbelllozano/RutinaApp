import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExerciseStore } from '../store/useExerciseStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { getBuildableWeights, isBuildable, nearestBuildable } from '../lib/plates'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { SectionLabel } from '../components/ui/SectionLabel'
import { Chip } from '../components/ui/Chip'
import { Button } from '../components/ui/Button'
import { ChevronDownIcon } from '../components/ui/icons'
import type { EquipmentType } from '../types/routine'

const equipmentOptions: { value: EquipmentType; label: string }[] = [
  { value: 'barbell', label: 'Barra' },
  { value: 'dumbbell_pair', label: 'Mancuernas (par)' },
  { value: 'single_dumbbell', label: 'Mancuerna' },
  { value: 'bodyweight', label: 'Peso corporal' },
]

const muscleGroupPresets = ['pecho', 'espalda', 'hombros', 'bíceps', 'tríceps', 'piernas', 'glúteos', 'core']

const inputClass =
  'h-11 w-full rounded-xl border border-border bg-bg-elevated-2 px-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none'

/** +/- stepper for whole-number values (sets, reps, rest seconds), per docs/DESIGN.md's input styling. */
function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex h-11 flex-1 items-center justify-between rounded-xl border border-border bg-bg-elevated-2 px-1.5">
      <button
        type="button"
        aria-label="Restar"
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-lg text-text-secondary"
      >
        −
      </button>
      <span className="font-mono text-[15px] text-text">
        {value}
        {suffix ? <span className="ml-0.5 text-xs text-text-tertiary">{suffix}</span> : null}
      </span>
      <button
        type="button"
        aria-label="Sumar"
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-lg text-text-secondary"
      >
        +
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  )
}

/** Add-exercise form (catalog only, flow A) per docs/specs/02-exercise-library.md. */
export function AddExercise() {
  const navigate = useNavigate()
  const addExercise = useExerciseStore((s) => s.addExercise)
  const equipment = useSettingsStore((s) => s.equipment)

  const [name, setName] = useState('')
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('barbell')
  const [sets, setSets] = useState(3)
  const [useFreeReps, setUseFreeReps] = useState(false)
  const [minReps, setMinReps] = useState(8)
  const [maxReps, setMaxReps] = useState(12)
  const [freeReps, setFreeReps] = useState('')
  const [restSec, setRestSec] = useState(60)
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [customMuscle, setCustomMuscle] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [initialWeight, setInitialWeight] = useState('')
  const [video, setVideo] = useState('')
  const [note, setNote] = useState('')
  const [alternative, setAlternative] = useState('')

  const weightNum = initialWeight.trim() === '' ? undefined : Number(initialWeight)
  const weightWarning =
    weightNum !== undefined && !Number.isNaN(weightNum) && weightNum > 0 && equipmentType !== 'bodyweight'
      ? (() => {
          if (isBuildable(equipmentType, weightNum, equipment)) return null
          const { below, above } = nearestBuildable(weightNum, getBuildableWeights(equipmentType, equipment))
          const options = [below, above].filter((w): w is number => w !== null)
          if (options.length === 0) return 'No se puede armar ese peso con el inventario actual de discos.'
          return `No es armable con tu inventario actual. Más cercano: ${options.join(' kg o ')} kg.`
        })()
      : null

  function toggleMuscleGroup(tag: string) {
    setMuscleGroups((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function addCustomMuscle() {
    const tag = customMuscle.trim().toLowerCase()
    if (tag === '' || muscleGroups.includes(tag)) {
      setCustomMuscle('')
      return
    }
    setMuscleGroups((prev) => [...prev, tag])
    setCustomMuscle('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName === '') return

    addExercise({
      name: trimmedName,
      equipmentType,
      muscleGroups,
      defaultSets: sets,
      defaultRestSec: restSec,
      ...(useFreeReps
        ? { defaultReps: freeReps.trim() || undefined }
        : { defaultMinReps: minReps, defaultMaxReps: maxReps }),
      video: video.trim() || undefined,
      note: note.trim() || undefined,
      alternative: alternative.trim() || undefined,
    })

    navigate('/exercises')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader title="Nuevo ejercicio" />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-6 pt-3">
        <Field label="Nombre">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Curl de bíceps con barra"
            required
            className={inputClass}
          />
        </Field>

        <Field label="Equipo">
          <div className="grid grid-cols-2 gap-2">
            {equipmentOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEquipmentType(opt.value)}
                className={`h-11 rounded-xl px-2 text-[13px] font-medium ${
                  equipmentType === opt.value
                    ? 'bg-accent font-semibold text-accent-ink'
                    : 'border border-border bg-bg-elevated-2 text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Series">
          <Stepper value={sets} onChange={setSets} min={1} max={10} />
        </Field>

        <Field label="Repeticiones">
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUseFreeReps(false)}
                className={`h-8 flex-1 rounded-lg text-xs font-medium ${
                  !useFreeReps ? 'bg-accent font-semibold text-accent-ink' : 'bg-bg-elevated-2 text-text-secondary'
                }`}
              >
                Rango
              </button>
              <button
                type="button"
                onClick={() => setUseFreeReps(true)}
                className={`h-8 flex-1 rounded-lg text-xs font-medium ${
                  useFreeReps ? 'bg-accent font-semibold text-accent-ink' : 'bg-bg-elevated-2 text-text-secondary'
                }`}
              >
                Texto libre
              </button>
            </div>

            {useFreeReps ? (
              <input
                type="text"
                value={freeReps}
                onChange={(e) => setFreeReps(e.target.value)}
                placeholder="ej. 10 por pierna, al fallo"
                className={inputClass}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Stepper
                  value={minReps}
                  onChange={(v) => {
                    setMinReps(v)
                    if (v > maxReps) setMaxReps(v)
                  }}
                  min={1}
                  max={50}
                />
                <span className="text-text-tertiary">–</span>
                <Stepper
                  value={maxReps}
                  onChange={(v) => {
                    setMaxReps(v)
                    if (v < minReps) setMinReps(v)
                  }}
                  min={1}
                  max={50}
                />
              </div>
            )}
          </div>
        </Field>

        <Field label="Descanso">
          <Stepper value={restSec} onChange={setRestSec} min={0} max={300} step={15} suffix="s" />
        </Field>

        <Field label="Grupos musculares">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {muscleGroupPresets.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleMuscleGroup(tag)}>
                  <Chip active={muscleGroups.includes(tag)}>{tag}</Chip>
                </button>
              ))}
              {muscleGroups
                .filter((t) => !muscleGroupPresets.includes(t))
                .map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleMuscleGroup(tag)}>
                    <Chip active>{tag}</Chip>
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customMuscle}
                onChange={(e) => setCustomMuscle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomMuscle()
                  }
                }}
                placeholder="Agregar otro grupo"
                className={`${inputClass} flex-1`}
              />
              <Button type="button" variant="secondary" size="md" className="w-auto px-4" onClick={addCustomMuscle}>
                Agregar
              </Button>
            </div>
          </div>
        </Field>

        <div className="flex flex-col gap-4 rounded-2xl bg-bg-elevated p-4">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <span className="text-sm font-semibold text-text">Más detalles</span>
            <ChevronDownIcon
              width={18}
              height={18}
              className={`text-text-tertiary transition-transform ${moreOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {moreOpen && (
            <div className="flex flex-col gap-5">
              <Field label="Peso inicial (kg)">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={initialWeight}
                  onChange={(e) => setInitialWeight(e.target.value)}
                  placeholder="opcional"
                  className={inputClass}
                />
                {weightWarning && (
                  <div className="rounded-lg bg-bg-elevated-2 px-3 py-2 text-xs text-text-secondary">
                    {weightWarning}
                  </div>
                )}
              </Field>

              <Field label="Video">
                <input
                  type="url"
                  value={video}
                  onChange={(e) => setVideo(e.target.value)}
                  placeholder="Enlace de YouTube (opcional)"
                  className={inputClass}
                />
              </Field>

              <Field label="Nota">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Cue de ejecución, ajustes, etc. (opcional)"
                  rows={2}
                  className={`${inputClass} h-auto resize-none py-2.5`}
                />
              </Field>

              <Field label="Alternativa">
                <input
                  type="text"
                  value={alternative}
                  onChange={(e) => setAlternative(e.target.value)}
                  placeholder="Qué hacer si no llegas a las reps (opcional)"
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-bg px-5 py-4">
        <Button type="submit" disabled={name.trim() === ''} className="disabled:opacity-40">
          Guardar ejercicio
        </Button>
      </div>
    </form>
  )
}
