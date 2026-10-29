import { describe, expect, it } from 'vitest'
import { applyChange, parseAiResponse, revertChange, validateChange, AiResponseError, type AiChange } from './aiImport'
import { seedFromProgram } from '../data/seed'
import { program } from '../data/program'
import type { Routine } from '../types/routine'

const SQUAT = 'base-sentadilla-con-barra-en-la-espalda'
const { exercises, routines } = seedFromProgram()
const ctx = { exercises, routines, equipment: program.equipment }
const routineB = routines.find((r) => r.id === 'base-b')!
const outside = exercises.find((e) => !routineB.exercises.some((re) => re.exerciseId === e.id) && e.equipmentType === 'bodyweight')!

function wrap(json: object) {
  return `## Análisis\n\nVas bien.\n\n\`\`\`json\n${JSON.stringify(json)}\n\`\`\`\n`
}

describe('parseAiResponse', () => {
  it('splits prose from the last json fence', () => {
    const parsed = parseAiResponse(wrap({ schemaVersion: 1, summary: 'Ok', changes: [] }), ctx)
    expect(parsed).toEqual({ prose: '## Análisis\n\nVas bien.', summary: 'Ok', changes: [] })
  })

  it('accepts a bare JSON object without a fence', () => {
    expect(parseAiResponse('Texto {"summary":"x","changes":[]}', ctx).prose).toBe('Texto')
  })

  it('rejects missing JSON, broken JSON and newer schemas', () => {
    expect(() => parseAiResponse('sin json', ctx)).toThrow(AiResponseError)
    expect(() => parseAiResponse('```json\n{changes: [}\n```', ctx)).toThrow(AiResponseError)
    expect(() => parseAiResponse(wrap({ schemaVersion: 99, changes: [] }), ctx)).toThrow(AiResponseError)
  })

  it('keeps invalid changes with a reason instead of dropping them', () => {
    const parsed = parseAiResponse(
      wrap({ changes: [{ type: 'setWeight', routineId: 'base-b', exerciseId: SQUAT, weightKg: 22 }, { type: 'nope', routineId: 'base-b' }] }),
      ctx,
    )
    expect(parsed.changes.map((c) => c.change === undefined)).toEqual([true, true])
    expect(parsed.changes[0].error).toContain('no se puede armar')
  })
})

describe('validateChange', () => {
  it('accepts a buildable weight and rejects unknown ids', () => {
    expect(validateChange({ type: 'setWeight', routineId: 'base-b', exerciseId: SQUAT, weightKg: 26 }, ctx)).toMatchObject({ weightKg: 26 })
    expect(typeof validateChange({ type: 'setWeight', routineId: 'zzz', exerciseId: SQUAT, weightKg: 26 }, ctx)).toBe('string')
  })

  it('rejects min reps above max reps, combined with the current range', () => {
    expect(typeof validateChange({ type: 'updatePrescription', routineId: 'base-b', exerciseId: SQUAT, minReps: 40 }, ctx)).toBe('string')
  })

  it('rejects weight on a bodyweight exercise and duplicates on add', () => {
    expect(typeof validateChange({ type: 'addExercise', routineId: 'base-b', exerciseId: outside.id, sets: 3, restSec: 60, weightKg: 10 }, ctx)).toBe('string')
    expect(typeof validateChange({ type: 'addExercise', routineId: 'base-b', exerciseId: SQUAT, sets: 3, restSec: 60 }, ctx)).toBe('string')
  })
})

describe('applyChange / revertChange', () => {
  const changes: AiChange[] = [
    { type: 'setWeight', routineId: 'base-b', exerciseId: SQUAT, weightKg: 26 },
    { type: 'updatePrescription', routineId: 'base-b', exerciseId: SQUAT, sets: 4, restSec: 120 },
    { type: 'swapExercise', routineId: 'base-b', fromExerciseId: SQUAT, toExerciseId: outside.id },
    { type: 'addExercise', routineId: 'base-b', exerciseId: outside.id, sets: 3, minReps: 10, maxReps: 15, restSec: 60 },
    { type: 'removeExercise', routineId: 'base-b', exerciseId: SQUAT },
  ]

  const sorted = (r: Routine) => [...r.exercises].sort((a, b) => a.order - b.order)

  it.each(changes)('$type round-trips back to the original routine', (change) => {
    const { exercises: after, undo } = applyChange(routineB, change, exercises)
    expect(after).not.toEqual(routineB.exercises)
    const reverted = { ...routineB, exercises: revertChange({ ...routineB, exercises: after }, undo) }
    expect(sorted(reverted)).toEqual(sorted(routineB))
  })

  it('setWeight stores a one-shot next weight, swap keeps the slot position', () => {
    const squatOrder = routineB.exercises.find((re) => re.exerciseId === SQUAT)!.order
    expect(applyChange(routineB, changes[0], exercises).exercises.find((re) => re.exerciseId === SQUAT)?.nextWeightKg).toBe(26)
    expect(applyChange(routineB, changes[2], exercises).exercises.find((re) => re.exerciseId === outside.id)?.order).toBe(squatOrder)
  })

  it('refuses a change that no longer fits the routine', () => {
    const without = { ...routineB, exercises: routineB.exercises.filter((re) => re.exerciseId !== SQUAT) }
    expect(() => applyChange(without, changes[0], exercises)).toThrow(AiResponseError)
  })
})
