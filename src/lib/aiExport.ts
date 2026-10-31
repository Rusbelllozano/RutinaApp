import type { Equipment } from '../types/program'
import type { Exercise, ProgramMode, Routine, RoutineExercise, SessionLog, SessionLogExercise } from '../types/routine'
import { getBuildableWeights } from './plates'
import { findProgressionLog, suggestProgression } from './progression'
import { resolveInitialLoad, withResolvedInitialWeight } from './initialLoad'
import { sortedExercises, repsRangeLabel } from './sessionRules'
import { equipmentLabels } from './equipmentLabels'
import { effortLabel } from './effort'
import { toISODate } from './date'
import { formatCardioEntry } from './exerciseKind'

/** Response format version the prompt asks for — `aiImport.ts` refuses anything newer. */
export const AI_RESPONSE_SCHEMA_VERSION = 1

export type ExportRange = '4w' | '8w' | 'all'

export const EXPORT_RANGE_DAYS: Record<ExportRange, number | null> = { '4w': 28, '8w': 56, all: null }

export interface AnalysisExportInput {
  logs: SessionLog[]
  exercises: Exercise[]
  routines: Routine[]
  equipment: Equipment
  rotationOrder: string[]
  mode: ProgramMode
  range: ExportRange
  /** ISO date the export is made on. */
  today: string
}

/** Logs inside `range`, counting back from `today` (inclusive). `logs` stays oldest-first. */
export function logsInRange(logs: SessionLog[], range: ExportRange, today: string): SessionLog[] {
  const days = EXPORT_RANGE_DAYS[range]
  if (days === null) return logs
  const d = new Date(`${today}T12:00:00`)
  d.setDate(d.getDate() - (days - 1))
  const cutoff = toISODate(d)
  return logs.filter((l) => l.date >= cutoff)
}

/**
 * The self-contained Markdown prompt for an external LLM (docs/specs/06-ai-analysis.md):
 * instructions, equipment and buildable loads, the current program, the catalog, the
 * sessions in range, and the exact JSON the answer must end with so the app can parse it
 * back. Written in Spanish — the analysis is for the user to read.
 */
export function buildAnalysisPrompt(input: AnalysisExportInput): string {
  const { exercises, routines, equipment, range, today } = input
  const logs = logsInRange(input.logs, range, today)
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  const routineById = new Map(routines.map((r) => [r.id, r]))
  const nameOf = (id: string) => exerciseById.get(id)?.name ?? `(ejercicio eliminado: ${id})`

  const sections = [
    instructionsSection(input.mode, logs.length, range, today),
    equipmentSection(equipment),
    programSection(input, exerciseById),
    catalogSection(exercises),
    summarySection(logs, nameOf),
    sessionsSection(logs, routineById, nameOf),
    responseFormatSection(),
  ]
  return sections.join('\n\n') + '\n'
}

