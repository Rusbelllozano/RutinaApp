# Spec — Routine picker ("Seleccionador de rutina para hacerla")

## Goal

The user picks a routine (not necessarily the one the rotation would auto-suggest), and
the main view immediately shows that routine's exercises, suggested weights, and rest
timer — the existing session-mode experience from HANDOFF §5.3, just reachable by manual
choice instead of only by "what's next."

This is deliberately the smallest of the four specs: it does not change session mode's
behavior, only how you get into it.

## Entry points

1. **Home screen (default, unchanged):** big "Start" button runs whatever
   `RotationState` says is next — this is HANDOFF §5.1's existing behavior, untouched.
2. **"Choose a routine" (new):** a secondary link on Home, or its own nav item, listing
   every routine — the 3 base ones plus any custom ones from
   `02-exercise-library.md`-adjacent routine creation — as cards: name, muscle groups,
   exercise count, estimated duration. Tapping a card starts a session for *that*
   routine, regardless of what the rotation queue currently points to.
3. **From the calendar (`03-routine-calendar.md`):** tapping "start" on a planned or
   today entry is a shortcut into the same flow with that routine pre-selected.

All three land on the identical session-mode screen and behave identically once there —
this spec does not introduce a second session UI.

## What "start this routine" actually does

Session mode becomes routine-id-driven: given a `routineId` (from any entry point above),
it loads that routine's `RoutineExercise` list, and for each exercise pulls the most
recent `SessionLog` entry **for that `exerciseId`** (not for that routine) to compute the
suggested weight/reps via double progression (HANDOFF §3.2). This is why history and
progression are keyed by `exerciseId` in the data model (`00-overview.md`) — an exercise
shared across two routines shows consistent progress in either one.

The minimum-session mode (HANDOFF §3.5: first 3 exercises, 2 sets each) applies exactly
the same way no matter which entry point was used.

## Effect on the rotation queue

Starting and completing a manually-picked routine **does** advance `RotationState`, using
the same rule as `00-overview.md`: the queue continues from whatever routine was actually
completed, not from what it originally suggested. Concretely, if the queue's next-up is A
and the user manually picks and completes B instead, the next Home suggestion becomes C
(continuing the A→B→C sequence from B), not A again. This means "pick a different
routine" is a real override, not a detour that gets silently re-suggested tomorrow.

Picking a routine and then **abandoning** the session before logging anything does not
touch `RotationState` — only a completed (or minimum-version-completed) session counts,
same as HANDOFF §3.1 already implies for the auto flow.

## UI notes

- The routine list is small by construction (3 base + a handful of custom, realistically)
  — no search/filter needed for v1; add one later only if it grows unwieldy.
- Cards show enough to decide without opening them: name, 2-3 muscle group tags,
  exercise count, "~40 min" estimate. No nested navigation needed to compare routines.

## Non-goals (v1)

- Creating a brand-new routine from this screen (composing a routine from the exercise
  catalog is `02-exercise-library.md`-adjacent future work, not this picker).
- Reordering or favoriting routines in the list.

## Acceptance criteria

- [ ] Home's default "Start" (auto-suggested) and "choose a routine" both lead to the
      same session-mode screen with the same timer/weight-suggestion/one-tap-log
      behavior — no divergent second implementation.
- [ ] Completing a manually-picked routine updates tomorrow's Home suggestion correctly
      (continues the rotation from what was actually done).
- [ ] Abandoning a manually-picked session before logging anything leaves the rotation
      queue exactly as it was.
- [ ] An exercise shared by two routines shows the same "last time" data and the same
      double-progression suggestion in both.
