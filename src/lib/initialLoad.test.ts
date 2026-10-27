import { describe, expect, it } from 'vitest'
import { program } from '../data/program'
import { seedFromProgram } from '../data/seed'
import { resolveInitialLoad, withResolvedInitialWeight } from './initialLoad'
import type { Equipment } from '../types/program'

const { exercises, routines } = seedFromProgram()
const typeOf = (id: string) => exercises.find((e) => e.id === id)?.equipmentType
const routine = (id: string) => routines.find((r) => r.id === id)!

describe('resolveInitialLoad', () => {
  it('recomputes from plates when the bar weight changes in Settings', () => {
    const tuesday = routine('pro-2')
    const squat = tuesday.exercises[0]
    const heavierBar: Equipment = { ...program.equipment, barbell: { ...program.equipment.barbell, weightKg: 7 } }
    expect(resolveInitialLoad(tuesday, squat, typeOf, program.equipment).weightKg).toBe(26)
    expect(resolveInitialLoad(tuesday, squat, typeOf, heavierBar).weightKg).toBe(27)
  })

  it('keeps the prescribed plates instead of the minimal combination', () => {
    const wednesday = routine('pro-3')
    const oneHandRow = wednesday.exercises.find((e) => e.exerciseId === 'base-remo-a-una-mano-con-mancuerna')!
    const load = resolveInitialLoad(wednesday, oneHandRow, typeOf, program.equipment)
    expect(load.weightKg).toBe(11.5)
    expect(load.breakdown?.perSide).toEqual([{ kg: 2.5, count: 2 }])
  })

  it('inherits the previous same-implement load for keepPlates slots', () => {
    const wednesday = routine('pro-3')
    const pullover = wednesday.exercises.find((e) => e.exerciseId === 'base-pull-over-en-piso-con-una-mancuerna')!
    expect(pullover.keepPlates).toBe(true)
    expect(resolveInitialLoad(wednesday, pullover, typeOf, program.equipment).weightKg).toBe(11.5)
  })

  it('lets an explicit initialWeightKg win (Base data, or a routine-editor override)', () => {
    const tuesday = routine('pro-2')
    const squat = { ...tuesday.exercises[0], initialWeightKg: 21 }
    expect(resolveInitialLoad(tuesday, squat, typeOf, program.equipment)).toEqual({ weightKg: 21 })
    expect(withResolvedInitialWeight(squat, { weightKg: 26 }).initialWeightKg).toBe(21)
  })

  it('returns nothing when the inventory cannot supply the configuration', () => {
    const thursday = routine('pro-4')
    const shrugs = thursday.exercises[1]
    const fewerPlates: Equipment = {
      ...program.equipment,
      plates: program.equipment.plates.map((p) => (p.kg === 2.5 ? { ...p, quantity: 4 } : p)),
    }
    expect(resolveInitialLoad(thursday, shrugs, typeOf, fewerPlates)).toEqual({})
  })
})