function instructionsSection(mode: ProgramMode, count: number, range: ExportRange, today: string): string {
  const rangeLabel = range === 'all' ? 'todo el historial' : range === '4w' ? 'últimas 4 semanas' : 'últimas 8 semanas'
  return `# Análisis de entrenamiento — RutinaApp

Exportado el ${today} · ${count} sesiones (${rangeLabel}) · modo activo: ${mode === 'pro' ? 'PRO (lunes a viernes)' : 'Base (rotación A-B-C)'}

## Tu rol

Actúa como entrenador de fuerza. Entreno en casa con el equipo limitado que se detalla abajo. Analiza mis sesiones y propón ajustes concretos para mejorar y calibrar el programa.

Analiza, como mínimo:
1. **Adherencia**: frecuencia real, huecos, uso de la sesión mínima (20 min). Sin culparme: tono neutral.
2. **Progresión por ejercicio**: evolución de peso y repeticiones, estancamientos, ejercicios que suben demasiado rápido o demasiado lento.
3. **Esfuerzo**: relación entre la percepción (Fácil / Justo / Al límite) y las repeticiones logradas. "Fácil" en el tope del rango sugiere subir; "Al límite" sin llegar al mínimo sugiere bajar.
4. **Tiempo**: duración de las sesiones y descanso real frente al prescrito.
5. **Balance**: volumen semanal por grupo muscular.

## Reglas del programa (respétalas en tus propuestas)

- **Doble progresión**: +1 repetición por serie cada semana; al completar el tope del rango en todas las series, subir +2.5 kg y volver al mínimo del rango. La app ya hace esto sola: propón cambios de peso solo cuando la calibración sea claramente incorrecta.
- **Solo pesos armables**: usa únicamente los pesos de la lista "Pesos armables" de cada tipo de equipo. Nunca cargas asimétricas.
- **Sesión mínima**: 3 primeros ejercicios × 2 series; cuenta como sesión completa.
- **Descarga** cada 6-8 semanas: 60% de la carga habitual durante 6 sesiones (si la recomiendas, menciónala en el análisis, no como cambio).
- Usa solo los \`routineId\` y \`exerciseId\` que aparecen en este documento. Para cambiar o añadir un ejercicio, elige uno del catálogo.
- Propón pocos cambios y bien justificados (normalmente 0-8). Si algo funciona, no lo toques.`
}

function equipmentSection(equipment: Equipment): string {
  const plates = equipment.plates.map((p) => `${p.quantity} × ${p.kg} kg`).join(', ')
  const lines = (['barbell', 'dumbbell_pair', 'single_dumbbell'] as const).map(
    (t) => `- **${equipmentLabels[t]}** (\`${t}\`): ${getBuildableWeights(t, equipment).join(', ')} kg`,
  )
  return `## Equipo

- Barra: ${equipment.barbell.weightKg} kg · Mancuernas (barra corta): ${equipment.dumbbellHandle.weightKg} kg c/u, ${equipment.dumbbellHandle.quantity} unidades
- Discos (inventario compartido entre todas las barras): ${plates}

### Pesos armables (incluyen la barra; en Mancuernas (par), peso de cada mancuerna)

${lines.join('\n')}`
}

function currentWeight(
  routine: Routine,
  re: RoutineExercise,
  input: AnalysisExportInput,
  exerciseById: Map<string, Exercise>,
): number | undefined {
  const load = resolveInitialLoad(routine, re, (id) => exerciseById.get(id)?.equipmentType, input.equipment)
  const last = findProgressionLog(input.logs, re.exerciseId, routine.id)?.entry
  return suggestProgression(withResolvedInitialWeight(re, load), last).suggestedWeightKg
}

function programSection(input: AnalysisExportInput, exerciseById: Map<string, Exercise>): string {
  const visible = input.routines.filter((r) => r.exercises.length > 0)
  const blocks = visible.map((r) => {
    const tags = [
      r.mode === 'pro' ? `PRO${r.weekday ? `, día ${r.weekday}` : ''}` : r.mode === 'base' ? 'Base' : 'personalizada',
      input.rotationOrder.includes(r.id) ? `rotación #${input.rotationOrder.indexOf(r.id) + 1}` : null,
    ].filter(Boolean)
    const rows = sortedExercises(r).map((re) => {
      const ex = exerciseById.get(re.exerciseId)
      const kg = currentWeight(r, re, input, exerciseById)
      return `| ${re.order} | \`${re.exerciseId}\` | ${re.nameOverride ?? ex?.name ?? re.exerciseId} | ${ex ? equipmentLabels[ex.equipmentType] : '—'} | ${re.sets} | ${repsRangeLabel(re) || '—'} | ${re.restSec} s | ${kg !== undefined ? `${kg} kg` : '—'} |`
    })
    return `### ${r.name} — \`${r.id}\` (${tags.join(', ')})

| # | exerciseId | Ejercicio | Equipo | Series | Reps / tiempo | Descanso | Peso actual |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}`
  })
  return `## Programa actual

"Peso actual" es lo que la app sugerirá la próxima vez.

${blocks.join('\n\n')}`
}

