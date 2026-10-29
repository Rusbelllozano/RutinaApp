import { describe, expect, it } from 'vitest'
import { findLastExerciseLog, findProgressionLog, suggestProgression } from './progression'
import type { SessionLog } from '../types/routine'

const BRIDGE = 'base-puente-de-gluteo-con-barra-sobre-la-cadera'
const SQUAT = 'base-sentadilla-con-barra-en-la-espalda'

function log(id: string, date: string, routineId: string, exerciseId: string, weightKg: number): SessionLog {
  return {
    id,
    date,
    routineId,
    isMinimalVersion: false,
    exercises: [{ exerciseId, sets: [{ setIndex: 0, weightKg, reps: 15 }] }],
  }
}

describe('findProgressionLog', () => {
  const logs: SessionLog[] = [
    log('1', '2026-10-13', 'base-b', SQUAT, 21),
    log('2', '2026-10-27', 'pro-2', BRIDGE, 31),
    log('3', '2026-10-30', 'pro-5', BRIDGE, 41),
  ]

  it("follows each PRO day's own history for an exercise repeated in the week", () => {
    expect(findProgressionLog(logs, BRIDGE, 'pro-2')?.entry.sets[0].weightKg).toBe(31)
    expect(findProgressionLog(logs, BRIDGE, 'pro-5')?.entry.sets[0].weightKg).toBe(41)
  })

  it('falls back to any routine — a Base squat carries into the first PRO squat', () => {
    const found = findProgressionLog(logs, SQUAT, 'pro-2')
    expect(found?.routineId).toBe('base-b')
    expect(found?.entry.sets[0].weightKg).toBe(21)
  })

  it('"last time" without a routine is simply the most recent anywhere', () => {
    expect(findLastExerciseLog(logs, BRIDGE)?.routineId).toBe('pro-5')
    expect(findLastExerciseLog(logs, 'nope')).toBeUndefined()
  })
})

describe('suggestProgression with an AI-set next weight', () => {
  const re = { exerciseId: SQUAT, order: 1, sets: 2, minReps: 8, maxReps: 12, restSec: 90, nextWeightKg: 26 }
  const topOfRange = { exerciseId: SQUAT, sets: [{ setIndex: 0, weightKg: 21, reps: 12 }, { setIndex: 1, weightKg: 21, reps: 12 }] }

  it('uses the override and skips the +2.5 kg offer', () => {
    expect(suggestProgression(re, topOfRange)).toEqual({
      suggestedWeightKg: 26,
      atTopOfRange: false,
      increasedWeightKg: undefined,
    })
  })

  it('falls back to normal progression without it', () => {
    const { nextWeightKg: _, ...plain } = re
    expect(suggestProgression(plain, topOfRange).increasedWeightKg).toBe(23.5)
  })
})
