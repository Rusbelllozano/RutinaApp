# Spec — Standalone weight/plate calculator

## Goal

Let the user answer, at any moment (not only mid-workout): "what plates do I load for
this weight?" and "what weights can I even build with what I own?" — using the exact same
math the session screen uses, so the two never disagree.

## Why standalone, in addition to session mode

HANDOFF §4 already requires this logic embedded per-exercise in session mode. The user
asked for it as its own feature, which implies a second entry point: a dedicated screen
reachable from a menu/nav, useful when the user is, say, deciding what dumbbell load to
try for a new exercise before it's ever in a routine.

**Implementation rule:** both entry points call the same pure function from
`src/lib/plates.ts` (per `CLAUDE.md`'s next steps). This spec does not define new math —
it reuses HANDOFF §4's rules — it only defines the standalone UI around it.

## Core rules (from HANDOFF §4, restated for reference)

- **Barbell:** plates split symmetrically, 2 sides. Buildable range: 6 kg (bar alone) to
  46 kg, in 2.5 kg steps.
- **Single dumbbell:** 2 symmetric ends.
- **Dumbbell pair:** each plate type used must cover 4 ends (1 per end across both
  dumbbells). Max per dumbbell in a pair: 19 kg (1.25 + 2.5 + 5 per end).
- **Never** suggest a load that isn't buildable with the current inventory, and never an
  asymmetric one.
- Inventory (plate counts, bar weights) comes from `routine-app:settings`, so the
  calculator reflects whatever the user configured there — not hardcoded numbers.

## Modes

The screen has two modes, switched with a toggle at the top:

### 1. "What plates do I load?" (target → plates)

- Inputs: equipment type (barbell / single dumbbell / dumbbell pair — segmented control,
  one tap), target weight (numeric stepper, default step 2.5 kg since that's the minimum
  jump).
- Output: a plate breakdown per side/end, shown as text ("2.5 kg + 1.25 kg per side")
  — a visual plate stack is a nice-to-have, not required for v1.
- If the exact target isn't buildable: don't just fail — show the two nearest buildable
  weights (one below, one above) as tappable suggestions, consistent with "if it can't be
  built, it doesn't exist" (HANDOFF §3.3).

### 2. "What can I build?" (inventory → list of weights)

- Input: equipment type only.
- Output: the full list of buildable weights for that equipment type, ascending. For
  barbell this is bounded (6–46 kg by 2.5 kg per HANDOFF §4); for dumbbell pair/single,
  the list is generated from the actual configured inventory, not assumed.

## Non-goals for this screen

- No conflict detection across exercises in a session (that's session mode's job, since
  it depends on what else is scheduled in the same session — see HANDOFF §4 "Inventory
  conflict").
- No logging — this is a lookup tool, it never writes to `SessionLog`.

## Acceptance criteria

- [ ] Every weight this tool calls "buildable" is actually buildable with the plate
      counts currently set in Settings, and vice versa — no drift between the two.
- [ ] Changing bar/plate weights in Settings changes this tool's output immediately (no
      stale cache).
- [ ] Reachable in ≤2 taps from anywhere in the app.
- [ ] Works fully offline, one-handed, no zoom needed.
