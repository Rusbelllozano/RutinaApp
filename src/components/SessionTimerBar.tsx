import { useEffect, useState } from 'react'
import { useSessionTimerStore, computeElapsedMs } from '../store/useSessionTimerStore'
import { formatDurationMMSS } from '../lib/date'
import { PauseIcon, PlayIcon } from './ui/icons'

/**
 * Slim bar shown on every screen between "Empezar" and the logged session (overview,
 * plate setup, warmup, session mode): running total + pause/resume. Renders nothing once
 * there's no session in progress (before starting, or after it's been logged and reset).
 */
export function SessionTimerBar() {
  const startedAt = useSessionTimerStore((s) => s.startedAt)
  const pausedAt = useSessionTimerStore((s) => s.pausedAt)
  const accumulatedPausedMs = useSessionTimerStore((s) => s.accumulatedPausedMs)
  const pause = useSessionTimerStore((s) => s.pause)
  const resume = useSessionTimerStore((s) => s.resume)
  const [, forceTick] = useState(0)

  const isPaused = pausedAt !== null

  useEffect(() => {
    if (startedAt === null || isPaused) return
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [startedAt, isPaused])

  if (startedAt === null) return null

  const elapsedSec = Math.floor(computeElapsedMs({ startedAt, pausedAt, accumulatedPausedMs }) / 1000)

  return (
    <div className="flex flex-shrink-0 items-center justify-between gap-3 px-5 py-2">
      <span className={`font-mono text-sm ${isPaused ? 'text-text-tertiary' : 'text-text-secondary'}`}>
        {formatDurationMMSS(elapsedSec)}
        {isPaused ? ' · en pausa' : ''}
      </span>
      <button
        type="button"
        onClick={isPaused ? resume : pause}
        className="flex items-center gap-1.5 text-sm font-medium text-accent"
      >
        {isPaused ? <PlayIcon width={16} height={16} /> : <PauseIcon width={16} height={16} />}
        {isPaused ? 'Reanudar' : 'Pausar'}
      </button>
    </div>
  )
}
