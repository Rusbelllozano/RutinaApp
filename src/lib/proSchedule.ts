import type { ProgramMode, ProWeekday, Routine } from '../types/routine'

/** ISO weekday of a local Date: Monday = 1 … Sunday = 7. */
export function isoWeekday(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1
}

/** Local Date for an ISO date string (YYYY-MM-DD), at midnight — never parsed as UTC. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * PRO's routine for a date: a pure function of the weekday, no stored state
 * (docs/specs/05-pro-mode.md). Missing Wednesday never shifts Thursday — Thursday is
 * always Day 4. Weekends return undefined (rest).
 */
export function proRoutineForDate(routines: Routine[], date: Date): Routine | undefined {
  const weekday = isoWeekday(date)
  if (weekday > 5) return undefined
  return routines.find((r) => r.mode === 'pro' && r.weekday === (weekday as ProWeekday))
}

export function isWeekend(date: Date): boolean {
  return isoWeekday(date) > 5
}

/**
 * Routines offered in a mode's picker/calendar: that mode's seeded routines plus every
 * custom one (custom routines have no mode and show in both).
 */
export function routinesForMode(routines: Routine[], mode: ProgramMode): Routine[] {
  return routines.filter((r) => r.mode === undefined || r.mode === mode)
}
