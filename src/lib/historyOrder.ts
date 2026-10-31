import type { SessionLog } from '../types/routine'

/**
 * Inserts `log` keeping `logs` oldest-first by date. A log goes after every existing log
 * with the same or an earlier date, so a session logged after the fact for Friday lands
 * between Friday's and Saturday's — and every reader that walks the array backwards
 * ("La vez pasada", progression, the AI export) keeps seeing the real latest session
 * (docs/specs/07-exercise-types-and-backfill.md, Part 2).
 */
export function insertLogSorted(logs: SessionLog[], log: SessionLog): SessionLog[] {
  let i = logs.length
  while (i > 0 && logs[i - 1].date > log.date) i--
  return [...logs.slice(0, i), log, ...logs.slice(i)]
}

/** Stable sort by date — keeps the original order of same-day logs. Used by the persist migration. */
export function sortLogsByDate(logs: SessionLog[]): SessionLog[] {
  return logs
    .map((log, i) => ({ log, i }))
    .sort((a, b) => (a.log.date < b.log.date ? -1 : a.log.date > b.log.date ? 1 : a.i - b.i))
    .map((x) => x.log)
}
