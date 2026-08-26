import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExerciseStore } from '../store/useExerciseStore'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Chip } from '../components/ui/Chip'
import { PlusIcon, SearchIcon, XIcon } from '../components/ui/icons'
import type { EquipmentType } from '../types/routine'

const equipmentLabels: Record<EquipmentType, string> = {
  barbell: 'Barra',
  dumbbell_pair: 'Mancuernas (par)',
  single_dumbbell: 'Mancuerna',
  bodyweight: 'Peso corporal',
}

const equipmentFilters: { value: EquipmentType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'barbell', label: 'Barra' },
  { value: 'dumbbell_pair', label: 'Mancuernas' },
  { value: 'single_dumbbell', label: 'Mancuerna' },
  { value: 'bodyweight', label: 'Peso corporal' },
]

/** Catalog list with search + equipment filter, per docs/specs/02-exercise-library.md. */
export function ExerciseLibrary() {
  const navigate = useNavigate()
  const exercises = useExerciseStore((s) => s.exercises)
  const deleteExercise = useExerciseStore((s) => s.deleteExercise)
  const [query, setQuery] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter((e) => equipmentFilter === 'all' || e.equipmentType === equipmentFilter)
      .filter((e) => q === '' || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [exercises, query, equipmentFilter])

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar "${name}" del catálogo? Se quitará de las rutinas que lo usen.`)) return
    deleteExercise(id)
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <ScreenHeader title="Ejercicios" />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-24 pt-3">
        <div className="relative flex-shrink-0">
          <SearchIcon
            width={18}
            height={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio"
            className="h-11 w-full rounded-xl border border-border bg-bg-elevated-2 pl-10 pr-4 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none"
          />
        </div>

        <div className="flex flex-shrink-0 flex-wrap gap-2">
          {equipmentFilters.map((f) => (
            <button key={f.value} type="button" onClick={() => setEquipmentFilter(f.value)}>
              <Chip active={equipmentFilter === f.value}>{f.label}</Chip>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {filtered.length === 0 && (
            <div className="pt-6 text-center text-sm text-text-tertiary">No se encontraron ejercicios.</div>
          )}
          {filtered.map((exercise) => (
            <div key={exercise.id} className="flex items-center gap-3 rounded-2xl bg-bg-elevated p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium text-text">{exercise.name}</div>
                <div className="mt-0.5 truncate text-xs text-text-secondary">
                  {equipmentLabels[exercise.equipmentType]}
                  {exercise.muscleGroups.length > 0 ? ` · ${exercise.muscleGroups.join(', ')}` : ''}
                </div>
              </div>
              <Chip className="flex-shrink-0">{exercise.source === 'base' ? 'Base' : 'Personalizado'}</Chip>
              {exercise.source === 'custom' && (
                <button
                  type="button"
                  aria-label={`Eliminar ${exercise.name}`}
                  onClick={() => handleDelete(exercise.id, exercise.name)}
                  className="flex-shrink-0 text-text-tertiary"
                >
                  <XIcon width={18} height={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Agregar ejercicio"
        onClick={() => navigate('/exercises/new')}
        className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-ink"
      >
        <PlusIcon width={24} height={24} />
      </button>
    </div>
  )
}
