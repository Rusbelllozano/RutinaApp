# Spec — Exercise types (running/cardio) + logging past sessions from the calendar

Status: **built.** Decisions below were confirmed with the user on 2026-10-31.

Implementation notes (where the build differs from or extends the plan below):

- `Exercise.kind` is **optional**; read it through `exerciseKind()` (`src/lib/exerciseKind.ts`),
  which derives `isometric`/`strength` for older entries. That covers stored data, old
  backups and seeds without a seed migration, so `SEED_STORE_VERSION` is unchanged.
- Target fields are `targetKm` / `targetMin` on `RoutineExercise` and
  `defaultTargetKm` / `defaultTargetMin` on `Exercise`.
- Backfilled logs (`source: 'manual'`) can be **edited and deleted** (the user asked to
  "edit the day"); live sessions stay read-only. Screen: `src/screens/LogSession.tsx`
  (`/log-session?date=…`, `/log-session?edit=<logId>`), reached from the calendar sheet
  and from History.
- There was no UI to create routines yet: the routine picker gained "+ Nueva rutina"
  and the editor "Eliminar rutina" for custom ones, so a "Trote" routine can exist.
- No future planning in PRO (confirmed): only today/past PRO days gained the sheet.

Motivating example (the user's own): *"Yesterday, Friday, I jogged 6 km and today I
can't add it."* Two gaps: the catalog can't describe a run (no type, no distance), and
the calendar can't log a session on a past date.

## Part 1 — Exercise types

### Data model

New field on the catalog `Exercise` (`src/types/routine.ts`):

```ts
export type ExerciseKind = 'strength' | 'isometric' | 'run' | 'cardio' | 'mobility'
// Exercise
kind: ExerciseKind
```

| `kind` | UI label (Spanish) | Logged per set / entry | Progression |
|---|---|---|---|
| `strength` | Fuerza (pesas) | sets × reps × kg (today's behavior) | Double progression (unchanged) |
| `isometric` | Isométrico | sets × seconds (today's `durationSec` path) | Unchanged |
| `run` | Correr/trotar | **km + duration + effort** | None — show "La vez pasada" only |
| `cardio` | Otro cardio | duration, optional km, effort | None — show "La vez pasada" only |
| `mobility` | Movilidad/estiramiento | duration or just "hecho" | None |

- `kind` is orthogonal to `equipmentType`. `run`/`cardio`/`mobility` force
  `equipmentType: 'bodyweight'` and hide the weight/plate fields.
- Seed migration (`src/lib/seedMigration.ts`, bump `SEED_STORE_VERSION`): existing
  exercises get `kind: 'isometric'` if they have `defaultDurationSec`, else
  `'strength'`. Custom exercises go through the same rule.
- `RoutineExercise` gains an optional target for cardio slots: `targetKm?: number`,
  `targetDurationMin?: number` (purely informative, shown in session mode — no
  progression, per the user).
- `LoggedSet` gains `distanceKm?: number` (`durationSec` already exists). A run is one
  entry (`setIndex: 0`) with `distanceKm` + `durationSec`; effort reuses the existing
  `SessionLogExercise.effort` ("Fácil / Justo / Al límite").
- Pace (min/km) is **derived**, never stored: `durationSec / 60 / distanceKm`.

### Flows

- **AddExercise form**: a "Tipo" chip row at the top. The rest of the form adapts —
  `run`/`cardio` show "Distancia objetivo (km, opcional)" and "Duración objetivo
  (min, opcional)", hide sets/reps/kg/plates. Sanity check on plates only for
  `strength`.
- **Exercise library**: filter chips by type; each row shows a type tag.
- **Routines**: a routine can mix kinds freely (e.g. 2 km jog + strength block). A
  "Trote" routine is just a custom routine whose only exercise is `run`.
  Custom routines already sit **outside the A→B→C rotation** (`advanceAfter` ignores
  ids not in `order`), which is what the user wants — no rotation change needed.
- **Session mode**: for a `run`/`cardio` step, replace the set-by-set UI with one card:
  `Km` (decimal stepper, 0.1 steps) + `Tiempo` (mm:ss or h:mm) + effort chips, one
  "Guardar" button. Shows live pace and "La vez pasada: 6 km · 38:00 · 6:20/km". No
  rest timer between cardio steps unless the routine slot sets `restSec`.
- **Minimum session**: unchanged for strength routines. For a routine whose exercises
  are all cardio, the minimum version is "any distance logged counts" (no 2-set rule).
- **History**: per-exercise chart plots km per session for `run`/`cardio` (pace in the
  tooltip/list) instead of top weight. Session detail shows "6,0 km · 38:00 ·
  6:20/km · Justo".
- **Export/import**: new fields ride inside the existing stores; bump
  `BACKUP_SCHEMA_VERSION` and default missing `kind` on import via the same migration
  rule. AI export (`src/lib/aiExport.ts`) includes runs as "Trote 6 km en 38 min".

## Part 2 — Log a past session from the calendar

### Rules (confirmed)

- Any past date **or today** can receive a logged session. No look-back limit.
- **Several sessions per day** are allowed (strength in the morning, jog in the
  evening). The calendar cell shows one dot/color per session.
- **Rotation**: a backfilled session advances the A→B→C queue **only if its routine is
  the one currently "next up"** (`getNextRoutineId() === routineId`). Anything else
  (a different base routine, a custom "Trote" routine) leaves the queue untouched.
  This is stricter than `advanceAfter` today (which jumps to after whatever base
  routine was done), so it needs a new action, e.g. `advanceIfNext(routineId)`.
- **Detail level: quick but editable.** Picking a routine opens a form pre-filled with
  what the session would have suggested (each strength set marked done at the
  suggested kg/reps; each run slot pre-filled with its target km or the last run).
  The user adjusts only what differs — e.g. types `6` km and `38:00` — and saves.
- A backfilled log feeds history, charts, progression and the AI export exactly like a
  live one. It's flagged `source: 'manual'` on `SessionLog` (live sessions:
  `'live'`, default for old logs) so the detail view can say "Registrada a posteriori"
  and so `durationMin`/`startedAt`/`restTakenSec` are known to be absent.
- Planned entries: if the date had a `ScheduledRoutine` (`planned`/`rest`), logging a
  session there just renders it as **Done** (history wins, per spec 03). No guilt copy
  anywhere.

### Required technical change: logs are no longer append-only in date order

`useHistoryStore.logs` is documented as "chronological, oldest first", and
`getLogForDate`, `findLastExerciseLog`, `findProgressionLog` and `aiExport` rely on
append order. Backfilling Friday after Saturday's session breaks that. Fix:

- `addLog` inserts at the sorted position by `(date, startedAt ?? end-of-day)` instead
  of appending; a one-off persist migration sorts existing logs.
- Add `getLogsForDate(date): SessionLog[]` (calendar needs all of them);
  keep `getLogForDate` as "most recent that day" for Home.
- Tests in `progression.test.ts` for: a backfilled **older** log must not become
  "La vez pasada" over a newer live one.

### Flow (phone-first, one thumb)

1. Calendar → tap a past or today cell (today: blank/planned/done; past: any state —
   blank past days stop being non-tappable).
2. Sheet "Registrar sesión hecha" → routine list (same list as the routine picker,
   both modes, grouped Base / PRO / Mis rutinas).
3. Pre-filled log form → "Guardar". Toast: "Sesión del viernes 30 registrada".
4. Tapping a Done day lists its sessions; each opens the detail (with "Borrar sesión"
   for backfilled ones), plus a "Registrar otra sesión" button.

Also reachable from History ("+ Registrar sesión pasada") with a date picker defaulting
to yesterday, since that's the typical case.

## Acceptance criteria

- [ ] Create "Trote" (tipo Correr/trotar), add it to a new routine "Trote", and from the
      calendar log it on yesterday with 6 km / 38:00 / Justo — it appears on that day,
      in History with pace 6:20/km, and the A→B→C "next up" on Home is unchanged.
- [ ] Backfilling the routine that is next-up advances the rotation; backfilling any
      other routine doesn't.
- [ ] Two sessions on the same date both show on the calendar and in History.
- [ ] A backfilled older strength log never overrides a newer one as "La vez pasada" or
      as the progression baseline.
- [ ] Existing data (exercises without `kind`, unsorted/legacy logs, old backups)
      migrates without loss; strength flows behave exactly as before.
- [ ] A backfilled session can be deleted after confirming; it disappears from the
      calendar, History, progression and the goal count; the rotation is not touched.
- [ ] A jog logged on a PRO weekday inside the goal range counts toward the cycle goal
      (max one per date, as today).
- [ ] No weight/plate UI on cardio/mobility exercises; no progression suggestions for
      them.

## Deleting a logged session (confirmed)

- Any **backfilled** log (`source: 'manual'`) can be deleted from its detail sheet
  (calendar day or History): "Borrar sesión" → confirm dialog "¿Borrar la sesión del
  viernes 30? Esto no se puede deshacer." → removed from `useHistoryStore`.
- Live sessions stay read-only (spec 03's "no history editing" still holds for them).
- Deleting **never rewinds the rotation**. If the deleted log had advanced the queue,
  the user fixes it with the existing reset/rotation controls in Settings — rewinding
  automatically would be wrong whenever later sessions were logged on top.
- Progression, "La vez pasada", charts, the cycle goal and the AI export read straight
  from `logs`, so they update on their own; nothing else stores a copy.
- New store action `deleteLog(id)`, guarded to `source === 'manual'`.

## Cycle goal (confirmed: runs count)

The user may swap a training day for a jog, so a run session counts toward the PRO
cycle goal. `countGoalSessions` (`src/lib/goal.ts`) already counts **any** logged
session in range, any routine, max one per date — so no logic change is needed, only:

- a test in `goal.test.ts` pinning that a custom cardio-only routine counts, and that a
  backfilled log counts for its own date (not the day it was entered);
- deleting a backfilled log lowers the count accordingly.

The PRO calendar today only opens sheets on logged days; it must also open on blank
**past and today** cells to offer "Registrar sesión hecha" (future PRO days stay
read-only, per spec 05).

## Build order

1. Types + seed/persist migrations (`kind`, `distanceKm`, `source`, sorted logs) + tests.
2. History store sorted insert + `getLogsForDate` + progression tests.
3. AddExercise / library type field and filters.
4. Session mode cardio card + Summary/History rendering + km chart.
5. Calendar backfill sheet (Base and PRO) + pre-filled form + `advanceIfNext` +
   `deleteLog` with confirm, goal tests.
6. Backup schema bump, AI export wording, HANDOFF/CLAUDE.md status update.
