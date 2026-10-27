import type { ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Centered modal with one confirm and one cancel action — flat, no shadow, per docs/DESIGN.md. */
export function ConfirmDialog({ title, children, confirmLabel, cancelLabel = 'Cancelar', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center px-5">
      <button type="button" aria-label={cancelLabel} className="absolute inset-0 bg-bg/80" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-bg-elevated p-5"
      >
        <div id="confirm-dialog-title" className="text-[17px] font-semibold text-text">
          {title}
        </div>
        <div className="text-sm text-text-secondary">{children}</div>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button size="md" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
