# Spec — Routine calendar

## Goal

One calendar view that does two things the user asked for together: show **history**
(what was actually trained, and when) and allow **future planning** (pin a routine to an
upcoming date).

## Reconciling this with HANDOFF §3.1

HANDOFF §3.1 is explicit: the A→B→C rotation is not tied to calendar dates, and the app
must never guilt the user over missed days. Adding a calendar does not change that rule —
it adds a *view* on top of it. Concretely:

- The rotation queue (`RotationState`) keeps deciding "what's next" exactly as before,
  independent of any date. Home screen's suggestion (HANDOFF §5.1) is unaffected by this
  feature.
- A planned-but-skipped date is never shown as a failure (no red, no streak-break copy) —
  see "Visual language" below.
- Planning a date does **not** reserve or consume a slot in the rotation queue. Only an
  actually-completed session advances the queue (see `00-overview.md`'s design
  decisions). If the user plans "Wed = B" but the queue's next-up is A and they end up
  training A on Wednesday instead, the calendar just reflects what happened (A on
  Wednesday) — it doesn't fight the rotation over it.

## Data

**`ScheduledRoutine`**: `{ date: string (ISO date), routineId: string, status: 'planned' | 'rest' }`.
User-created, future-facing only. Past dates don't need one of these to show history —
history comes straight from `SessionLog` (already required by HANDOFF §5.6).

A calendar day's rendered state is derived, not stored redundantly:

| Condition | Rendered as |
|---|---|
| A `SessionLog` exists for that date | **Done** — tap to see the logged routine/sets/reps/weights. |
| No `SessionLog`, but a `ScheduledRoutine` (`planned`) exists for a future date | **Planned** — tap to change or clear it. |
| No `SessionLog`, `ScheduledRoutine.status === 'rest'` | **Rest** (explicit, user-marked). |
| No `SessionLog`, no `ScheduledRoutine`, date is in the past | **Blank** — not a failure state, just no data. Rendered identically to a day before the user started using the app. |
| No `SessionLog`, no `ScheduledRoutine`, date is today or future | **Blank** — open to planning. |

## Visual language (ties to HANDOFF's "no guilt" tone)

- Colors encode **which routine** (e.g. each routine gets a stable, muted color from a
  small palette), never "success vs. failure." A blank day is neutral, not red.
- No streak counters, no "you missed N days" badges on the calendar itself. If a
  did-you-train nudge exists at all, it lives on the Home screen per HANDOFF §3.1's
  wording ("3 days since your last session..."), not on this calendar.

## Flows

### Viewing history

- Month grid, current month by default, swipe or arrow buttons to move between months
  (no long forms, per the phone-first constraint).
- Tapping a **Done** day opens a read-only detail sheet: routine name, each exercise with
  the weight/reps actually logged, whether it was the minimum-session version.

### Planning ahead

- Tapping a **blank** future day opens a small sheet: "Assign a routine" (list of
  routines, same list as `04-routine-picker.md`) or "Mark as rest day."
- Tapping an already-**planned** day lets the user change or clear the assignment.
- Planning today doesn't start a session — it just labels the day. Starting the session
  itself is `04-routine-picker.md`'s flow (from Home, or from tapping "start" inside
  today's planned-day detail sheet, which is a convenience shortcut into the same flow).

## Non-goals (v1)

- Recurring plan templates ("always B on Mondays"). Each planned date is set
  individually.
- Reminders/notifications tied to planned dates — no backend, no push infra (HANDOFF
  §2/§5 keep this app backend-free).
- Editing a past **Done** day's logged data from the calendar — that's history-editing
  scope, not this feature; out of scope unless the user asks for it later.

## Acceptance criteria

- [ ] Marking a future date, then missing it, produces zero guilt UI anywhere — on the
      calendar or on Home.
- [ ] The rotation's "next up" on Home is never wrong because of something set on the
      calendar — completing a session is the only thing that changes it.
- [ ] History shown on the calendar exactly matches `SessionLog` — no separate,
      divergent record of what was done.
- [ ] Calendar is usable one-handed: month navigation and day taps only, no typing
      required to view history.
