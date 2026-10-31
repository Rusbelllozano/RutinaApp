import { describe, expect, it } from 'vitest'
import { countGoalSessions, weeksRemaining } from './goal'
import type { SessionLog } from '../types/routine'

const goal = { startDate: '2026-10-27', endDate: '2026-12-15', targetSessions: 30 }
const log = (date: string, routineId: string, isMinimalVersion = false): SessionLog => ({
  id: `${date}-${routineId}`,
  date,
  routineId,
  exercises: [],
  isMinimalVersion,
})

describe('countGoalSessions', () => {
  it('counts sessions in range from both modes, minimum ones included, once per date', () => {
    const logs = [
      log('2026-10-26', 'pro-1'), // before the cycle
      log('2026-10-27', 'pro-2'),
      log('2026-10-27', 'base-a'), // second session the same day
      log('2026-10-28', 'base-b', true),
      log('2026-12-15', 'pro-2'),
      log('2026-12-16', 'pro-3'), // after
    ]
    expect(countGoalSessions(logs, goal)).toBe(3)
  })

  it('counts a jog swapped in for a training day, logged after the fact, on its own date', () => {
    const jog: SessionLog = {
      ...log('2026-10-30', 'custom-trote'),
      source: 'manual',
      exercises: [{ exerciseId: 'trote', sets: [{ setIndex: 0, distanceKm: 6, durationSec: 2280 }] }],
    }
    expect(countGoalSessions([log('2026-10-29', 'pro-4'), jog], goal)).toBe(2)
    // Deleting it lowers the count — the goal reads straight from the logs.
    expect(countGoalSessions([log('2026-10-29', 'pro-4')], goal)).toBe(1)
  })
})

describe('weeksRemaining', () => {
  it('rounds up the inclusive days left to whole weeks', () => {
    expect(weeksRemaining(goal, new Date(2026, 9, 27))).toBe(8) // 50 days
    expect(weeksRemaining(goal, new Date(2026, 11, 15))).toBe(1)
    expect(weeksRemaining(goal, new Date(2026, 11, 16))).toBe(0)
  })
})
