import type { HTMLAttributes } from 'react'

/** Flat block, no border, no shadow — separation comes from background contrast alone. */
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl bg-bg-elevated p-5 ${className}`} {...props} />
}
