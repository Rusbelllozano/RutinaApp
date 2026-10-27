import type { SessionLog } from '../types/routine'
import type { CycleGoal } from '../store/useGoalStore'
import { parseISODate } from './proSchedule'

/**
 * Sessions counted toward a cycle goal (docs/specs/05-pro-mode.md, "Cycle goal"): every
 * logged session dated inside [startDate, endDate], from either mode, minimum sessions
 * included — but at most one per calendar date.
 */
export function countGoalSessions(logs: SessionLog[], goal: CycleGoal): number {
  const dates = new Set<string>()
  for (const log of logs) {
    if (log.date >= goal.startDate && log.date <= goal.endDate) dates.add(log.date)
  }
  return dates.size
}

/** Whole weeks left until `endDate` (inclusive), rounded up; 0 once it has passed. */
export function weeksRemaining(goal: CycleGoal, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = parseISODate(goal.endDate)
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  return days <= 0 ? 0 : Math.ceil(days / 7)
}
