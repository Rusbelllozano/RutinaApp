import { describe, expect, it } from 'vitest'
import { program } from './program'
import { proRoutines } from './proProgram'
import { seedFromProgram } from './seed'
import { resolveInitialLoad } from '../lib/initialLoad'
import { sortedExercises } from '../lib/sessionRules'

const { exercises, routines } = seedFromProgram()
const typeOf = (id: string) => exercises.find((e) => e.id === id)?.equipmentType

// Nominal kg from docs/specs/05-pro-mode.md (6 kg barbell, 1.5 kg handle) — for checking
// the computed loads, never stored in the data.
const NOMINAL_KG: Record<string, (number | null)[]> = {
  'pro-1': [26, 26, 9, 6.5, 11, null, null],
  'pro-2': [26, 31, 31, 6.5, 6.5, null, null],
  'pro-3': [41, 31, 11.5, 11.5, 11, 11.5, null],
  'pro-4': [16, 41, 4, 4, 6.5, null, null],
  'pro-5': [36, 41, 41, 4, 4, null, null],
}

describe('PRO program data', () => {
  it('has one routine per weekday, Monday to Friday', () => {
    expect(proRoutines.map((r) => [r.id, r.weekday, r.mode])).toEqual([
      ['pro-1', 1, 'pro'],
      ['pro-2', 2, 'pro'],
      ['pro-3', 3, 'pro'],
      ['pro-4', 4, 'pro'],
      ['pro-5', 5, 'pro'],
    ])
  })

  it('only references exercises that exist in the seeded catalog', () => {
    for (const routine of proRoutines) {
      for (const re of routine.exercises) expect(typeOf(re.exerciseId), re.exerciseId).toBeDefined()
    }
  })

  it('reuses the Base catalog ids for shared movements so history carries over', () => {
    const baseIds = new Set(routines.filter((r) => r.mode === 'base').flatMap((r) => r.exercises.map((e) => e.exerciseId)))
    const proIds = new Set(proRoutines.flatMap((r) => r.exercises.map((e) => e.exerciseId)))
    const shared = [...proIds].filter((id) => baseIds.has(id))
    expect(shared).toHaveLength(19)
    expect(shared).toContain('base-sentadilla-con-barra-en-la-espalda')
    expect(shared).toContain('base-press-militar-de-pie-con-barra')
    expect(shared).toContain('base-hollow-hold-o-bicicleta-abdominal')
    expect(proIds.size).toBe(29)
  })

  it('seeds no duplicate catalog or routine ids', () => {
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length)
    expect(new Set(routines.map((r) => r.id)).size).toBe(routines.length)
  })

  it('computes every starting load from plates, all buildable from the real inventory', () => {
    for (const routine of proRoutines) {
      const computed = sortedExercises(routine).map(
        (re) => resolveInitialLoad(routine, re, typeOf, program.equipment).weightKg ?? null,
      )
      expect(computed, routine.id).toEqual(NOMINAL_KG[routine.id])
    }
  })

  it('stores no kg — loads are plate configurations', () => {
    for (const routine of proRoutines) {
      for (const re of routine.exercises) expect(re.initialWeightKg).toBeUndefined()
    }
  })
})
