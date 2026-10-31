import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useRoutineStore } from '../store/useRoutineStore'
import { useExerciseStore } from '../store/useExerciseStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useRotationStore } from '../store/useRotationStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useModeStore } from '../store/useModeStore'
import { getBuildableWeights } from '../lib/plates'
import { prefillSessionExercises, isLatestDate } from '../lib/backfill'
import { exerciseKind, isSingleEntryKind, kindLabels } from '../lib/exerciseKind'
import { equipmentLabels } from '../lib/equipmentLabels'
import { getRoutineColor } from '../lib/routineColor'
import { isoDateDaysAgo, todayISODate } from '../lib/date'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionLabel } from '../components/ui/SectionLabel'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { CardioEntryFields } from '../components/CardioEntryFields'
import { EffortChips } from '../components/EffortChips'
import type { Equipment } from '../types/program'
import type { Exercise, LoggedSet, Routine, SessionLogExercise } from '../types/routine'

interface DraftExercise extends SessionLogExercise {
  /** Unchecked = "no lo hice": left out of the saved log. */
  included: boolean
}

const inputClass =
  'h-11 w-full rounded-xl border border-border bg-bg-elevated-2 px-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none'

function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface MiniStepperProps {
  label: string
  value: number | undefined
  onStep: (dir: 1 | -1) => void
}

function MiniStepper({ label, value, onStep }: MiniStepperProps) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-xl border border-border bg-bg-elevated-2 px-1">
      <button
        type="button"
        aria-label={`Menos ${label}`}
        onClick={() => onStep(-1)}
        className="flex h-9 w-8 items-center justify-center text-lg text-text-secondary"
      >
        −
      </button>
      <div className="text-center">
        <div className="font-mono text-[15px] font-semibold leading-none">{value ?? '—'}</div>
        <div className="text-[9px] uppercase tracking-wide text-text-tertiary">{label}</div>
      </div>
      <button
        type="button"
        aria-label={`Más ${label}`}
        onClick={() => onStep(1)}
        className="flex h-9 w-8 items-center justify-center text-lg text-text-secondary"
      >
        +
      </button>
    </div>
  )
}

/** Base / PRO / Mis rutinas — every routine, so any session can be logged on any day. */
function groupRoutines(routines: Routine[], activeMode: 'base' | 'pro') {
  const groups = [
    { id: 'base', label: 'Base', items: routines.filter((r) => r.mode === 'base') },
    { id: 'pro', label: 'PRO', items: routines.filter((r) => r.mode === 'pro') },
    { id: 'custom', label: 'Mis rutinas', items: routines.filter((r) => r.mode === undefined) },
  ].filter((g) => g.items.length > 0)
  // The active mode's routines first.
  return activeMode === 'pro' ? [...groups.filter((g) => g.id === 'pro'), ...groups.filter((g) => g.id !== 'pro')] : groups
}

/**
 * Log a session done earlier — or edit/delete one logged that way
 * (docs/specs/07-exercise-types-and-backfill.md, Part 2). `?date=` picks the day
 * (default: yesterday), `?edit=<logId>` opens an existing backfilled log.
 */
