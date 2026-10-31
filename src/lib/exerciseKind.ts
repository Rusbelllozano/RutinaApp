import type { Exercise, ExerciseKind, LoggedSet } from '../types/routine'

/** Display order and Spanish labels for the "Tipo" picker and filters. */
export const KIND_OPTIONS: { id: ExerciseKind; label: string }[] = [
  { id: 'strength', label: 'Fuerza' },
  { id: 'isometric', label: 'Isométrico' },
  { id: 'run', label: 'Correr/trotar' },
  { id: 'cardio', label: 'Otro cardio' },
  { id: 'mobility', label: 'Movilidad' },
]

export const kindLabels: Record<ExerciseKind, string> = Object.fromEntries(
  KIND_OPTIONS.map((o) => [o.id, o.label]),
) as Record<ExerciseKind, string>

/**
 * An exercise's kind. Entries saved before spec 07 have none: anything with a default
 * duration is isometric (plank, hollow hold), everything else strength.
 */
export function exerciseKind(exercise: Pick<Exercise, 'kind' | 'defaultDurationSec'> | undefined): ExerciseKind {
  if (exercise?.kind) return exercise.kind
  return exercise?.defaultDurationSec !== undefined ? 'isometric' : 'strength'
}

/** Kinds logged as one distance/time entry instead of sets (docs/specs/07, Part 1). */
export function isSingleEntryKind(kind: ExerciseKind): boolean {
  return kind === 'run' || kind === 'cardio' || kind === 'mobility'
}

/** Kinds that record a distance. */
export function tracksDistance(kind: ExerciseKind): boolean {
  return kind === 'run' || kind === 'cardio'
}

/** Accepts "6", "6.5" or "6,5" (Spanish keyboards) — undefined for empty/invalid/≤0. */
export function parseDecimal(text: string): number | undefined {
  const t = text.trim().replace(',', '.')
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** "6", "6,5", "10,25" — Spanish decimal comma, at most 2 decimals. */
export function formatKm(km: number): string {
  return String(Math.round(km * 100) / 100).replace('.', ',')
}

/** Seconds → "38:00" or "1:05:30". */
export function formatClock(totalSec: number): string {
  const s = Math.round(totalSec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** Pace in seconds per km, or undefined when either side is missing. Derived, never stored. */
export function paceSecPerKm(set: Pick<LoggedSet, 'distanceKm' | 'durationSec'>): number | undefined {
  if (!set.distanceKm || !set.durationSec) return undefined
  return set.durationSec / set.distanceKm
}

/** "6:20/km". */
export function formatPace(secPerKm: number): string {
  return `${formatClock(secPerKm)}/km`
}

/** "6 km · 38:00 · 6:20/km" — whatever parts the entry has. */
export function formatCardioEntry(set: Pick<LoggedSet, 'distanceKm' | 'durationSec'>): string {
  const parts: string[] = []
  if (set.distanceKm) parts.push(`${formatKm(set.distanceKm)} km`)
  if (set.durationSec) parts.push(formatClock(set.durationSec))
  const pace = paceSecPerKm(set)
  if (pace !== undefined) parts.push(formatPace(pace))
  return parts.length > 0 ? parts.join(' · ') : 'Hecho'
}

/** One logged set as compact text, for any kind: "40kg × 10", "12 reps", "30s", "6 km · 38:00 · 6:20/km". */
export function formatLoggedSet(s: LoggedSet): string {
  if (s.distanceKm != null) return formatCardioEntry(s)
  if (s.weightKg != null && s.reps != null) return `${s.weightKg}kg × ${s.reps}`
  if (s.reps != null) return `${s.reps} reps`
  if (s.durationSec != null) return s.durationSec >= 120 ? formatClock(s.durationSec) : `${s.durationSec}s`
  return 'Hecho'
}

/** "6 km · 40 min" from a run/cardio slot's targets, or "Sin objetivo". */
export function formatCardioTarget(target: { targetKm?: number; targetMin?: number }): string {
  const parts = [
    target.targetKm !== undefined ? `${formatKm(target.targetKm)} km` : null,
    target.targetMin !== undefined ? `${formatKm(target.targetMin)} min` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Sin objetivo'
}
