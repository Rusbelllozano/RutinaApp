import { describe, expect, it } from 'vitest'
import { migrateExercises, migrateRoutines } from './seedMigration'
import { seedFromProgram } from '../data/seed'
import type { Exercise, Routine } from '../types/routine'

/** What a user who installed before PRO mode has stored: Base only, old dumbbell numbers. */
function legacyRoutines(): Routine[] {
  return seedFromProgram()
    .routines.filter((r) => r.mode === 'base')
    .map(({ mode: _mode, ...r }) => ({
      ...r,
      exercises: r.exercises.map((re) =>
        re.exerciseId === 'base-press-de-pecho-en-piso-con-mancuernas'
          ? { ...re, initialWeightKg: 12 }
          : re.exerciseId === 'base-aperturas-en-piso-con-mancuernas'
            ? { ...re, initialWeightKg: 13 } // edited by the user in the routine editor
            : re,
      ),
    }))
}

describe('migrateRoutines', () => {
  const migrated = migrateRoutines(legacyRoutines())
  const pushDay = migrated.find((r) => r.id === 'base-a')!
  const weightOf = (id: string) => pushDay.exercises.find((e) => e.exerciseId === id)?.initialWeightKg

  it('adds the PRO week and the Trote routine without touching or duplicating existing routines', () => {
    expect(migrated.map((r) => r.id)).toEqual(['base-a', 'base-b', 'base-c', 'pro-1', 'pro-2', 'pro-3', 'pro-4', 'pro-5', 'cardio-trote'])
  })

  it('tags Base routines and corrects only untouched old dumbbell weights', () => {
    expect(pushDay.mode).toBe('base')
    expect(weightOf('base-press-de-pecho-en-piso-con-mancuernas')).toBe(11.5)
    expect(weightOf('base-aperturas-en-piso-con-mancuernas')).toBe(13)
  })

  it('keeps custom routines and is idempotent', () => {
    const custom: Routine = { id: 'mine', name: 'Mía', muscleGroups: [], exercises: [], source: 'custom' }
    const once = migrateRoutines([...legacyRoutines(), custom])
    expect(migrateRoutines(once)).toEqual(once)
    expect(once.find((r) => r.id === 'mine')).toEqual(custom)
  })
})

describe('migrateExercises', () => {
  it('adds the new PRO catalog entries and fixes untouched alternative texts', () => {
    const legacy: Exercise[] = seedFromProgram()
      .exercises.filter((e) => !e.id.startsWith('base-press-de-pecho-en-piso-con-barra'))
      .map((e) =>
        e.id === 'base-elevaciones-laterales'
          ? { ...e, alternative: 'Si los hombros se van hacia arriba, usa las barras solas (~2 kg)' }
          : e,
      )
    const migrated = migrateExercises(legacy)
    expect(migrated.some((e) => e.id === 'base-press-de-pecho-en-piso-con-barra')).toBe(true)
    expect(migrated.find((e) => e.id === 'base-elevaciones-laterales')?.alternative).toContain('~1.5 kg')
    expect(new Set(migrated.map((e) => e.id)).size).toBe(migrated.length)
  })
})

describe('Trotar seed (spec 07)', () => {
  it('adds the running exercise to an existing catalog, once', () => {
    const once = migrateExercises([])
    const trotar = once.find((e) => e.id === 'base-trotar')
    expect(trotar?.kind).toBe('run')
    expect(migrateExercises(once).filter((e) => e.id === 'base-trotar')).toHaveLength(1)
  })
})
