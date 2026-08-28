import type { ReactNode } from 'react'
import { SectionLabel } from './SectionLabel'

/** Label + control wrapper for form-style screens (add-exercise, routine editor). */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  )
}
