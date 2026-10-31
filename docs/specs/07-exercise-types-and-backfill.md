# Spec — Exercise types (running/cardio) + logging past sessions from the calendar

Status: **planned, not built.** Decisions below were confirmed with the user on
2026-10-31.

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
4. Tapping a Done day lists its sessions; each opens the read-only detail, plus a
   "Registrar otra sesión" button. (Editing/deleting a backfilled log: optional
   stretch, see open questions.)

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
- [ ] No weight/plate UI on cardio/mobility exercises; no progression suggestions for
      them.

## Open questions (not blocking)

- Should a backfilled log be editable/deletable afterwards? (Spec 03 lists history
  editing as out of scope; backfill makes typos more likely.) Proposal: allow
  delete-only for `source: 'manual'` logs.
- Should runs count toward the PRO cycle goal (`src/lib/goal.ts`)? Proposal: no —
  the goal is about the PRO strength week.

## Build order

1. Types + seed/persist migrations (`kind`, `distanceKm`, `source`, sorted logs) + tests.
2. History store sorted insert + `getLogsForDate` + progression tests.
3. AddExercise / library type field and filters.
4. Session mode cardio card + Summary/History rendering + km chart.
5. Calendar backfill sheet + pre-filled form + `advanceIfNext`.
6. Backup schema bump, AI export wording, HANDOFF/CLAUDE.md status update.
