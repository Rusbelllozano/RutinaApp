import { Link } from 'react-router-dom'
import { useGoalStore } from '../store/useGoalStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { countGoalSessions, weeksRemaining } from '../lib/goal'
import { todayISODate } from '../lib/date'

/**
 * Discreet cycle-goal block on PRO's Home (docs/specs/05-pro-mode.md, "Cycle goal").
 * Only ever counts what was done — never misses, red, streaks, or "you're behind".
 */
export function GoalProgress() {
  const goal = useGoalStore((s) => s.goal)
  const logs = useHistoryStore((s) => s.logs)
  if (!goal) return null

  const today = todayISODate()
  if (today < goal.startDate) return null

  const done = countGoalSessions(logs, goal)
  const pct = Math.min(100, Math.round((done / Math.max(1, goal.targetSessions)) * 100))
  const weeks = weeksRemaining(goal, new Date())
  const finished = today > goal.endDate

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-bg-elevated px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-text">
          <span className="font-mono font-semibold">{done}</span> de{' '}
          <span className="font-mono">{goal.targetSessions}</span> sesiones
        </span>
        <span className="text-xs text-text-secondary">
          {finished ? 'Ciclo terminado' : weeks === 1 ? 'Queda 1 semana' : `Quedan ${weeks} semanas`}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-bg-elevated-2"
        role="progressbar"
        aria-label="Sesiones del ciclo"
        aria-valuemin={0}
        aria-valuemax={goal.targetSessions}
        aria-valuenow={done}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      {finished && (
        <Link to="/settings" className="text-xs font-medium text-accent">
          Definir una meta nueva
        </Link>
      )}
    </div>
  )
}
