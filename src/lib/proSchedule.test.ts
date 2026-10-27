import { describe, expect, it } from 'vitest'
import { seedFromProgram } from '../data/seed'
import { isoWeekday, proRoutineForDate, routinesForMode } from './proSchedule'
import type { Routine } from '../types/routine'

const { routines } = seedFromProgram()

describe('proRoutineForDate', () => {
  it('maps Monday–Friday to Day 1–5 (week of 26 Oct 2026)', () => {
    const ids = [26, 27, 28, 29, 30].map((d) => proRoutineForDate(routines, new Date(2026, 9, d))?.id)
    expect(ids).toEqual(['pro-1', 'pro-2', 'pro-3', 'pro-4', 'pro-5'])
  })

  it('is a rest day on the weekend', () => {
    expect(proRoutineForDate(routines, new Date(2026, 9, 31))).toBeUndefined()
    expect(proRoutineForDate(routines, new Date(2026, 10, 1))).toBeUndefined()
  })

  it('never shifts after a missed day: Thursday is Day 4 regardless of history', () => {
    // No state is involved at all — the function only reads the date.
    expect(proRoutineForDate(routines, new Date(2026, 9, 29))?.name).toBe('Hombros + Core')
  })

  it('uses ISO weekdays (Sunday = 7)', () => {
    expect(isoWeekday(new Date(2026, 10, 1))).toBe(7)
    expect(isoWeekday(new Date(2026, 9, 26))).toBe(1)
  })
})

describe('routinesForMode', () => {
  const custom: Routine = { id: 'x', name: 'Mía', muscleGroups: [], exercises: [], source: 'custom' }
  const all = [...routines, custom]

  it('shows each mode its own routines plus custom ones', () => {
    expect(routinesForMode(all, 'base').map((r) => r.id)).toEqual(['base-a', 'base-b', 'base-c', 'x'])
    expect(routinesForMode(all, 'pro').map((r) => r.id)).toEqual(['pro-1', 'pro-2', 'pro-3', 'pro-4', 'pro-5', 'x'])
  })
})
