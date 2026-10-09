import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRoutineStore } from '../store/useRoutineStore'
import { useExerciseStore } from '../store/useExerciseStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useRotationStore } from '../store/useRotationStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useSessionTimerStore, computeElapsedMs } from '../store/useSessionTimerStore'
import { getBuildableWeights, getPlateBreakdown, clampToBuildable, describePlateBreakdown } from '../lib/plates'
import { suggestProgression } from '../lib/progression'
import { getRoutineColor } from '../lib/routineColor'
import { todayISODate, formatDurationMMSS } from '../lib/date'
import { exercisesForSession, effectiveSetsFor, repsRangeLabel } from '../lib/sessionRules'
import { equipmentLabels } from '../lib/equipmentLabels'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionLabel } from '../components/ui/SectionLabel'
import { PlateDiagram } from '../components/ui/PlateDiagram'
import { PlayIcon } from '../components/ui/icons'
import { SessionTimerBar } from '../components/SessionTimerBar'
import type { LoggedSet, RoutineExercise, SessionLog, SessionLogExercise } from '../types/routine'

/** Router `state` handed from Session to Cooldown — matches the shape Cooldown.tsx expects. */
interface CooldownFlowState {
  sessionLog: SessionLog
}

/** Double progression's "+1 rep per set per week", read off the same set index last time. */
function suggestedReps(
  re: RoutineExercise,
  lastLog: SessionLogExercise | undefined,
  setIndex: number,
  progressionAccepted: boolean,
): number | undefined {
  if (re.maxReps === undefined) {
    const last = lastLog?.sets[setIndex]?.reps
    if (last !== undefined) return last
    const match = re.reps?.match(/\d+/)
    return match ? Number(match[0]) : undefined
  }
  if (progressionAccepted) return re.minReps
  const last = lastLog?.sets[setIndex]?.reps
  if (last === undefined) return re.minReps
  return Math.min(re.maxReps, last + 1)
}

function appendSetToExercise(
  list: SessionLogExercise[],
  exerciseId: string,
  setLog: LoggedSet,
): SessionLogExercise[] {
  const idx = list.findIndex((e) => e.exerciseId === exerciseId)
  if (idx === -1) return [...list, { exerciseId, sets: [setLog] }]
  const updated = [...list]
  updated[idx] = { ...updated[idx], sets: [...updated[idx].sets, setLog] }
  return updated
}

/** Reverts the most recently confirmed set for one exercise — the undo counterpart to `appendSetToExercise`. */
function removeLastSetFromExercise(list: SessionLogExercise[], exerciseId: string): SessionLogExercise[] {
  const idx = list.findIndex((e) => e.exerciseId === exerciseId)
  if (idx === -1 || list[idx].sets.length === 0) return list
  const remainingSets = list[idx].sets.slice(0, -1)
  if (remainingSets.length === 0) return list.filter((_, i) => i !== idx)
  const updated = [...list]
  updated[idx] = { ...updated[idx], sets: remainingSets }
  return updated
}

function playRestEndSound() {
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => void ctx.close()
  } catch {
    // Web Audio unavailable or blocked by the browser — vibration still fires.
  }
}

interface StepperProps {
  label: string
  value: number | undefined
  onDec: () => void
  onInc: () => void
}

/** ±1 / ±2.5 stepper for weight and reps — keeps every value one of the app's own suggestions, never free text. */
function Stepper({ label, value, onDec, onInc }: StepperProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated-2 px-2 py-2">
      <button
        type="button"
        onClick={onDec}
        aria-label={`Menos ${label}`}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-lg text-text-secondary"
      >
        −
      </button>
      <div className="min-w-[4.5rem] text-center">
        <div className="font-mono text-xl font-semibold leading-none">{value ?? '—'}</div>
        <div className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</div>
      </div>
      <button
        type="button"
        onClick={onInc}
        aria-label={`Más ${label}`}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-lg text-text-secondary"
      >
        +
      </button>
    </div>
  )
}

/**
 * Session mode — docs/HANDOFF.md §5.3. One exercise at a time; every suggestion (weight,
 * plates, reps) is preloaded so confirming a set is one tap. Minimal-session mode caps
 * the routine to its first 3 exercises, 2 sets each (§3.5) without skipping the rest of
 * the flow (warmup/cooldown still run).
 */