export function LogSession() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')

  const logs = useHistoryStore((s) => s.logs)
  const addLog = useHistoryStore((s) => s.addLog)
  const updateLog = useHistoryStore((s) => s.updateLog)
  const deleteLog = useHistoryStore((s) => s.deleteLog)
  const routines = useRoutineStore((s) => s.routines)
  const getRoutineById = useRoutineStore((s) => s.getRoutineById)
  const getExerciseById = useExerciseStore((s) => s.getExerciseById)
  const equipment = useSettingsStore((s) => s.equipment)
  const mode = useModeStore((s) => s.mode)
  const nextRoutineId = useRotationStore((s) => s.getNextRoutineId())

  const editing = editId ? logs.find((l) => l.id === editId && l.source === 'manual') : undefined
  const today = todayISODate()
  const requestedDate = params.get('date')
  const initialDate = editing?.date ?? (requestedDate && requestedDate <= today ? requestedDate : isoDateDaysAgo(1))

  const [date, setDate] = useState(initialDate)
  const [routineId, setRoutineId] = useState<string | undefined>(editing?.routineId)
  const [draft, setDraft] = useState<DraftExercise[]>(
    () => editing?.exercises.map((e) => ({ ...e, included: true })) ?? [],
  )
  const [note, setNote] = useState(editing?.note ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const routine = routineId ? getRoutineById(routineId) : undefined
  const groups = useMemo(() => groupRoutines(routines, mode), [routines, mode])

  if (editId && !editing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="text-text-secondary">Esa sesión ya no existe o no se puede editar.</div>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>
    )
  }

  function pickRoutine(r: Routine) {
    setRoutineId(r.id)
    setDraft(
      prefillSessionExercises({ routine: r, logs, date, getExercise: getExerciseById, equipment }).map((e) => ({
        ...e,
        included: true,
      })),
    )
  }

  function patchExercise(exerciseId: string, patch: Partial<DraftExercise>) {
    setDraft((prev) => prev.map((e) => (e.exerciseId === exerciseId ? { ...e, ...patch } : e)))
  }

  function save() {
    if (!routine) return
    const exercises: SessionLogExercise[] = draft
      .filter((e) => e.included && e.sets.length > 0)
      .map(({ included: _included, ...e }) => e)
    const trimmedNote = note.trim() || undefined

    if (editing) {
      updateLog(editing.id, { exercises, note: trimmedNote })
      navigate(-1)
      return
    }

    addLog({ date, routineId: routine.id, exercises, isMinimalVersion: false, source: 'manual', note: trimmedNote })
    // Counts for A→B→C only if it was the routine due (spec 07) — anything else leaves it.
    useRotationStore.getState().advanceIfNext(routine.id)
    // An AI-set one-shot weight was "used" only if this is now the latest session.
    if (isLatestDate(logs, date)) {
      const { updateRoutineExercise } = useRoutineStore.getState()
      for (const e of exercises) {
        const re = routine.exercises.find((x) => x.exerciseId === e.exerciseId)
        if (re?.nextWeightKg !== undefined) updateRoutineExercise(routine.id, e.exerciseId, { nextWeightKg: undefined })
      }
    }
    navigate(-1)
  }

  const title = editing ? 'Editar sesión' : 'Registrar sesión hecha'

  // Step 1 — pick the day and the routine.
  if (!routine) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <ScreenHeader title={title} />
        <div className="flex flex-col gap-5 px-5 pb-6 pt-3">
          <div className="flex flex-col gap-2">
            <SectionLabel>Día</SectionLabel>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && e.target.value <= today && setDate(e.target.value)}
              className={inputClass}
            />
            <div className="text-sm capitalize text-text-secondary">{formatDay(date)}</div>
          </div>

          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-2">
              <SectionLabel>{g.label}</SectionLabel>
              {g.items.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pickRoutine(r)}
                  disabled={r.exercises.length === 0}
                  className="flex items-center gap-3 rounded-2xl bg-bg-elevated px-4 py-3.5 text-left disabled:opacity-40"
                >
                  <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${getRoutineColor(r.id).bg}`} />
                  <span className="flex-1 text-[15px] font-medium text-text">{r.name}</span>
                  {r.id === nextRoutineId && (
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-ink">
                      Siguiente
                    </span>
                  )}
                  {r.exercises.length === 0 && <span className="text-xs text-text-tertiary">sin ejercicios</span>}
                </button>
              ))}
            </div>
          ))}
          <div className="text-xs text-text-tertiary">
            Solo la rutina marcada como «Siguiente» avanza la rotación A-B-C. Las demás quedan en el historial sin
            cambiarla.
          </div>
        </div>
      </div>
    )
  }

  // Step 2 — adjust the pre-filled entries and save.
  const anyIncluded = draft.some((e) => e.included && e.sets.length > 0)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader title={title} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-2">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${getRoutineColor(routine.id).bg}`} />
          <div className="flex-1">
            <div className="text-[17px] font-semibold">{routine.name}</div>
            <div className="text-[13px] capitalize text-text-secondary">{formatDay(date)}</div>
          </div>
          {!editing && (
            <button type="button" onClick={() => setRoutineId(undefined)} className="text-sm font-medium text-accent">
              Cambiar
            </button>
          )}
        </div>
        <div className="text-xs text-text-tertiary">
          Ya viene con lo que la app te habría sugerido ese día. Cambia solo lo que fue distinto.
        </div>

        {draft.map((entry) => (
          <DraftExerciseCard
            key={entry.exerciseId}
            entry={entry}
            exercise={getExerciseById(entry.exerciseId)}
            name={routine.exercises.find((re) => re.exerciseId === entry.exerciseId)?.nameOverride}
            equipment={equipment}
            onPatch={(p) => patchExercise(entry.exerciseId, p)}
          />
        ))}

        <div className="flex flex-col gap-2">
          <SectionLabel>Nota</SectionLabel>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opcional: cómo te sentiste, ruta, clima…"
            rows={2}
            className={`${inputClass} h-auto resize-none py-2.5`}
          />
        </div>

        {editing && (
          <Button variant="ghost" size="md" onClick={() => setConfirmDelete(true)}>
            Borrar sesión
          </Button>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-border bg-bg px-5 py-4">
        <Button onClick={save} disabled={!anyIncluded} className="disabled:opacity-40">
          {editing ? 'Guardar cambios' : 'Guardar sesión'}
        </Button>
      </div>

      {confirmDelete && editing && (
        <ConfirmDialog
          title="Borrar sesión"
          confirmLabel="Borrar"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteLog(editing.id)
            navigate(-1)
          }}
        >
          ¿Borrar la sesión del {formatDay(editing.date)}? Esto no se puede deshacer.
        </ConfirmDialog>
      )}
    </div>
  )
}

