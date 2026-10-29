import { useMemo, useRef, useState } from 'react'
import { useHistoryStore } from '../store/useHistoryStore'
import { useExerciseStore } from '../store/useExerciseStore'
import { useRoutineStore } from '../store/useRoutineStore'
import { useRotationStore } from '../store/useRotationStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useModeStore } from '../store/useModeStore'
import { useAnalysisStore, type Analysis, type AnalysisChange } from '../store/useAnalysisStore'
import { buildAnalysisPrompt, logsInRange, type ExportRange } from '../lib/aiExport'
import { AiResponseError, parseAiResponse, type AiChange } from '../lib/aiImport'
import { repsRangeLabel } from '../lib/sessionRules'
import { todayISODate } from '../lib/date'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionLabel } from '../components/ui/SectionLabel'
import type { Exercise, Routine, RoutineExercise } from '../types/routine'

const RANGES: { id: ExportRange; label: string }[] = [
  { id: '4w', label: '4 semanas' },
  { id: '8w', label: '8 semanas' },
  { id: 'all', label: 'Todo' },
]

const STATUS_LABELS: Record<AnalysisChange['status'], string> = {
  pending: 'Pendiente',
  applied: 'Aplicado',
  discarded: 'Descartado',
  invalid: 'No aplicable',
  reverted: 'Deshecho',
}

/**
 * AI analysis round trip (docs/specs/06-ai-analysis.md): export a self-contained prompt
 * for any chat LLM, paste its answer back, and accept or discard each proposed change.
 * Nothing changes in the program without an explicit "Aceptar".
 */
