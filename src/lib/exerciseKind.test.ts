import { describe, expect, it } from 'vitest'
import { exerciseKind, formatCardioEntry, formatClock, formatLoggedSet, parseDecimal, paceSecPerKm } from './exerciseKind'

describe('exerciseKind', () => {
  it('falls back to isometric/strength for exercises saved before kinds existed', () => {
    expect(exerciseKind({ defaultDurationSec: 30 })).toBe('isometric')
    expect(exerciseKind({})).toBe('strength')
    expect(exerciseKind({ kind: 'run' })).toBe('run')
  })
})

describe('cardio formatting', () => {
  it('parses Spanish decimal commas', () => {
    expect(parseDecimal('6,5')).toBe(6.5)
    expect(parseDecimal('6')).toBe(6)
    expect(parseDecimal('')).toBeUndefined()
    expect(parseDecimal('abc')).toBeUndefined()
    expect(parseDecimal('0')).toBeUndefined()
  })

  it('formats clock times with and without hours', () => {
    expect(formatClock(38 * 60)).toBe('38:00')
    expect(formatClock(3930)).toBe('1:05:30')
  })

  it('derives pace from distance and time', () => {
    expect(paceSecPerKm({ distanceKm: 6, durationSec: 38 * 60 })).toBe(380)
    expect(paceSecPerKm({ distanceKm: 6 })).toBeUndefined()
    expect(formatCardioEntry({ distanceKm: 6, durationSec: 38 * 60 })).toBe('6 km · 38:00 · 6:20/km')
    expect(formatCardioEntry({ distanceKm: 6.5 })).toBe('6,5 km')
  })

  it('formats any kind of logged set', () => {
    expect(formatLoggedSet({ setIndex: 0, weightKg: 40, reps: 10 })).toBe('40kg × 10')
    expect(formatLoggedSet({ setIndex: 0, durationSec: 30 })).toBe('30s')
    expect(formatLoggedSet({ setIndex: 0, durationSec: 600 })).toBe('10:00')
    expect(formatLoggedSet({ setIndex: 0 })).toBe('Hecho')
  })
})
