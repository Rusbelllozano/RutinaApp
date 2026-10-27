import { useState } from 'react'
import { useModeStore } from '../store/useModeStore'
import { useSessionTimerStore } from '../store/useSessionTimerStore'
import { ConfirmDialog } from './ui/ConfirmDialog'
import type { ProgramMode } from '../types/routine'

const MODES: { id: ProgramMode; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'pro', label: 'PRO' },
]

const CONFIRM_COPY: Record<ProgramMode, string> = {
  pro: 'Vas a cambiar a modo PRO: 5 días, lunes a viernes, sin recuperar días perdidos. Tu historial se conserva.',
  base: 'Vas a cambiar a modo Base: rotación A-B-C, sin días fijos. Tu historial se conserva.',
}

/**
 * Base | PRO segmented control at the top of Home (docs/specs/05-pro-mode.md, "Mode
 * switch"). Always states the active mode in text, asks before switching, and is locked
 * while a session is in progress — changing program mid-workout would corrupt the log.
 */
export function ModeSwitch() {
  const mode = useModeStore((s) => s.mode)
  const setMode = useModeStore((s) => s.setMode)
  const sessionInProgress = useSessionTimerStore((s) => s.startedAt !== null)
  const [pending, setPending] = useState<ProgramMode | null>(null)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold tracking-wider text-text-tertiary">
          {mode === 'pro' ? 'MODO PRO' : 'MODO BASE'}
        </div>
        <div
          role="radiogroup"
          aria-label="Modo de entrenamiento"
          className="flex rounded-xl border border-border bg-bg-elevated p-1"
        >
          {MODES.map((m) => {
            const active = m.id === mode
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={sessionInProgress && !active}
                onClick={() => !active && setPending(m.id)}
                className={`h-8 min-w-16 rounded-lg px-3 text-[13px] font-semibold disabled:opacity-40 ${
                  active ? 'bg-accent text-accent-ink' : 'text-text-secondary'
                }`}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>
      {sessionInProgress && (
        <div className="text-right text-xs text-text-tertiary">Termina o descarta la sesión actual.</div>
      )}

      {pending && (
        <ConfirmDialog
          title={pending === 'pro' ? '¿Cambiar a modo PRO?' : '¿Cambiar a modo Base?'}
          confirmLabel="Cambiar"
          onConfirm={() => {
            setMode(pending)
            setPending(null)
          }}
          onCancel={() => setPending(null)}
        >
          {CONFIRM_COPY[pending]}
        </ConfirmDialog>
      )}
    </div>
  )
}