interface DraftExerciseCardProps {
  entry: DraftExercise
  exercise: Exercise | undefined
  name: string | undefined
  equipment: Equipment
  onPatch: (patch: Partial<DraftExercise>) => void
}

function DraftExerciseCard({ entry, exercise, name, equipment, onPatch }: DraftExerciseCardProps) {
  const kind = exerciseKind(exercise)
  const singleEntry = isSingleEntryKind(kind)
  const equipmentType = singleEntry ? 'bodyweight' : (exercise?.equipmentType ?? 'bodyweight')
  const buildable = useMemo(
    () => (equipmentType === 'bodyweight' ? [] : getBuildableWeights(equipmentType, equipment)),
    [equipmentType, equipment],
  )

  function patchSet(i: number, patch: Partial<LoggedSet>) {
    onPatch({ sets: entry.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  }

  function stepWeight(i: number, dir: 1 | -1) {
    const current = entry.sets[i].weightKg
    if (buildable.length === 0) return
    const idx = current === undefined ? -1 : buildable.indexOf(current)
    const next = idx === -1 ? (buildable.find((w) => w >= (current ?? 0)) ?? buildable[0]) : buildable[Math.min(buildable.length - 1, Math.max(0, idx + dir))]
    patchSet(i, { weightKg: next })
  }

  function addSet() {
    const last = entry.sets.at(-1)
    onPatch({ sets: [...entry.sets, { ...(last ?? {}), setIndex: entry.sets.length }] })
  }

  function removeSet() {
    if (entry.sets.length <= 1) return
    onPatch({ sets: entry.sets.slice(0, -1) })
  }

  const subtitle = kind === 'strength' ? equipmentLabels[equipmentType] : kindLabels[kind]

  return (
    <Card className={`flex flex-col gap-3 ${entry.included ? '' : 'opacity-50'}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-text">{name ?? exercise?.name ?? 'Ejercicio'}</div>
          <div className="text-xs text-text-secondary">{subtitle}</div>
        </div>
        <button type="button" aria-pressed={!entry.included} onClick={() => onPatch({ included: !entry.included })}>
          <Chip active={!entry.included}>{entry.included ? 'Hecho' : 'No lo hice'}</Chip>
        </button>
      </div>

      {entry.included && (
        <>
          {singleEntry ? (
            <CardioEntryFields
              kind={kind}
              initial={entry.sets[0]}
              onChange={(v) => onPatch({ sets: [{ setIndex: 0, ...v }] })}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {entry.sets.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 font-mono text-xs text-text-tertiary">{i + 1}</span>
                  {equipmentType !== 'bodyweight' && (
                    <MiniStepper label="kg" value={s.weightKg} onStep={(d) => stepWeight(i, d)} />
                  )}
                  {s.durationSec !== undefined ? (
                    <MiniStepper
                      label="seg"
                      value={s.durationSec}
                      onStep={(d) => patchSet(i, { durationSec: Math.max(5, s.durationSec! + d * 5) })}
                    />
                  ) : (
                    <MiniStepper
                      label="reps"
                      value={s.reps}
                      onStep={(d) => patchSet(i, { reps: Math.max(0, (s.reps ?? 0) + d) })}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={removeSet} disabled={entry.sets.length <= 1}>
                  − Serie
                </Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={addSet}>
                  + Serie
                </Button>
              </div>
            </div>
          )}
          <EffortChips value={entry.effort} onChange={(effort) => onPatch({ effort })} />
        </>
      )}
    </Card>
  )
}
