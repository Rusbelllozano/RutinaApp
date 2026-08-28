import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { program } from '../data/program'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { CheckIcon } from '../components/ui/icons'
import { SessionTimerBar } from '../components/SessionTimerBar'

/** Warmup checklist — docs/HANDOFF.md §5.2. 7 items, tappable, skippable. */
export function Warmup() {
  const navigate = useNavigate()
  const { routineId } = useParams<{ routineId: string }>()
  const [searchParams] = useSearchParams()
  const minimal = searchParams.get('minimal') === '1'
  const [done, setDone] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function goToSession() {
    if (!routineId) return
    navigate(`/session/${routineId}${minimal ? '?minimal=1' : ''}`)
  }

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Calentamiento" />
      <SessionTimerBar />
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-3 pt-3">
        {program.warmup.map((item, i) => {
          const isDone = done.has(i)
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left ${isDone ? 'bg-bg-elevated' : ''}`}
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                  isDone ? 'bg-accent text-accent-ink' : 'border border-border text-transparent'
                }`}
              >
                <CheckIcon width={14} height={14} />
              </span>
              <span className="flex-1">
                <span className={`text-[15px] ${isDone ? 'text-text-secondary line-through' : 'text-text'}`}>
                  {item.name}
                </span>
                {(item.duration ?? item.reps) && (
                  <span className="ml-2 text-xs text-text-tertiary">{item.duration ?? item.reps}</span>
                )}
              </span>
            </button>
          )
        })}

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Button onClick={goToSession}>Continuar</Button>
          <button
            type="button"
            className="py-1 text-center text-sm font-medium text-text-secondary"
            onClick={goToSession}
          >
            Saltar calentamiento
          </button>
        </div>
      </div>
    </div>
  )
}
