# Spec — Exercise library ("Agregar ejercicios")

## Goal

The user can add exercises to a general exercise catalog. Routines are built by pulling
exercises from that catalog — per the user's own framing: "a routine has multiple
exercises that come from a base [catalog]." This turns exercises into a shared,
reusable entity instead of data baked into one specific day.

## Data model

See `00-overview.md` for the full picture. The two entities this feature owns:

- **`Exercise`** (catalog entry): `id`, `name`, `equipmentType`, `muscleGroups`,
  `defaultSets`, `defaultMinReps`/`defaultMaxReps` (or free-text `defaultReps`, or
  `defaultDurationSec` for isometric moves), `defaultRestSec`, `video?`, `note?`,
  `alternative?`, `source: 'base' | 'custom'`.
- **`RoutineExercise`** (per-routine usage of an exercise): `exerciseId`, `order`,
  `sets`, `minReps`/`maxReps`/`reps`/`durationSec`, `restSec`, `initialWeightKg?`,
  `plateNote?`. These can differ from the exercise's defaults — e.g. the same "Curl de
  bíceps con barra" could run 3×10-12 in one routine and 3×15 in another.

On first load, `src/data/program.ts`'s 21 exercises become the seed catalog
(`source: 'base'`), and the A/B/C days become the 3 seed routines referencing them.

## What the user can add

Per the answer that shaped this spec: **loose exercises that land in the general
catalog** (not full custom routines — that's out of scope here, though nothing in the
data model blocks it later since `Routine` is already generic).

## Flows

### A. Add a new exercise to the catalog directly

Entry point: an "Exercise library" screen (own nav item), with an "Add" button.

Form fields (all on one screen, no multi-step wizard — keep it to one thumb, per the
HANDOFF's phone-first constraint):

1. Name (text, required).
2. Equipment type: barbell / dumbbell pair / single dumbbell / bodyweight (segmented
   control).
3. Sets (stepper, default 3).
4. Reps: rep range (min/max) as the default; a "free text instead" toggle for cases like
   "10 per leg" or "max reps," matching how `Exercise.reps` already works in the data
   model.
5. Rest seconds (stepper, sensible default 60s).
6. Muscle groups (multi-select chips, freeform tag allowed).
7. Optional: initial weight, video link, note, alternative — collapsed under "more
   details" so the form doesn't look intimidating by default.

Saving adds it to the catalog with `source: 'custom'`. It is **not** in any routine yet —
that's a separate step (flow B), so browsing the catalog and building a routine stay
decoupled.

### B. Add an exercise to a specific routine

Entry point: inside a routine's edit view, "Add exercise" opens a searchable list of the
catalog (base + custom). Picking one appends it as a `RoutineExercise` with the
exercise's defaults pre-filled, editable inline (sets/reps/rest) before confirming.
If the exercise the user wants doesn't exist yet, "Create new" drops into the same form
as flow A, and on save it's immediately appended to this routine too — no need to leave
and come back.

### Editing and deleting

- Editing a catalog exercise's name/equipment/video/notes updates it everywhere it's
  used (shared identity). Editing sets/reps/rest from within a routine only changes that
  routine's `RoutineExercise`, not the catalog defaults.
- **Base exercises (`source: 'base'`) cannot be deleted** — deleting one could silently
  break the inventory-calculated program for a routine still relying on it. They *can* be
  removed from an individual routine (removes the `RoutineExercise` row, catalog entry
  stays).
- **Custom exercises** can be deleted from the catalog. If a custom exercise is currently
  used in one or more routines, deleting asks for confirmation and removes it from those
  routines too (no orphaned references).

### Weight sanity check (reuses feature 1's math)

When the user sets an `initialWeightKg` for barbell/dumbbell exercises (in either flow),
run it through the same buildable-weight check as the standalone calculator
(`01-weight-calculator.md`). If it's not buildable with current Settings inventory, show
a non-blocking warning with the nearest buildable weight — don't block saving, since the
user might add the exercise before deciding on a load.

## Out of scope (v1)

- Creating entire custom routines from scratch (routine creation UI is
  `04-routine-picker.md`'s and future work's concern; this spec only covers exercises).
- Auto-reordering a routine's exercises to minimize plate changes when custom exercises
  are added — HANDOFF §4 requires this for the base program, which was hand-ordered; for
  user-composed routines this becomes a real algorithm problem, tracked as a v2 idea, not
  blocking v1.
- Exercise images/GIFs beyond the existing YouTube link field.

## Acceptance criteria

- [ ] A newly added exercise appears in the "add exercise to routine" search immediately,
      no reload needed.
- [ ] The 3 base routines' exercise lists and numbers are byte-for-byte unchanged unless
      the user explicitly edits them — adding unrelated custom exercises never touches
      them.
- [ ] Deleting a base exercise is impossible from the UI (not just discouraged).
- [ ] History/progression for an exercise (`SessionLog` entries, double progression)
      survives it being used in more than one routine — progress is keyed by
      `exerciseId`, not by routine.
- [ ] Whole flow (name → equipment → save) takes under 30 seconds for a simple exercise —
      no required field beyond name and equipment type.