function catalogSection(exercises: Exercise[]): string {
  const rows = exercises.map(
    (e) => `| \`${e.id}\` | ${e.name} | ${equipmentLabels[e.equipmentType]} | ${e.muscleGroups.join(', ')} |`,
  )
  return `## Catálogo de ejercicios disponibles

| exerciseId | Ejercicio | Equipo | Grupos musculares |
|---|---|---|---|
${rows.join('\n')}`
}

function topSet(entry: SessionLogExercise) {
  return entry.sets.reduce<SessionLogExercise['sets'][number] | undefined>(
    (best, s) =>
      best === undefined || (s.weightKg ?? 0) > (best.weightKg ?? 0) || (s.distanceKm ?? 0) > (best.distanceKm ?? 0)
        ? s
        : best,
    undefined,
  )
}

function setLabel(s: SessionLogExercise['sets'][number] | undefined): string {
  if (!s) return '—'
  if (s.distanceKm !== undefined) return formatCardioEntry(s)
  const work = s.reps !== undefined ? `${s.reps}` : s.durationSec !== undefined ? `${s.durationSec}s` : '—'
  return s.weightKg !== undefined ? `${s.weightKg} kg × ${work}` : work
}

function summarySection(logs: SessionLog[], nameOf: (id: string) => string): string {
  if (logs.length === 0) return '## Resumen\n\nNo hay sesiones en el rango exportado.'
  const first = new Date(`${logs[0].date}T12:00:00`)
  const last = new Date(`${logs.at(-1)!.date}T12:00:00`)
  const weeks = Math.max(1, (last.getTime() - first.getTime()) / (7 * 86_400_000))
  const durations = logs.map((l) => l.durationMin).filter((d): d is number => d !== undefined)
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : undefined

  const perExercise = new Map<string, { firstDate: string; first: SessionLogExercise; lastDate: string; last: SessionLogExercise; count: number; efforts: string[] }>()
  for (const log of logs) {
    for (const e of log.exercises) {
      const cur = perExercise.get(e.exerciseId)
      if (cur) Object.assign(cur, { lastDate: log.date, last: e, count: cur.count + 1 })
      else perExercise.set(e.exerciseId, { firstDate: log.date, first: e, lastDate: log.date, last: e, count: 1, efforts: [] })
      if (e.effort) perExercise.get(e.exerciseId)!.efforts.push(effortLabel(e.effort))
    }
  }
  const rows = [...perExercise].map(([id, p]) => {
    const efforts = p.efforts.length
      ? Object.entries(p.efforts.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }), {}))
          .map(([k, v]) => `${k} ${v}`)
          .join(', ')
      : '—'
    return `| ${nameOf(id)} | ${p.count} | ${p.firstDate}: ${setLabel(topSet(p.first))} | ${p.lastDate}: ${setLabel(topSet(p.last))} | ${efforts} |`
  })

  return `## Resumen calculado

- Sesiones: ${logs.length} entre ${logs[0].date} y ${logs.at(-1)!.date} (≈ ${(logs.length / weeks).toFixed(1)} por semana)
- Sesiones mínimas: ${logs.filter((l) => l.isMinimalVersion).length}
- Duración media: ${avgDuration !== undefined ? `${avgDuration} min` : 'sin datos'}

| Ejercicio | Sesiones | Primera (mejor serie) | Última (mejor serie) | Esfuerzo |
|---|---|---|---|---|
${rows.join('\n')}`
}

