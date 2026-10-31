import { describe, expect, it } from 'vitest'
import { insertLogSorted, sortLogsByDate } from './historyOrder'
import { findLastExerciseLog } from './progression'
import type { SessionLog } from '../types/routine'

function log(id: string, date: string, weightKg = 40): SessionLog {
  return {
    id,
    date,
    routineId: 'base-a',
    isMinimalVersion: false,
    exercises: [{ exerciseId: 'squat', sets: [{ setIndex: 0, weightKg, reps: 10 }] }],
  }
}

describe('insertLogSorted', () => {
  it('appends a log dated today or later', () => {
    const logs = [log('a', '2026-10-29'), log('b', '2026-10-31')]
    expect(insertLogSorted(logs, log('c', '2026-10-31')).map((l) => l.id)).toEqual(['a', 'b', 'c'])
  })

  it('places a backfilled log before newer ones', () => {
    const logs = [log('a', '2026-10-29'), log('b', '2026-10-31')]
    expect(insertLogSorted(logs, log('c', '2026-10-30')).map((l) => l.id)).toEqual(['a', 'c', 'b'])
    expect(insertLogSorted(logs, log('d', '2026-10-01')).map((l) => l.id)).toEqual(['d', 'a', 'b'])
  })

  it('never lets an older backfilled log become "La vez pasada"', () => {
    const logs = insertLogSorted([log('live', '2026-10-31', 45)], log('old', '2026-10-30', 40))
    expect(findLastExerciseLog(logs, 'squat')?.date).toBe('2026-10-31')
    expect(findLastExerciseLog(logs, 'squat')?.entry.sets[0].weightKg).toBe(45)
  })
})

describe('sortLogsByDate', () => {
  it('sorts by date and keeps same-day order', () => {
    const logs = [log('b', '2026-10-31'), log('a', '2026-10-29'), log('c', '2026-10-31')]
    expect(sortLogsByDate(logs).map((l) => l.id)).toEqual(['a', 'b', 'c'])
  })
})
