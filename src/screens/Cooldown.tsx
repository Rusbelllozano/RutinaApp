import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { program } from '../data/program'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { CheckIcon } from '../components/ui/icons'
import type { SessionLog } from '../types/routine'

/** Router `state` received from Session — matches the shape Session.tsx sends. */
interface CooldownFlowState {
  sessionLog: SessionLog
}

/** Cooldown checklist — docs/HANDOFF.md §5.5. Same pattern as Warmup, forwards the just-logged session to Summary. */
export function Cooldown() {
  const navigate = useNavigate()
  const location = useLocation()
  const flowState = location.state as CooldownFlowState | null
  const [done, setDone] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function finish() {
    navigate('/summary', { state: flowState })
  }

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Estiramiento" />
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-3 pt-3">
        {program.cooldown.map((item, i) => {
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
              <span className={`flex-1 text-[15px] ${isDone ? 'text-text-secondary line-through' : 'text-text'}`}>
                {item}
              </span>
            </button>
          )
        })}

        <div className="mt-auto pt-6">
          <Button onClick={finish}>Terminar sesión</Button>
        </div>
      </div>
    </div>
  )
}
