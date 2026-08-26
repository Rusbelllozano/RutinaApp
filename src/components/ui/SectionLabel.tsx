import type { HTMLAttributes } from 'react'

/** Small uppercase tracked label that groups content ("HOY TOCA", "SERIES"). */
export function SectionLabel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`text-[11px] font-semibold uppercase tracking-wider text-text-tertiary ${className}`}
      {...props}
    />
  )
}
