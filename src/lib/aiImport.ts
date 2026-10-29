import type { Equipment } from '../types/program'
import type { Exercise, Routine, RoutineExercise } from '../types/routine'
import { getBuildableWeights } from './plates'
import { AI_RESPONSE_SCHEMA_VERSION } from './aiExport'

/** One proposed change, as the prompt in `aiExport.ts` asks the LLM to write it. */
export type AiChange =
  | { type: 'setWeight'; routineId: string; exerciseId: string; weightKg: number; reason?: string }
  | {
      type: 'updatePrescription'
      routineId: string
      exerciseId: string
      sets?: number
      minReps?: number
      maxReps?: number
      restSec?: number
      reason?: string
    }
  | {
      type: 'swapExercise'
      routineId: string
      fromExerciseId: string
      toExerciseId: string
      weightKg?: number
      reason?: string
    }
  | {
      type: 'addExercise'
      routineId: string
      exerciseId: string
      sets: number
      minReps?: number
      maxReps?: number
      restSec: number
      weightKg?: number
      reason?: string
    }
  | { type: 'removeExercise'; routineId: string; exerciseId: string; reason?: string }

export interface ParsedChange {
  /** The change as the LLM wrote it — kept so an invalid one can still be shown. */
  raw: unknown
  /** Set only when the change passed validation against the current program and equipment. */
  change?: AiChange
  /** Why it can't be applied (Spanish, shown in the UI). */
  error?: string
}

export interface ParsedResponse {
  /** The analysis text outside the JSON block. */
  prose: string
  summary: string
  changes: ParsedChange[]
}

export interface ValidationContext {
  routines: Routine[]
  exercises: Exercise[]
  equipment: Equipment
}

/**
 * Restores one routine slot: removes the exercise the change put there (if any) and puts
 * back what was there before (if anything). Covers every change type — see `applyChange`.
 */
export interface ChangeUndo {
  routineId: string
  before: RoutineExercise | null
  afterExerciseId: string | null
}

export class AiResponseError extends Error {}

/** The JSON object in the response: the last ```json fence, else the last balanced `{…}`. */
function extractJson(text: string): { json: string; prose: string } | null {
  const fences = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/gi)]
  const fence = fences.findLast((m) => m[1].trim().startsWith('{'))
  if (fence) return { json: fence[1], prose: text.replace(fence[0], '').trim() }

  const end = text.lastIndexOf('}')
  if (end === -1) return null
  let depth = 0
  for (let i = end; i >= 0; i--) {
    if (text[i] === '}') depth++
    else if (text[i] === '{' && --depth === 0) {
      return { json: text.slice(i, end + 1), prose: (text.slice(0, i) + text.slice(end + 1)).trim() }
    }
  }
  return null
}

/** Parses the pasted LLM answer and validates each change. Throws `AiResponseError` with a Spanish message. */
export function parseAiResponse(text: string, ctx: ValidationContext): ParsedResponse {
  const extracted = extractJson(text)
  if (!extracted) throw new AiResponseError('No encontré el bloque JSON al final de la respuesta.')

  let data: unknown
  try {
    data = JSON.parse(extracted.json)
  } catch {
    throw new AiResponseError('El bloque JSON de la respuesta no es válido. Pídele a la IA que lo corrija.')
  }
  if (!isObject(data) || !Array.isArray(data.changes)) {
    throw new AiResponseError('El JSON no tiene la lista "changes". Pídele a la IA que use el formato indicado.')
  }
  if (typeof data.schemaVersion === 'number' && data.schemaVersion > AI_RESPONSE_SCHEMA_VERSION) {
    throw new AiResponseError('La respuesta usa un formato más nuevo que esta versión de la app.')
  }

  return {
    prose: extracted.prose,
    summary: typeof data.summary === 'string' ? data.summary : '',
    changes: data.changes.map((raw) => {
      const result = validateChange(raw, ctx)
      return typeof result === 'string' ? { raw, error: result } : { raw, change: result }
    }),
  }
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function intIn(x: unknown, min: number, max: number): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max
}

function optionalReason(raw: Record<string, unknown>): string | undefined {
  return typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : undefined
}

