import { EFFORT_OPTIONS } from '../lib/effort'
import type { ExerciseEffort } from '../types/routine'
import { Chip } from './ui/Chip'

/** "Fácil / Justo / Al límite" toggle row — tapping the active one clears it. */
export function EffortChips({ value, onChange }: { value: ExerciseEffort | undefined; onChange: (e: ExerciseEffort | undefined) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {EFFORT_OPTIONS.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(value === o.id ? undefined : o.id)}>
          <Chip active={value === o.id}>{o.label}</Chip>
        </button>
      ))}
    </div>
  )
}
