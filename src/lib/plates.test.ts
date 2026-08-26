import { describe, expect, it } from 'vitest'
import {
  buildableWeights,
  describePlateBreakdown,
  getBuildableWeights,
  getPlateBreakdown,
  isBuildable,
  nearestBuildable,
  plateBreakdown,
} from './plates'
import type { Equipment } from '../types/program'

// Real inventory from docs/HANDOFF.md §1.
const inventory = [
  { kg: 1.25, quantity: 4 },
  { kg: 2.5, quantity: 6 },
  { kg: 5, quantity: 4 },
]

const equipment: Equipment = {
  barbell: { weightKg: 6, lengthCm: 169 },
  dumbbellHandle: { weightKg: 1.5, quantity: 2, lengthCm: 35 },
  collars: { quantity: 6, weightKg: 0.2 },
  plates: inventory,
}

describe('barbell (2 sides)', () => {
  it('ranges from the bar alone to the documented 46 kg max', () => {
    const weights = buildableWeights(6, inventory, 2)
    expect(weights[0]).toBe(6)
    expect(weights[weights.length - 1]).toBe(46)
  })

  it('never returns an asymmetric or non-buildable weight', () => {
    const weights = buildableWeights(6, inventory, 2)
    for (const w of weights) {
      expect(plateBreakdown(w, 6, inventory, 2)).not.toBeNull()
    }
  })

  it('matches the HANDOFF-documented breakdown for 31 kg (glute bridge)', () => {
    const result = plateBreakdown(31, 6, inventory, 2)
    expect(result).not.toBeNull()
    expect(result!.perSide).toEqual(
      expect.arrayContaining([
        { kg: 5, count: 2 },
        { kg: 2.5, count: 1 },
      ]),
    )
  })

  it('rejects a target that is not buildable', () => {
    expect(plateBreakdown(6.5, 6, inventory, 2)).toBeNull()
    expect(plateBreakdown(47, 6, inventory, 2)).toBeNull()
  })
})

describe('dumbbell pair (4 ends)', () => {
  it('caps at 19 kg per dumbbell, using every plate type once per end', () => {
    const weights = buildableWeights(1.5, inventory, 4)
    expect(weights[weights.length - 1]).toBe(19)
  })

  it('reflects the shared-inventory limit (only 4 of the 4 5kg plates usable per pair)', () => {
    // 4 plates of 5kg means floor(4/4) = 1 per end is the ceiling: using two 5kg
    // plates on a single end would need 8 of them across the pair's 4 ends.
    const weights = buildableWeights(1.5, inventory, 4)
    expect(weights).toContain(1.5 + 2 * 5) // one 5kg plate per end
    expect(weights).not.toContain(1.5 + 2 * 10) // would need two 5kg plates per end
  })
})

describe('single dumbbell (2 sides of one handle)', () => {
  it('matches the HANDOFF-documented 11.5 kg one-arm row', () => {
    const result = plateBreakdown(11.5, 1.5, inventory, 2)
    expect(result).not.toBeNull()
    expect(result!.perSide).toEqual([{ kg: 5, count: 1 }])
  })
})

describe('nearestBuildable', () => {
  it('brackets an unbuildable target with the closest achievable weights', () => {
    const weights = buildableWeights(6, inventory, 2)
    const { below, above } = nearestBuildable(19, weights)
    expect(below).toBeLessThanOrEqual(19)
    expect(above).toBeGreaterThanOrEqual(19)
  })
})

describe('equipment-type dispatch', () => {
  it('bodyweight has no buildable weights and is never buildable', () => {
    expect(getBuildableWeights('bodyweight', equipment)).toEqual([])
    expect(isBuildable('bodyweight', 10, equipment)).toBe(false)
  })

  it('honors a custom bar weight from settings', () => {
    const heavier: Equipment = { ...equipment, barbell: { ...equipment.barbell, weightKg: 8 } }
    expect(getBuildableWeights('barbell', heavier)[0]).toBe(8)
  })

  it('getPlateBreakdown matches the pure barbell function', () => {
    expect(getPlateBreakdown('barbell', 21, equipment)).toEqual(plateBreakdown(21, 6, inventory, 2))
  })
})

describe('describePlateBreakdown', () => {
  it('renders a human-readable per-side summary', () => {
    const result = getPlateBreakdown('barbell', 21, equipment)!
    expect(describePlateBreakdown(result)).toContain('por lado')
  })
})
