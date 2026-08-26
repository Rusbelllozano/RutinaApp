import type { PlateBreakdown } from '../../lib/plates'

interface PlateDiagramProps {
  breakdown: PlateBreakdown
  /** Tailwind background class for the plates, e.g. 'bg-accent' or 'bg-routine-b'. */
  colorClassName?: string
}

/**
 * Flat plate stack: the bar as a thin neutral line, plates as small colored
 * rectangles sized by relative weight — per docs/DESIGN.md, no 3D/gradient
 * rendering. Shows one side; loading is symmetric (docs/HANDOFF.md §4).
 */
export function PlateDiagram({ breakdown, colorClassName = 'bg-accent' }: PlateDiagramProps) {
  const maxKg = Math.max(1, ...breakdown.perSide.map((p) => p.kg))
  const plates = breakdown.perSide.flatMap((p) => Array.from({ length: p.count }, () => p.kg))

  return (
    <div className="flex items-center gap-1">
      {plates.map((kg, i) => {
        const size = 20 + (kg / maxKg) * 20
        return (
          <div
            key={i}
            className={`rounded ${colorClassName}`}
            style={{ width: size, height: size }}
            title={`${kg} kg`}
          />
        )
      })}
      <div className="h-1.5 flex-1 rounded bg-bg-elevated-2" style={{ minWidth: 40 }} />
      {plates.map((kg, i) => {
        const size = 20 + (kg / maxKg) * 20
        return (
          <div
            key={`mirror-${i}`}
            className={`rounded ${colorClassName}`}
            style={{ width: size, height: size }}
            title={`${kg} kg`}
          />
        )
      })}
    </div>
  )
}
