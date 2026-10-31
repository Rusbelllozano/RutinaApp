import type { LoggedSet } from '../types/routine'
import { formatLoggedSet } from '../lib/exerciseKind'

/**
 * One exercise's logged sets from a session — name on its own line, sets as wrapped
 * pills below. Never squeezed sideways by a long name, unlike a name+sets flex row
 * (which pushes long set lists off-screen on narrow phones).
 */
export function SessionExerciseSets({ name, sets }: { name: string; sets: LoggedSet[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[14px] font-medium text-text">{name}</div>
      <div className="flex flex-wrap gap-1.5">
        {sets.map((s, i) => (
          <span key={i} className="rounded-lg bg-bg-elevated-2 px-2 py-1 font-mono text-[12.5px] text-text-secondary">
            {formatLoggedSet(s)}
          </span>
        ))}
      </div>
    </div>
  )
}