export function Session() {
  const { routineId } = useParams<{ routineId: string }>()
  const [searchParams] = useSearchParams()
  const minimal = searchParams.get('minimal') === '1'
  const navigate = useNavigate()

  const routine = useRoutineStore((s) => (routineId ? s.getRoutineById(routineId) : undefined))
  const getExerciseById = useExerciseStore((s) => s.getExerciseById)
  const getLastLogForExercise = useHistoryStore((s) => s.getLastLogForExercise)
  const addLog = useHistoryStore((s) => s.addLog)
  const advanceAfter = useRotationStore((s) => s.advanceAfter)
  const equipment = useSettingsStore((s) => s.equipment)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)

  const exercisesToRun = useMemo(() => (routine ? exercisesForSession(routine, minimal) : []), [routine, minimal])

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [loggedExercises, setLoggedExercises] = useState<SessionLogExercise[]>([])
  const [progressionAccepted, setProgressionAccepted] = useState(false)
  const [progressionDismissed, setProgressionDismissed] = useState(false)
  const [restRemaining, setRestRemaining] = useState<number | null>(null)
  const [restPaused, setRestPaused] = useState(false)
  const pendingAdvanceRef = useRef<{ nextExercise: boolean } | null>(null)

  const routineExercise: RoutineExercise | undefined = exercisesToRun[currentExerciseIndex]
  const exercise = routineExercise ? getExerciseById(routineExercise.exerciseId) : undefined
  const effectiveSets = routineExercise ? effectiveSetsFor(routineExercise, minimal) : 0

  const lastLog = routineExercise ? getLastLogForExercise(routineExercise.exerciseId) : undefined
  const suggestion = useMemo(
    () => (routineExercise ? suggestProgression(routineExercise, lastLog) : null),
    [routineExercise, lastLog],
  )

  const equipmentType = exercise?.equipmentType ?? 'bodyweight'
  const showsWeight = equipmentType !== 'bodyweight'
  const showsDuration = routineExercise?.durationSec !== undefined
  const showsReps = !showsDuration

  const buildableWeights = useMemo(
    () => (showsWeight ? getBuildableWeights(equipmentType, equipment) : []),
    [showsWeight, equipmentType, equipment],
  )

  const loggedForCurrentExercise = exercise
    ? (loggedExercises.find((e) => e.exerciseId === exercise.id)?.sets ?? [])
    : []
  const doneCount = loggedForCurrentExercise.length

  // Below: draft weight/reps are user-editable (the ±steppers) but need to reset to a
  // fresh suggestion when the exercise, set, or progression choice changes. Rather than
  // an effect (which would cascade an extra render after commit), each value is derived
  // straight from render and re-derived synchronously when its reset key changes — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.

  const progressionResetKey = currentExerciseIndex
  const [prevProgressionResetKey, setPrevProgressionResetKey] = useState(progressionResetKey)
  if (prevProgressionResetKey !== progressionResetKey) {
    setPrevProgressionResetKey(progressionResetKey)
    setProgressionAccepted(false)
    setProgressionDismissed(false)
  }

  function computeDraftWeight() {
    if (!showsWeight) return undefined
    const raw = progressionAccepted ? suggestion?.increasedWeightKg : suggestion?.suggestedWeightKg
    return clampToBuildable(raw, buildableWeights)
  }
  const weightResetKey = `${currentExerciseIndex}:${progressionAccepted}:${buildableWeights.join(',')}`
  const [draftWeight, setDraftWeight] = useState<number | undefined>(computeDraftWeight)
  const [prevWeightResetKey, setPrevWeightResetKey] = useState(weightResetKey)
  if (prevWeightResetKey !== weightResetKey) {
    setPrevWeightResetKey(weightResetKey)
    setDraftWeight(computeDraftWeight())
  }

  function computeDraftReps() {
    return showsReps && routineExercise ? suggestedReps(routineExercise, lastLog, doneCount, progressionAccepted) : undefined
  }
  const repsResetKey = `${currentExerciseIndex}:${doneCount}:${progressionAccepted}`
  const [draftReps, setDraftReps] = useState<number | undefined>(computeDraftReps)
  const [prevRepsResetKey, setPrevRepsResetKey] = useState(repsResetKey)
  if (prevRepsResetKey !== repsResetKey) {
    setPrevRepsResetKey(repsResetKey)
    setDraftReps(computeDraftReps())
  }

  const draftDurationSec = useMemo(() => {
    if (!showsDuration || !routineExercise?.durationSec) return undefined
    const d = routineExercise.durationSec
    return Array.isArray(d) ? Math.round((d[0] + d[1]) / 2) : d
  }, [showsDuration, routineExercise])

  // Rest timer countdown — ticks every second, plays sound/vibration and advances on
  // completion. Paused by just not scheduling the next tick, so restRemaining freezes
  // wherever it was and resumes from there once restPaused flips back.
  useEffect(() => {
    if (restRemaining === null || restPaused) return
    if (restRemaining <= 0) {
      if (soundEnabled) playRestEndSound()
      if ('vibrate' in navigator) navigator.vibrate(200)
      const pending = pendingAdvanceRef.current
      pendingAdvanceRef.current = null
      setRestRemaining(null)
      if (pending?.nextExercise) setCurrentExerciseIndex((i) => i + 1)
      return
    }
    const t = setTimeout(() => setRestRemaining((r) => (r ?? 1) - 1), 1000)
    return () => clearTimeout(t)
  }, [restRemaining, restPaused, soundEnabled])

  if (!routine) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="text-text-secondary">No se encontró esa rutina.</div>
        <Button onClick={() => navigate('/')}>Volver a inicio</Button>
      </div>
    )
  }

  if (!routineExercise || !exercise) {
    return (
      <div className="flex flex-1 items-center justify-center px-5">
        <div className="text-text-secondary">Preparando la sesión…</div>
      </div>
    )
  }

  function stepWeight(dir: 1 | -1) {
    if (draftWeight === undefined || buildableWeights.length === 0) return
    const idx = buildableWeights.indexOf(draftWeight)
    const nextIdx = Math.min(buildableWeights.length - 1, Math.max(0, (idx === -1 ? 0 : idx) + dir))
    setDraftWeight(buildableWeights[nextIdx])
  }

  function stepReps(dir: 1 | -1) {
    setDraftReps((r) => {
      const next = Math.max(0, (r ?? 0) + dir)
      return routineExercise!.maxReps !== undefined ? Math.min(routineExercise!.maxReps, next) : next
    })
  }

  function finalizeSession(finalExercises: SessionLogExercise[]) {
    const durationMin = Math.max(1, Math.round(computeElapsedMs(useSessionTimerStore.getState()) / 60_000))
    const log = addLog({
      date: todayISODate(),
      routineId: routine!.id,
      exercises: finalExercises,
      isMinimalVersion: minimal,
      durationMin,
    })
    advanceAfter(routine!.id)
    useSessionTimerStore.getState().reset()
    const state: CooldownFlowState = { sessionLog: log }
    navigate('/cooldown', { state })
  }

  function confirmSet() {
    const setLog: LoggedSet = {
      setIndex: doneCount,
      weightKg: showsWeight ? draftWeight : undefined,
      reps: showsReps ? draftReps : undefined,
      durationSec: showsDuration ? draftDurationSec : undefined,
    }
    const updated = appendSetToExercise(loggedExercises, exercise!.id, setLog)
    setLoggedExercises(updated)

    const isLastSetOfExercise = doneCount + 1 >= effectiveSets
    const isLastExercise = currentExerciseIndex + 1 >= exercisesToRun.length

    if (isLastSetOfExercise && isLastExercise) {
      finalizeSession(updated)
      return
    }

    pendingAdvanceRef.current = { nextExercise: isLastSetOfExercise }
    setRestPaused(false)
    setRestRemaining(routineExercise!.restSec)
  }

  function skipRest() {
    if (restRemaining === null) return
    const pending = pendingAdvanceRef.current
    pendingAdvanceRef.current = null
    setRestRemaining(null)
    setRestPaused(false)
    if (pending?.nextExercise) setCurrentExerciseIndex((i) => i + 1)
  }

  /**
   * Reverts the set just confirmed for the current exercise — the one-tap "deshacer" for a
   * mis-tapped weight/reps. Only reaches sets on the exercise you're still on: once you've
   * advanced to the next exercise, `doneCount` for it starts back at 0, so there's nothing
   * to undo into the previous one (editing a finalized session is out of scope).
   */
  function undoLastSet() {
    if (doneCount === 0) return
    setLoggedExercises((prev) => removeLastSetFromExercise(prev, exercise!.id))
    if (restRemaining !== null) {
      pendingAdvanceRef.current = null
      setRestRemaining(null)
      setRestPaused(false)
    }
  }

  const breakdown = showsWeight && draftWeight !== undefined ? getPlateBreakdown(equipmentType, draftWeight, equipment) : null
  const canConfirm = doneCount < effectiveSets && restRemaining === null

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader
        title={`Ejercicio ${currentExerciseIndex + 1} de ${exercisesToRun.length}`}
        right={
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${getRoutineColor(routine.id).bg}`} />
            {minimal && <Chip active>Mínima</Chip>}
          </span>
        }
      />
      <SessionTimerBar />

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4 pt-3">
        <div className="flex flex-col gap-1.5">
          <div className="text-xl font-semibold">{exercise.name}</div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>
              {effectiveSets} series × {repsRangeLabel(routineExercise)}
            </span>
            <Chip>{equipmentLabels[equipmentType]}</Chip>
          </div>
          {exercise.video && (
            <a
              href={exercise.video}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1.5 text-sm font-medium text-accent"
            >
              <PlayIcon width={16} height={16} /> Ver técnica
            </a>
          )}
        </div>

        {lastLog && (
          <div className="text-sm text-text-secondary">
            La vez pasada: {lastLog.sets.length}×
            {lastLog.sets[lastLog.sets.length - 1]?.reps ?? lastLog.sets[lastLog.sets.length - 1]?.durationSec}
            {lastLog.sets[lastLog.sets.length - 1]?.weightKg !== undefined
              ? ` a ${lastLog.sets[lastLog.sets.length - 1].weightKg} kg`
              : ''}
          </div>
        )}

        {suggestion?.atTopOfRange && !progressionAccepted && !progressionDismissed && (
          <Card className="flex flex-col gap-3 bg-bg-elevated-2">
            <div className="text-sm">
              Completaste el rango máximo la vez pasada. ¿Subir a{' '}
              <span className="font-mono font-semibold">{suggestion.increasedWeightKg} kg</span>?
            </div>
            <div className="flex gap-3">
              <Button size="sm" className="flex-1" onClick={() => setProgressionAccepted(true)}>
                Aceptar
              </Button>
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setProgressionDismissed(true)}>
                Todavía no
              </Button>
            </div>
          </Card>
        )}

        {showsWeight && (
          <div className="flex flex-col gap-2">
            <SectionLabel>PESO Y DISCOS</SectionLabel>
            {breakdown ? (
              <div className="flex flex-col gap-2">
                <PlateDiagram breakdown={breakdown} colorClassName={getRoutineColor(routine.id).bg} />
                <div className="text-xs text-text-tertiary">{describePlateBreakdown(breakdown)}</div>
              </div>
            ) : (
              <div className="text-sm text-danger">No armable con tu inventario actual.</div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {Array.from({ length: effectiveSets }).map((_, i) => {
            if (i < doneCount) {
              const s = loggedForCurrentExercise[i]
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-bg-elevated px-4 py-3 text-sm text-text-secondary"
                >
                  <span>Serie {i + 1}</span>
                  <span className="font-mono text-text">
                    {s.weightKg !== undefined ? `${s.weightKg} kg × ` : ''}
                    {s.reps !== undefined ? `${s.reps}` : s.durationSec !== undefined ? `${s.durationSec}s` : ''}
                  </span>
                </div>
              )
            }
            if (i === doneCount && restRemaining === null) {
              return (
                <div key={i} className="flex flex-col gap-3 rounded-xl bg-bg-elevated p-4">
                  <div className="text-sm font-medium text-text-secondary">Serie {i + 1}</div>
                  <div className="flex flex-wrap items-center gap-3">
                    {showsWeight && <Stepper label="kg" value={draftWeight} onDec={() => stepWeight(-1)} onInc={() => stepWeight(1)} />}
                    {showsReps && <Stepper label="reps" value={draftReps} onDec={() => stepReps(-1)} onInc={() => stepReps(1)} />}
                    {showsDuration && (
                      <div className="font-mono text-2xl font-semibold">{draftDurationSec}s</div>
                    )}
                  </div>
                </div>
              )
            }
            return (
              <div key={i} className="rounded-xl px-4 py-3 text-sm text-text-tertiary">
                Serie {i + 1}
              </div>
            )
          })}
        </div>

        {doneCount > 0 && (
          <button
            type="button"
            onClick={undoLastSet}
            className="py-1 text-center text-sm font-medium text-text-secondary"
          >
            Deshacer última serie
          </button>
        )}

        {restRemaining !== null && (
          <Card className="flex flex-col items-center gap-3">
            <SectionLabel>{restPaused ? 'DESCANSO · EN PAUSA' : 'DESCANSO'}</SectionLabel>
            <div className={`font-mono text-4xl font-semibold ${restPaused ? 'text-text-tertiary' : ''}`}>
              {formatDurationMMSS(restRemaining)}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="md" onClick={() => setRestPaused((p) => !p)}>
                {restPaused ? 'Reanudar' : 'Pausar'}
              </Button>
              <Button variant="secondary" size="md" onClick={skipRest}>
                Saltar descanso
              </Button>
            </div>
          </Card>
        )}

        <div className="mt-auto pt-2">
          {canConfirm && <Button onClick={confirmSet}>Confirmar serie</Button>}
        </div>
      </div>
    </div>
  )
}
