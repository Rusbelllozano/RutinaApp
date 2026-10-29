import { describe, expect, it } from 'vitest'
import { buildAnalysisPrompt, logsInRange } from './aiExport'
import { seedFromProgram } from '../data/seed'
import { program } from '../data/program'
import type { SessionLog } from '../types/routine'

const SQUAT = 'base-sentadilla-con-barra-en-la-espalda'
const { exercises, routines } = seedFromProgram()

function log(id: string, date: string, extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id,
    date,
    routineId: 'base-b',
    isMinimalVersion: false,
    durationMin: 45,
    exercises: [
      {
        exerciseId: SQUAT,
        effort: 'limit',
        sets: [
          { setIndex: 0, weightKg: 21, reps: 10 },
          { setIndex: 1, weightKg: 21, reps: 9, restTakenSec: 95 },
        ],
      },
    ],
    ...extra,
  }
}

const base = {
  exercises,
  routines,
  equipment: program.equipment,
  rotationOrder: ['base-a', 'base-b', 'base-c'],
  mode: 'base' as const,
  today: '2026-10-29',
}

describe('logsInRange', () => {
  const logs = [log('1', '2026-08-01'), log('2', '2026-10-02'), log('3', '2026-10-29')]

  it('keeps everything for "all"', () => {
    expect(logsInRange(logs, 'all', '2026-10-29')).toHaveLength(3)
  })

  it('counts 4 weeks back including today', () => {
    expect(logsInRange(logs, '4w', '2026-10-29').map((l) => l.id)).toEqual(['2', '3'])
  })
})

describe('buildAnalysisPrompt', () => {
  const prompt = buildAnalysisPrompt({ ...base, logs: [log('1', '2026-10-20', { note: 'Dormí\nmal' }), log('2', '2026-10-27')], range: 'all' })

  it('includes every section the response depends on', () => {
    for (const heading of ['## Tu rol', '## Equipo', '## Programa actual', '## Catálogo', '## Resumen calculado', '## Sesiones', '## Formato de tu respuesta']) {
      expect(prompt).toContain(heading)
    }
    expect(prompt).toContain('"schemaVersion": 1')
  })

  it('lists routine and exercise ids the AI must reuse', () => {
    expect(prompt).toContain('`base-b`')
    expect(prompt).toContain(`\`${SQUAT}\``)
  })

  it('logs sets with real vs prescribed rest, effort and the session note on one line', () => {
    expect(prompt).toMatch(/\| 2 \| 21 \| 9 \| 95 s \/ \d+ s \|/)
    expect(prompt).toContain('Al límite')
    expect(prompt).toContain('Nota: Dormí mal')
  })

  it('handles old logs without the new fields and an empty range', () => {
    const old: SessionLog = { id: 'x', date: '2026-01-01', routineId: 'base-a', isMinimalVersion: true, exercises: [] }
    expect(() => buildAnalysisPrompt({ ...base, logs: [old], range: 'all' })).not.toThrow()
    expect(buildAnalysisPrompt({ ...base, logs: [old], range: '4w' })).toContain('No hay sesiones en el rango')
  })
})
