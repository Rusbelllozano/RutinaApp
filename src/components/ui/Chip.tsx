import type { HTMLAttributes } from 'react'

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  active?: boolean
}

/** Pill tag — muscle groups, filters, equipment picks. Full radius, flat fill. */
export function Chip({ active = false, className = '', ...props }: ChipProps) {
  const tone = active ? 'bg-accent text-accent-ink font-semibold' : 'bg-bg-elevated-2 text-text-secondary font-medium'
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${tone} ${className}`} {...props} />
}
