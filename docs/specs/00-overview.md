# Specs overview — v1.5 feature set

This folder specs out four features the user asked for on top of the original
`docs/HANDOFF.md` v1 scope:

1. [`01-weight-calculator.md`](./01-weight-calculator.md) — standalone plate/weight
   calculator.
2. [`02-exercise-library.md`](./02-exercise-library.md) — add custom exercises to a
   shared catalog that routines are built from.
3. [`03-routine-calendar.md`](./03-routine-calendar.md) — calendar with past history and
   future planning.
4. [`04-routine-picker.md`](./04-routine-picker.md) — pick any routine to start, not just
   the auto-suggested one.

Each doc is self-contained (goal, flows, data, rules, acceptance criteria) but they share
one data model change described below, so read this file first.

## Why the data model changes

The original HANDOFF modeled the program as 3 fixed days (A/B/C), each an array of
exercises baked directly into that day. Feature 2 (exercise library) requires exercises
to be **shared, addressable entities** — "a routine has multiple exercises that come from
a base [catalog]," in the user's words — so an exercise can be reused across routines and
edited in one place.

This generalizes "day" into **routine**: the app still ships 3 base routines (what used
to be A/B/C), but nothing in the model limits it to 3 or to that naming anymore. Feature 4
(routine picker) and feature 3 (calendar) both need to address "any routine," not a fixed
`'A' | 'B' | 'C'` union, which is what makes this change necessary rather than optional.

## New entities (superset of `src/types/program.ts` today)

| Entity | Purpose | Persisted as |
|---|---|---|
| `Exercise` | One catalog entry: name, equipment type, default sets/reps/rest, video, notes. `source: 'base' \| 'custom'`. | `routine-app:exercises` |
| `Routine` | Named ordered list of exercises (replaces `WorkoutDay`). `source: 'base' \| 'custom'`. | `routine-app:routines` |
| `RoutineExercise` | Join row: which exercise, in what order, with what sets/rep range/rest **for this routine** (can override the exercise's defaults). | embedded in `Routine.exercises` |
| `RotationState` | Cyclic queue of routine ids + pointer to "next up." | `routine-app:rotation` |
| `ScheduledRoutine` | One calendar entry: a date paired with a routine, planned or completed. | `routine-app:calendar` |
| `SessionLog` | One completed session: date, routine id, per-exercise sets logged (weight, reps), whether it was the minimum version. | `routine-app:history` |

`Equipment`/settings (`routine-app:settings`) is unchanged.

### Design decisions baked into this split (flagging them, not asking again)

- **Base exercises and base routines are seed data, not hardcoded.** On first load, if
  `routine-app:exercises` / `routine-app:routines` are empty, they're seeded from
  `src/data/program.ts` (which stays the source of the original, inventory-calculated
  numbers) with `source: 'base'`.
- **Base exercises can't be deleted**, only removed from a given routine — deleting them
  would silently break the pre-calculated program for anyone still using it. Custom
  exercises can be deleted if unused, or after a confirmation if they're in use somewhere.
- **Sets/rep range/rest/initial weight live on `RoutineExercise`, not on `Exercise`.**
  The catalog entry carries *defaults*; each routine can use different numbers for the
  same exercise (e.g. higher reps for the same move in a "light day" a user builds
  later). History (`SessionLog`) and double progression key off `exerciseId`, so
  progress on an exercise is tracked across routines, not reset per routine.
- **Completing a session is the only thing that advances `RotationState`.** Planning a
  future date in the calendar, or manually picking a routine to run today, never mutates
  the rotation queue by itself — only an actually-logged `SessionLog` does, and it
  advances the pointer to *after whatever routine was actually done*. This keeps one
  source of truth instead of the calendar and the rotation disagreeing about what's
  "next." See `04-routine-picker.md` and `03-routine-calendar.md` for the concrete
  cases this resolves.
- **UI text stays Spanish, code stays English** — same split as the rest of the codebase
  (`CLAUDE.md` → "Language split"). New user-entered content (custom exercise names,
  notes) is whatever the user types, unconstrained.

## Cross-cutting acceptance criteria

- [ ] Export/import JSON (HANDOFF §5, already required) covers all six persisted stores
      above, not just settings — otherwise adding custom exercises/routines makes
      export/import silently incomplete.
- [ ] None of these four features weakens the original HANDOFF rules: no non-buildable
      loads suggested, no calendar-guilt messaging, minimum-session button still present
      and easy to find, rotation still tolerates missed days without needing "catch-up."
- [ ] The plate-calculation logic (`src/lib/plates.ts`, still to be built per `CLAUDE.md`
      next steps) is the single implementation used by session mode, the standalone
      calculator, and any weight validation shown while adding an exercise. No second
      implementation.