export function AiAnalysis() {
  const analyses = useAnalysisStore((s) => s.analyses)
  const [range, setRange] = useState<ExportRange>('all')

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Análisis con IA" />
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-6 pt-3">
        <ExportCard range={range} onRangeChange={setRange} />
        <ImportCard range={range} />
        {analyses.length > 0 && (
          <div className="flex flex-col gap-3">
            <SectionLabel>Análisis importados</SectionLabel>
            {analyses.map((a, i) => (
              <AnalysisCard key={a.id} analysis={a} initiallyOpen={i === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ExportCard({ range, onRangeChange }: { range: ExportRange; onRangeChange: (r: ExportRange) => void }) {
  const logs = useHistoryStore((s) => s.logs)
  const exercises = useExerciseStore((s) => s.exercises)
  const routines = useRoutineStore((s) => s.routines)
  const rotationOrder = useRotationStore((s) => s.order)
  const equipment = useSettingsStore((s) => s.equipment)
  const mode = useModeStore((s) => s.mode)
  const [feedback, setFeedback] = useState<string | null>(null)

  const today = todayISODate()
  const count = useMemo(() => logsInRange(logs, range, today).length, [logs, range, today])

  function prompt() {
    return buildAnalysisPrompt({ logs, exercises, routines, equipment, rotationOrder, mode, range, today })
  }
  const fileName = `rutina-analisis-${today}.md`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt())
      setFeedback('Copiado. Pégalo en el chat de tu IA.')
    } catch {
      setFeedback('No se pudo copiar. Usa "Descargar" y adjunta el archivo.')
    }
  }

  function handleDownload() {
    const url = URL.createObjectURL(new Blob([prompt()], { type: 'text/markdown' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setFeedback('Descargado. Adjúntalo o pega su contenido en tu IA.')
  }

  async function handleShare() {
    const file = new File([prompt()], fileName, { type: 'text/markdown' })
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Análisis RutinaApp' })
      else await navigator.share({ title: 'Análisis RutinaApp', text: prompt() })
    } catch {
      // The user closed the share sheet — nothing to report.
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <SectionLabel>1 · Exportar sesiones</SectionLabel>
      <div className="text-sm text-text-secondary">
        Crea un texto con tu equipo, tu programa y tus sesiones, con instrucciones para la IA. Pégalo en ChatGPT,
        Claude o Gemini.
      </div>
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => onRangeChange(r.id)}>
            <Chip active={range === r.id}>{r.label}</Chip>
          </button>
        ))}
      </div>
      <div className="text-sm text-text-secondary">
        <span className="font-mono text-text">{count}</span> {count === 1 ? 'sesión' : 'sesiones'} en el rango
      </div>
      <div className="flex gap-3">
        <Button size="md" className="flex-1" onClick={() => void handleCopy()} disabled={count === 0}>
          Copiar
        </Button>
        <Button variant="secondary" size="md" className="flex-1" onClick={handleDownload} disabled={count === 0}>
          Descargar
        </Button>
        {'share' in navigator && (
          <Button variant="secondary" size="md" className="flex-1" onClick={() => void handleShare()} disabled={count === 0}>
            Compartir
          </Button>
        )}
      </div>
      {feedback && <div className="text-sm text-text-secondary">{feedback}</div>}
    </Card>
  )
}

function ImportCard({ range }: { range: ExportRange }) {
  const addAnalysis = useAnalysisStore((s) => s.addAnalysis)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function review(text: string) {
    setError(null)
    try {
      const parsed = parseAiResponse(text, {
        routines: useRoutineStore.getState().routines,
        exercises: useExerciseStore.getState().exercises,
        equipment: useSettingsStore.getState().equipment,
      })
      addAnalysis(parsed, range)
      setText('')
    } catch (e) {
      setError(e instanceof AiResponseError ? e.message : 'No se pudo leer la respuesta.')
    }
  }

  // The content goes into the textarea too, so a parse error leaves it visible to check.
  async function handleFile(file: File) {
    try {
      const content = await file.text()
      setText(content)
      review(content)
    } catch {
      setError('No se pudo leer el archivo.')
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <SectionLabel>2 · Pegar la respuesta</SectionLabel>
      <div className="text-sm text-text-secondary">
        Pega aquí la respuesta completa de la IA o sube el archivo (.md, .txt o .json). Revisarás cada cambio
        antes de aplicarlo.
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Pega la respuesta, incluido el bloque JSON del final…"
        className="w-full rounded-xl border border-border bg-bg-elevated-2 px-3 py-2.5 font-mono text-[13px] text-text placeholder:font-sans placeholder:text-text-tertiary focus:outline-none"
      />
      <div className="flex gap-3">
        <Button size="md" className="flex-1" onClick={() => review(text)} disabled={text.trim() === ''}>
          Revisar cambios
        </Button>
        <Button variant="secondary" size="md" className="flex-1" onClick={() => fileInputRef.current?.click()}>
          Subir archivo
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.json,text/plain,text/markdown,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
      {error && <div className="text-sm text-text-secondary">{error}</div>}
    </Card>
  )
}

function AnalysisCard({ analysis, initiallyOpen }: { analysis: Analysis; initiallyOpen: boolean }) {
  const applyChange = useAnalysisStore((s) => s.applyChange)
  const undoAnalysis = useAnalysisStore((s) => s.undoAnalysis)
  const deleteAnalysis = useAnalysisStore((s) => s.deleteAnalysis)
  const [open, setOpen] = useState(initiallyOpen)
  const [showProse, setShowProse] = useState(false)
  const [errors, setErrors] = useState<Record<number, string>>({})

  const pending = analysis.changes.flatMap((c, i) => (c.status === 'pending' ? [i] : []))
  const appliedCount = analysis.changes.filter((c) => c.status === 'applied').length
  const date = new Date(analysis.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

  function accept(indices: number[]) {
    const next = { ...errors }
    for (const i of indices) {
      const error = applyChange(analysis.id, i)
      if (error) next[i] = error
      else delete next[i]
    }
    setErrors(next)
  }

  function handleUndo() {
    if (window.confirm(`¿Deshacer los ${appliedCount} cambios aplicados de este análisis?`)) undoAnalysis(analysis.id)
  }

  function handleDelete() {
    const warning = appliedCount > 0 ? ' Los cambios ya aplicados se mantienen.' : ''
    if (window.confirm(`¿Borrar este análisis?${warning}`)) deleteAnalysis(analysis.id)
  }

  return (
    <Card className="flex flex-col gap-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex flex-col gap-1 text-left">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-text-tertiary">{date}</div>
          <div className="text-xs text-text-secondary">
            {analysis.changes.length} cambios · {appliedCount} aplicados
          </div>
        </div>
        <div className="text-[15px] font-medium">{analysis.summary || 'Análisis sin resumen'}</div>
      </button>

      {open && (
        <>
          {analysis.prose && (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setShowProse((s) => !s)} className="text-left text-sm font-medium text-accent">
                {showProse ? 'Ocultar análisis completo' : 'Ver análisis completo'}
              </button>
              {showProse && (
                <div className="whitespace-pre-wrap rounded-xl bg-bg-elevated-2 p-3 text-[13px] leading-relaxed text-text-secondary">
                  {analysis.prose}
                </div>
              )}
            </div>
          )}

          {analysis.changes.length === 0 ? (
            <div className="text-sm text-text-secondary">La IA no propuso cambios.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {analysis.changes.map((c, i) => (
                <ChangeRow
                  key={i}
                  item={c}
                  error={errors[i]}
                  onAccept={() => accept([i])}
                  onDiscard={() => useAnalysisStore.getState().discardChange(analysis.id, i)}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {pending.length > 1 && (
              <Button size="md" onClick={() => accept(pending)}>
                Aceptar todos ({pending.length})
              </Button>
            )}
            {appliedCount > 0 && (
              <Button variant="secondary" size="md" onClick={handleUndo}>
                Deshacer cambios aplicados
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              Borrar análisis
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

function ChangeRow({
  item,
  error,
  onAccept,
  onDiscard,
}: {
  item: AnalysisChange
  error?: string
  onAccept: () => void
  onDiscard: () => void
}) {
  const routines = useRoutineStore((s) => s.routines)
  const exercises = useExerciseStore((s) => s.exercises)
  const described = item.change ? describeChange(item.change, routines, exercises, item.undo?.before) : null
  const reason = item.change?.reason ?? (isRecord(item.raw) && typeof item.raw.reason === 'string' ? item.raw.reason : undefined)

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-bg-elevated-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium">{described?.title ?? 'Cambio no aplicable'}</div>
        <Chip active={item.status === 'applied'} className="flex-shrink-0">
          {STATUS_LABELS[item.status]}
        </Chip>
      </div>
      {described?.detail && <div className="font-mono text-[13px] text-text">{described.detail}</div>}
      {described?.routineName && <div className="text-xs text-text-tertiary">{described.routineName}</div>}
      {reason && <div className="text-[13px] text-text-secondary">{reason}</div>}
      {item.error && <div className="text-[13px] text-text-secondary">No aplicable: {item.error}</div>}
      {error && <div className="text-[13px] text-text-secondary">{error}</div>}
      {item.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1" onClick={onAccept}>
            Aceptar
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={onDiscard}>
            Descartar
          </Button>
        </div>
      )}
    </div>
  )
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

/** Spanish title + before → after line for one change. `appliedBefore` is the slot as it was before applying. */
function describeChange(
  change: AiChange,
  routines: Routine[],
  exercises: Exercise[],
  appliedBefore?: RoutineExercise | null,
): { title: string; detail?: string; routineName?: string } {
  const routine = routines.find((r) => r.id === change.routineId)
  const nameOf = (id: string) => exercises.find((e) => e.id === id)?.name ?? id
  const current = (id: string) => appliedBefore ?? routine?.exercises.find((re) => re.exerciseId === id)
  const routineName = routine?.name

  switch (change.type) {
    case 'setWeight':
      return { title: `Peso · ${nameOf(change.exerciseId)}`, detail: `→ ${change.weightKg} kg la próxima sesión`, routineName }
    case 'updatePrescription': {
      const before = current(change.exerciseId)
      const parts: string[] = []
      if (change.sets !== undefined) parts.push(`series ${before?.sets ?? '?'} → ${change.sets}`)
      if (change.minReps !== undefined || change.maxReps !== undefined) {
        const after = `${change.minReps ?? before?.minReps}-${change.maxReps ?? before?.maxReps} reps`
        parts.push(`${before ? repsRangeLabel(before) || '—' : '?'} → ${after}`)
      }
      if (change.restSec !== undefined) parts.push(`descanso ${before?.restSec ?? '?'} s → ${change.restSec} s`)
      return { title: `Prescripción · ${nameOf(change.exerciseId)}`, detail: parts.join(' · '), routineName }
    }
    case 'swapExercise':
      return {
        title: 'Cambiar ejercicio',
        detail: `${nameOf(change.fromExerciseId)} → ${nameOf(change.toExerciseId)}${change.weightKg !== undefined ? ` (${change.weightKg} kg)` : ''}`,
        routineName,
      }
    case 'addExercise': {
      const reps = change.minReps !== undefined ? `${change.minReps}-${change.maxReps} reps` : ''
      return {
        title: `Añadir · ${nameOf(change.exerciseId)}`,
        detail: [`${change.sets} series`, reps, `${change.restSec} s`, change.weightKg !== undefined ? `${change.weightKg} kg` : '']
          .filter(Boolean)
          .join(' · '),
        routineName,
      }
    }
    case 'removeExercise':
      return { title: `Quitar · ${nameOf(change.exerciseId)}`, routineName }
  }
}