/** Returns the typed change, or a Spanish reason it can't be applied. */
export function validateChange(raw: unknown, ctx: ValidationContext): AiChange | string {
  if (!isObject(raw)) return 'Formato de cambio no reconocido.'
  const routine = ctx.routines.find((r) => r.id === raw.routineId)
  if (!routine) return `La rutina "${String(raw.routineId)}" no existe.`
  const reason = optionalReason(raw)
  const inRoutine = (id: unknown) => routine.exercises.find((re) => re.exerciseId === id)
  const inCatalog = (id: unknown) => ctx.exercises.find((e) => e.id === id)

  /** undefined = fine; string = error. `required` when the exercise uses weight. */
  function checkWeight(exercise: Exercise, weightKg: unknown, required: boolean): string | undefined {
    if (exercise.equipmentType === 'bodyweight') {
      return weightKg === undefined ? undefined : `${exercise.name} es de peso corporal, no lleva peso.`
    }
    if (weightKg === undefined) return required ? `Falta el peso para ${exercise.name}.` : undefined
    if (typeof weightKg !== 'number') return 'El peso no es un número.'
    if (!getBuildableWeights(exercise.equipmentType, ctx.equipment).includes(weightKg)) {
      return `${weightKg} kg no se puede armar con tus discos para ${exercise.name}.`
    }
    return undefined
  }

  function checkReps(sets: unknown, minReps: unknown, maxReps: unknown, restSec: unknown, current?: RoutineExercise) {
    if (sets !== undefined && !intIn(sets, 1, 10)) return 'Número de series fuera de rango (1-10).'
    if (minReps !== undefined && !intIn(minReps, 1, 50)) return 'Repeticiones mínimas fuera de rango (1-50).'
    if (maxReps !== undefined && !intIn(maxReps, 1, 50)) return 'Repeticiones máximas fuera de rango (1-50).'
    if (restSec !== undefined && !intIn(restSec, 0, 600)) return 'Descanso fuera de rango (0-600 s).'
    if ((minReps !== undefined || maxReps !== undefined) && current?.durationSec !== undefined) {
      return 'Este ejercicio se mide por tiempo, no por repeticiones.'
    }
    const min = (minReps as number | undefined) ?? current?.minReps
    const max = (maxReps as number | undefined) ?? current?.maxReps
    if (min !== undefined && max !== undefined && min > max) return 'El mínimo de repeticiones supera al máximo.'
    return undefined
  }

  switch (raw.type) {
    case 'setWeight': {
      const re = inRoutine(raw.exerciseId)
      const exercise = inCatalog(raw.exerciseId)
      if (!re || !exercise) return `El ejercicio "${String(raw.exerciseId)}" no está en ${routine.name}.`
      const error = checkWeight(exercise, raw.weightKg, true)
      if (error) return error
      return { type: 'setWeight', routineId: routine.id, exerciseId: re.exerciseId, weightKg: raw.weightKg as number, reason }
    }
    case 'updatePrescription': {
      const re = inRoutine(raw.exerciseId)
      if (!re) return `El ejercicio "${String(raw.exerciseId)}" no está en ${routine.name}.`
      const { sets, minReps, maxReps, restSec } = raw
      if ([sets, minReps, maxReps, restSec].every((x) => x === undefined)) return 'El cambio no modifica nada.'
      const error = checkReps(sets, minReps, maxReps, restSec, re)
      if (error) return error
      return {
        type: 'updatePrescription',
        routineId: routine.id,
        exerciseId: re.exerciseId,
        ...(sets !== undefined && { sets: sets as number }),
        ...(minReps !== undefined && { minReps: minReps as number }),
        ...(maxReps !== undefined && { maxReps: maxReps as number }),
        ...(restSec !== undefined && { restSec: restSec as number }),
        reason,
      }
    }
    case 'swapExercise': {
      const from = inRoutine(raw.fromExerciseId)
      const to = inCatalog(raw.toExerciseId)
      if (!from) return `El ejercicio "${String(raw.fromExerciseId)}" no está en ${routine.name}.`
      if (!to) return `El ejercicio "${String(raw.toExerciseId)}" no está en el catálogo.`
      if (inRoutine(to.id)) return `${to.name} ya está en ${routine.name}.`
      const error = checkWeight(to, raw.weightKg, false)
      if (error) return error
      return {
        type: 'swapExercise',
        routineId: routine.id,
        fromExerciseId: from.exerciseId,
        toExerciseId: to.id,
        ...(raw.weightKg !== undefined && { weightKg: raw.weightKg as number }),
        reason,
      }
    }
    case 'addExercise': {
      const exercise = inCatalog(raw.exerciseId)
      if (!exercise) return `El ejercicio "${String(raw.exerciseId)}" no está en el catálogo.`
      if (inRoutine(exercise.id)) return `${exercise.name} ya está en ${routine.name}.`
      const sets = raw.sets ?? exercise.defaultSets
      const restSec = raw.restSec ?? exercise.defaultRestSec
      const minReps = raw.minReps ?? exercise.defaultMinReps
      const maxReps = raw.maxReps ?? exercise.defaultMaxReps
      const error = checkReps(sets, minReps, maxReps, restSec) ?? checkWeight(exercise, raw.weightKg, false)
      if (error) return error
      return {
        type: 'addExercise',
        routineId: routine.id,
        exerciseId: exercise.id,
        sets: sets as number,
        restSec: restSec as number,
        ...(minReps !== undefined && { minReps: minReps as number }),
        ...(maxReps !== undefined && { maxReps: maxReps as number }),
        ...(raw.weightKg !== undefined && { weightKg: raw.weightKg as number }),
        reason,
      }
    }
    case 'removeExercise': {
      const re = inRoutine(raw.exerciseId)
      if (!re) return `El ejercicio "${String(raw.exerciseId)}" no está en ${routine.name}.`
      if (routine.exercises.length <= 1) return `${routine.name} se quedaría sin ejercicios.`
      return { type: 'removeExercise', routineId: routine.id, exerciseId: re.exerciseId, reason }
    }
    default:
      return `Tipo de cambio desconocido: "${String(raw.type)}".`
  }
}

