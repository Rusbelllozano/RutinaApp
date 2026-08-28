interface StepperProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}

/** +/- stepper for whole-number values (sets, reps, rest seconds), per docs/DESIGN.md's input styling. */
export function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix }: StepperProps) {
  return (
    <div className="flex h-11 flex-1 items-center justify-between rounded-xl border border-border bg-bg-elevated-2 px-1.5">
      <button
        type="button"
        aria-label="Restar"
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-lg text-text-secondary"
      >
        −
      </button>
      <span className="font-mono text-[15px] text-text">
        {value}
        {suffix ? <span className="ml-0.5 text-xs text-text-tertiary">{suffix}</span> : null}
      </span>
      <button
        type="button"
        aria-label="Sumar"
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-lg text-text-secondary"
      >
        +
      </button>
    </div>
  )
}
