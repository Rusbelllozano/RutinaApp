import { seedFromProgram } from '../data/seed'
import type { Exercise, Routine } from '../types/routine'

/**
 * Version of the persisted exercise/routine stores. Bumped when new seed data or seed
 * corrections must reach users who already have those stores saved — zustand's
 * `persist` only uses initial state when nothing is stored, so without this an existing
 * user would never see the PRO routines (docs/specs/05-pro-mode.md, "Migration").
 */
export const SEED_STORE_VERSION = 1

/**
 * Base dumbbell loads that assumed a 2 kg handle, corrected to handle + plates
 * (docs/specs/05-pro-mode.md, "Fixing the same inconsistency in Base"):
 * routine id → exercise id → [old kg, new kg].
 */
const BASE_WEIGHT_FIXES: Record<string, Record<string, [number, number]>> = {
  'base-a': {
    'base-press-de-pecho-en-piso-con-mancuernas': [12, 11.5],
    'base-aperturas-en-piso-con-mancuernas': [7, 6.5],
    'base-elevaciones-laterales': [4.5, 4],
  },
  'base-b': {
    'base-zancadas-estaticas-con-mancuernas': [7, 6.5],
  },
  'base-c': {
    'base-pajaros-aperturas-invertidas-inclinado': [4.5, 4],
    'base-curl-martillo-con-mancuernas': [7, 6.5],
  },
}

/** Same correction for the `alternative` texts that quote a kg figure: id → [old, new]. */
const BASE_ALTERNATIVE_FIXES: Record<string, [string, string]> = {
  'base-press-de-pecho-en-piso-con-mancuernas': [
    'Si no llegas a 8 reps limpias, baja a 9.5 kg (2.5 + 1.25 por extremo)',
    'Si no llegas a 8 reps limpias, baja a 9 kg (2.5 + 1.25 por extremo)',
  ],
  'base-elevaciones-laterales': [
    'Si los hombros se van hacia arriba, usa las barras solas (~2 kg)',
    'Si los hombros se van hacia arriba, usa las barras solas (~1.5 kg)',
  ],
  'base-extension-de-triceps-sobre-la-cabeza': [
    'Si molesta el codo, una sola mancuerna de 9.5 kg con las dos manos',
    'Si molesta el codo, una sola mancuerna de 9 kg con las dos manos',
  ],
}

/**
 * Adds any seeded catalog entry missing from `stored` and applies the Base text
 * corrections — only where the stored text is still the original, so a user's own edit
 * is never overwritten. Never removes or otherwise rewrites an entry.
 */
export function migrateExercises(stored: Exercise[]): Exercise[] {
  const ids = new Set(stored.map((e) => e.id))
  const patched = stored.map((e) => {
    const fix = BASE_ALTERNATIVE_FIXES[e.id]
    return fix && e.alternative === fix[0] ? { ...e, alternative: fix[1] } : e
  })
  const missing = seedFromProgram().exercises.filter((e) => !ids.has(e.id))
  return [...patched, ...missing]
}

/**
 * Adds any seeded routine missing from `stored` (the PRO week), tags the Base routines
 * with `mode: 'base'`, and applies the Base weight correction where the stored value
 * still equals the old one (the user may have edited it in the routine editor).
 */
export function migrateRoutines(stored: Routine[]): Routine[] {
  const ids = new Set(stored.map((r) => r.id))
  const patched = stored.map((r) => {
    const fixes = BASE_WEIGHT_FIXES[r.id]
    if (!fixes) return r
    return {
      ...r,
      mode: r.mode ?? 'base',
      exercises: r.exercises.map((re) => {
        const fix = fixes[re.exerciseId]
        return fix && re.initialWeightKg === fix[0] ? { ...re, initialWeightKg: fix[1] } : re
      }),
    }
  })
  const missing = seedFromProgram().routines.filter((r) => !ids.has(r.id))
  return [...patched, ...missing]
}
