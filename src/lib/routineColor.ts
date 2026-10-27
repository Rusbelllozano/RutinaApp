/**
 * Literal Tailwind class names (not built via template strings) so Tailwind's scanner
 * picks up the theme tokens from docs/DESIGN.md's routine palette (bg-routine-a/b/c,
 * plus bg-routine-pro-1…5 for PRO mode's weekday routines).
 */
const ROUTINE_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  'base-a': { bg: 'bg-routine-a', border: 'border-routine-a', text: 'text-routine-a' },
  'base-b': { bg: 'bg-routine-b', border: 'border-routine-b', text: 'text-routine-b' },
  'base-c': { bg: 'bg-routine-c', border: 'border-routine-c', text: 'text-routine-c' },
  'pro-1': { bg: 'bg-routine-pro-1', border: 'border-routine-pro-1', text: 'text-routine-pro-1' },
  'pro-2': { bg: 'bg-routine-pro-2', border: 'border-routine-pro-2', text: 'text-routine-pro-2' },
  'pro-3': { bg: 'bg-routine-pro-3', border: 'border-routine-pro-3', text: 'text-routine-pro-3' },
  'pro-4': { bg: 'bg-routine-pro-4', border: 'border-routine-pro-4', text: 'text-routine-pro-4' },
  'pro-5': { bg: 'bg-routine-pro-5', border: 'border-routine-pro-5', text: 'text-routine-pro-5' },
}
const DEFAULT_ROUTINE_COLOR = { bg: 'bg-accent', border: 'border-accent', text: 'text-accent' }

/** Maps a routine id to its calendar/UI color — falls back to the accent for any non-base routine. */
export function getRoutineColor(routineId?: string): { bg: string; border: string; text: string } {
  if (!routineId) return DEFAULT_ROUTINE_COLOR
  return ROUTINE_COLOR[routineId] ?? DEFAULT_ROUTINE_COLOR
}