function replaceSlot(exercises: RoutineExercise[], undo: ChangeUndo, next: RoutineExercise | null): RoutineExercise[] {
  const id = undo.afterExerciseId ?? undo.before?.exerciseId
  const kept = exercises.filter((re) => re.exerciseId !== id && re.exerciseId !== undo.before?.exerciseId)
  return next ? [...kept, next] : kept
}

/**
 * Applies a validated change to `routine`, returning its new exercise list and how to
 * undo it. Throws `AiResponseError` if the routine changed since validation in a way that
 * makes the change meaningless (e.g. the exercise was removed in the meantime).
 */
export function applyChange(
  routine: Routine,
  change: AiChange,
  exercises: Exercise[],
): { exercises: RoutineExercise[]; undo: ChangeUndo } {
  const find = (id: string) => routine.exercises.find((re) => re.exerciseId === id)
  const stale = () => new AiResponseError('La rutina cambió desde el análisis; este cambio ya no aplica.')

  switch (change.type) {
    case 'setWeight':
    case 'updatePrescription': {
      const before = find(change.exerciseId)
      if (!before) throw stale()
      const { type: _t, routineId: _r, exerciseId: _e, reason: _why, ...fields } = change
      const after: RoutineExercise =
        change.type === 'setWeight' ? { ...before, nextWeightKg: change.weightKg } : { ...before, ...fields }
      const undo = { routineId: routine.id, before, afterExerciseId: before.exerciseId }
      return { exercises: replaceSlot(routine.exercises, undo, after), undo }
    }
    case 'swapExercise': {
      const before = find(change.fromExerciseId)
      if (!before || find(change.toExerciseId)) throw stale()
      const after: RoutineExercise = {
        exerciseId: change.toExerciseId,
        order: before.order,
        sets: before.sets,
        minReps: before.minReps,
        maxReps: before.maxReps,
        reps: before.reps,
        durationSec: before.durationSec,
        restSec: before.restSec,
        ...(change.weightKg !== undefined && { initialWeightKg: change.weightKg }),
      }
      const undo = { routineId: routine.id, before, afterExerciseId: change.toExerciseId }
      return { exercises: replaceSlot(routine.exercises, undo, after), undo }
    }
    case 'addExercise': {
      if (find(change.exerciseId)) throw stale()
      const catalog = exercises.find((e) => e.id === change.exerciseId)
      const order = routine.exercises.reduce((m, re) => Math.max(m, re.order), -1) + 1
      const after: RoutineExercise = {
        exerciseId: change.exerciseId,
        order,
        sets: change.sets,
        minReps: change.minReps,
        maxReps: change.maxReps,
        reps: change.minReps === undefined ? catalog?.defaultReps : undefined,
        durationSec: change.minReps === undefined ? catalog?.defaultDurationSec : undefined,
        restSec: change.restSec,
        ...(change.weightKg !== undefined && { initialWeightKg: change.weightKg }),
      }
      const undo = { routineId: routine.id, before: null, afterExerciseId: change.exerciseId }
      return { exercises: [...routine.exercises, after], undo }
    }
    case 'removeExercise': {
      const before = find(change.exerciseId)
      if (!before) throw stale()
      const undo = { routineId: routine.id, before, afterExerciseId: null }
      return { exercises: replaceSlot(routine.exercises, undo, null), undo }
    }
  }
}

/** The routine's exercise list with one applied change reverted. */
export function revertChange(routine: Routine, undo: ChangeUndo): RoutineExercise[] {
  return replaceSlot(routine.exercises, undo, undo.before)
}
