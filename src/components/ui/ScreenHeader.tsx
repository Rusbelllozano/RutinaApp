import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from './icons'

interface ScreenHeaderProps {
  title: string
  onBack?: () => void
  /** Extra content aligned to the right, e.g. a settings icon. */
  right?: React.ReactNode
}

/** Back-chevron + title header for flow/secondary screens (no bottom tab bar). */
export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-shrink-0 items-center gap-3.5 px-5 pb-1 pt-6">
      <button
        type="button"
        aria-label="Volver"
        onClick={onBack ?? (() => navigate(-1))}
        className="text-text-secondary"
      >
        <ChevronLeftIcon width={22} height={22} />
      </button>
      <div className="flex-1 text-lg font-semibold">{title}</div>
      {right}
    </div>
  )
}
