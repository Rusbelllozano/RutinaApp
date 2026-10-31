import { useState } from 'react'
import type { ExerciseKind, LoggedSet } from '../types/routine'
import { formatKm, formatPace, paceSecPerKm, parseDecimal, tracksDistance } from '../lib/exerciseKind'

const inputClass =
  'h-12 w-full rounded-xl border border-border bg-bg-elevated-2 px-3 text-center font-mono text-lg text-text placeholder:text-text-tertiary focus:outline-none'

export interface CardioValue {
  distanceKm?: number
  durationSec?: number
}

interface Props {
  kind: ExerciseKind
  initial: Pick<LoggedSet, 'distanceKm' | 'durationSec'> | undefined
  onChange: (value: CardioValue) => void
}

function parseWhole(text: string): number {
  const n = Number(text.trim())
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * Km + time inputs for a run/cardio/mobility entry (docs/specs/07-exercise-types-and-backfill.md),
 * with the live pace. Uncontrolled text, reported up as numbers — give it a `key` to reset.
 */
export function CardioEntryFields({ kind, initial, onChange }: Props) {
  const withDistance = tracksDistance(kind)
  const initialSec = initial?.durationSec ?? 0
  const [kmText, setKmText] = useState(initial?.distanceKm !== undefined ? formatKm(initial.distanceKm) : '')
  const [minText, setMinText] = useState(initialSec > 0 ? String(Math.floor(initialSec / 60)) : '')
  const [secText, setSecText] = useState(initialSec % 60 > 0 ? String(initialSec % 60) : '')

  function report(km: string, min: string, sec: string) {
    const total = parseWhole(min) * 60 + Math.min(59, parseWhole(sec))
    onChange({ distanceKm: withDistance ? parseDecimal(km) : undefined, durationSec: total > 0 ? total : undefined })
  }

  const distanceKm = withDistance ? parseDecimal(kmText) : undefined
  const durationSec = parseWhole(minText) * 60 + Math.min(59, parseWhole(secText))
  const pace = paceSecPerKm({ distanceKm, durationSec })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        {withDistance && (
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-text-tertiary">Km</span>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Kilómetros"
              value={kmText}
              placeholder="0"
              onChange={(e) => {
                setKmText(e.target.value)
                report(e.target.value, minText, secText)
              }}
              className={inputClass}
            />
          </label>
        )}
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-text-tertiary">Min</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Minutos"
            value={minText}
            placeholder="0"
            onChange={(e) => {
              setMinText(e.target.value)
              report(kmText, e.target.value, secText)
            }}
            className={inputClass}
          />
        </label>
        <label className="flex w-20 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-text-tertiary">Seg</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Segundos"
            value={secText}
            placeholder="00"
            onChange={(e) => {
              setSecText(e.target.value)
              report(kmText, minText, e.target.value)
            }}
            className={inputClass}
          />
        </label>
      </div>
      {withDistance && (
        <div className="text-sm text-text-secondary">
          Ritmo: <span className="font-mono text-text">{pace !== undefined ? formatPace(pace) : '—'}</span>
        </div>
      )}
    </div>
  )
}