function clockTime(epochMs: number): string {
  const d = new Date(epochMs)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function sessionsSection(logs: SessionLog[], routineById: Map<string, Routine>, nameOf: (id: string) => string): string {
  if (logs.length === 0) return '## Sesiones\n\nSin sesiones.'
  const blocks = logs.map((log) => {
    const routine = routineById.get(log.routineId)
    const meta = [
      log.startedAt !== undefined ? `inicio ${clockTime(log.startedAt)}` : null,
      log.durationMin !== undefined ? `${log.durationMin} min` : null,
      log.isMinimalVersion ? 'sesión mínima' : null,
      log.source === 'manual' ? 'registrada a posteriori (sin cronómetro)' : null,
    ].filter(Boolean)
    const rows = log.exercises.flatMap((e) => {
      const re = routine?.exercises.find((x) => x.exerciseId === e.exerciseId)
      return e.sets.map((s, i) => {
        const rest = s.restTakenSec !== undefined ? `${s.restTakenSec} s${re ? ` / ${re.restSec} s` : ''}` : '—'
        return `| ${i === 0 ? nameOf(e.exerciseId) : ''} | ${s.setIndex + 1} | ${s.weightKg ?? '—'} | ${s.distanceKm !== undefined ? formatCardioEntry(s) : (s.reps ?? (s.durationSec !== undefined ? `${s.durationSec}s` : '—'))} | ${rest} | ${i === 0 && e.effort ? effortLabel(e.effort) : ''} |`
      })
    })
    return `### ${log.date} — ${routine?.name ?? 'Rutina eliminada'} (\`${log.routineId}\`)${meta.length ? ` · ${meta.join(' · ')}` : ''}
${log.note ? `\nNota: ${log.note.replace(/\s+/g, ' ')}\n` : ''}
| Ejercicio | Serie | kg | Reps / tiempo | Descanso real / prescrito | Esfuerzo |
|---|---|---|---|---|---|
${rows.join('\n')}`
  })
  return `## Sesiones (de la más antigua a la más reciente)

${blocks.join('\n\n')}`
}

function responseFormatSection(): string {
  return `## Formato de tu respuesta (obligatorio)

1. Primero, tu análisis en español, en texto normal (puedes usar títulos y listas).
2. Al final, **un único bloque \`\`\`json** con exactamente esta estructura, que pegaré de vuelta en la app:

\`\`\`json
{
  "schemaVersion": ${AI_RESPONSE_SCHEMA_VERSION},
  "summary": "Resumen del análisis en 1-3 frases.",
  "changes": [
    { "type": "setWeight", "routineId": "…", "exerciseId": "…", "weightKg": 0, "reason": "…" },
    { "type": "updatePrescription", "routineId": "…", "exerciseId": "…", "sets": 3, "minReps": 8, "maxReps": 12, "restSec": 90, "reason": "…" },
    { "type": "swapExercise", "routineId": "…", "fromExerciseId": "…", "toExerciseId": "…", "weightKg": 0, "reason": "…" },
    { "type": "addExercise", "routineId": "…", "exerciseId": "…", "sets": 3, "minReps": 8, "maxReps": 12, "restSec": 90, "weightKg": 0, "reason": "…" },
    { "type": "removeExercise", "routineId": "…", "exerciseId": "…", "reason": "…" }
  ]
}
\`\`\`

- \`setWeight\`: peso de trabajo para la próxima sesión de ese ejercicio en esa rutina; debe estar en "Pesos armables".
- \`updatePrescription\`: incluye solo los campos que cambian (\`sets\`, \`minReps\`, \`maxReps\`, \`restSec\`).
- \`swapExercise\`: reemplaza un ejercicio por otro del catálogo, conservando series, reps y descanso.
- \`addExercise\` se añade al final de la rutina.
- En \`swapExercise\` y \`addExercise\`, \`weightKg\` es el peso inicial (obligatorio si el ejercicio usa barra o mancuernas, omítelo si es de peso corporal).
- \`reason\`: una frase corta en español explicando el porqué.
- Si no recomiendas cambios, usa \`"changes": []\`.`
}
