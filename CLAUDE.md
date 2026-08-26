# RutinaApp

Offline-first, single-page web app for training at home following an A-B-C rotation.
It's a session tool (used phone-in-hand during the workout), not a static document.

**Product source of truth:** `docs/HANDOFF.md`. It contains the full user context, all
business rules, the program data, and the acceptance criteria. Read it before touching
any business logic — this CLAUDE.md summarizes technical decisions and project status,
it does not replace the handoff.

**Feature specs:** `docs/specs/` contains detailed specs for four features layered on top
of the HANDOFF's v1 scope — a standalone weight calculator, an exercise library (custom
exercises), a routine calendar (history + planning), and a routine picker (start any
routine, not just the auto-suggested one). Read `docs/specs/00-overview.md` first — it
explains the data model change (`WorkoutDay` → `Routine`, exercises become a shared
catalog) that all four specs depend on.

**Design system:** `docs/DESIGN.md` has the color/type/component tokens for every
screen — dark theme, one muted blue accent, flat blocks with no shadows, IBM Plex Sans +
Mono. Drafted as static mockups covering all 12 screens (the HANDOFF's core flow plus
the four specs above) before any screen was built; use it as the source of truth when
implementing screens, translating its tokens into Tailwind v4's `@theme` block in
`src/index.css`.

**Language split:** code, file names, types, comments and technical docs (this file,
README, HANDOFF) are in English. All user-facing UI text — exercise names, buttons,
messages, the PWA name — stays in **Spanish**, because the end user trains in Spanish.
Don't translate strings inside `src/data/program.ts` or any rendered copy.

## Current status

Initial scaffold. The toolchain, types, program data, and a settings store exist.
**Screens and business logic are not built yet** (rotation, plate calculator, double
progression, rest timer, history). See "Next steps".

## Stack

- **React 19 + Vite + TypeScript**, `react-ts` template.
- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config.js`; all theming lives
  in `src/index.css` via `@import "tailwindcss"` and, if the theme needs extending,
  `@theme` blocks).
- **Zustand** for global state, with the `persist` middleware to save to `localStorage`.
  Each persisted store uses its own `name` with a `routine-app:` prefix (e.g.
  `routine-app:settings`) so state can be inspected/exported independently later.
- **vite-plugin-pwa** (`registerType: 'autoUpdate'`) so the app is installable and works
  100% offline except for YouTube links, which open outside the app.
- **No backend, no accounts, no network** — all persistence is local to the device.
  Export/import to JSON is the only way to move data between devices and is required in
  v1, not a future nice-to-have.

## Commands

```bash
npm run dev       # local dev server with HMR
npm run build     # tsc -b && vite build → dist/
npm run preview   # serves dist/ locally to test the production build
npm run lint       # oxlint
```

## Structure

```
src/
  types/program.ts    # training program types (Exercise, WorkoutDay, Equipment…)
  data/program.ts       # actual program data (equipment, warmup, days A/B/C).
                         # Field names are English, string VALUES stay in Spanish
                         # (they're UI content). Do NOT improvise these numbers —
                         # see HANDOFF section 9.
  store/                 # Zustand stores, one per domain (settings, rotation, history…)
  App.tsx                # app shell (placeholder for now)
docs/HANDOFF.md           # full functional spec (v1 baseline)
docs/specs/                # feature specs layered on top of the HANDOFF (see above)
docs/DESIGN.md             # design system tokens (see above)
.github/workflows/deploy.yml  # build + deploy to GitHub Pages on push to main
```

As features get built, each main screen (Home, Session, History, Settings) goes in
`src/screens/`, and pure logic without JSX (plate calculator, rotation, double
progression) goes in `src/lib/` so it can be tested without rendering components.

## Deployment

GitHub Pages, served under `/RutinaApp/` (`base` in `vite.config.ts` must match the repo
name). `.github/workflows/deploy.yml` builds and publishes on every push to `main`. The
first time, enable Pages on the repo with **Source: GitHub Actions** (Settings → Pages).

Important: if the repo is ever renamed, update `base` in `vite.config.ts` and
`start_url`/`scope` in the PWA manifest (also in `vite.config.ts`) — if they don't match,
the installed app breaks.

## Key business rules (summary — full detail lives in the HANDOFF)

- **A→B→C→A… rotation**, not tied to calendar dates. If the user misses a day, whatever
  was due comes back next time — no "catching up," no broken-streak messaging. Sunday
  suggests rest but doesn't block training.
- **Double progression**: add 1 rep per set per week; once the user hits the top of the
  rep range on every set, suggest +2.5 kg (with an Accept/Not yet button), never apply it
  automatically.
- **Plate calculator**: given a target weight, says which plates to load; given the
  inventory, says which weights are achievable. Never suggest a load that isn't buildable
  from 4×1.25 + 6×2.5 + 4×5 kg, and never an asymmetric load between sides/ends. The plate
  inventory is shared across all 3 bars within one session — detect conflicts and order
  exercises to minimize plate changes.
- **Minimum session (20 min)**: first 3 exercises, 2 sets each, still counts as a
  completed session for the rotation and history. This is the main anti-dropout
  mechanism — it has to be easy to find, never hidden.
- **Deload** every 6-8 weeks: 60% of the usual load (rounded to the nearest buildable
  weight) for 6 sessions.
- **UI tone**: never blame the user for missing a day. No red broken streaks. At most a
  neutral nudge like "3 days since your last session. The minimum session is 20 min."
  (in Spanish in the actual UI).
- **Out of scope for v1**: accounts, sync, backend, calorie tracking, body weight,
  measurements, or progress photos.

## Decisions already made (don't re-ask)

- Stack: React + Vite + Zustand + Tailwind (chosen by the user).
- Installable PWA: yes.
- Hosting: GitHub Pages.
- Persistence: `localStorage` via Zustand `persist` (enough for this app's data volume;
  if a given store grows a lot, consider IndexedDB just for that store).
- Codebase language: English for code/files/docs, Spanish for all UI-facing content.

## What can be decided without asking vs. what needs confirmation

See HANDOFF section 9. Summary: file structure, visual design, internal names, and chart
shapes are free to decide. **Any change to the program itself** (exercises, sets, reps,
initial loads, the rotation) must be confirmed with the user before touching it — those
numbers are calculated for the real equipment inventory.

## Next steps (building v1 + the specs in docs/specs/)

Suggested order, since each step depends on the previous one. This supersedes the plain
`WorkoutDay`-based plan from before the specs existed — step 2 now builds the
catalog/routine model from `docs/specs/00-overview.md` instead of a flat day list.

1. `src/lib/plates.ts` — pure plate calculator (no UI), with tests. It's the riskiest
   feature in the app; worth getting solid before building screens on top of it. Powers
   session mode, `docs/specs/01-weight-calculator.md`'s standalone screen, and the
   weight-sanity check in `docs/specs/02-exercise-library.md`.
2. Data model + stores per `docs/specs/00-overview.md`: `Exercise`/`Routine`/
   `RoutineExercise` types (replacing `WorkoutDay`), seeded from `src/data/program.ts` on
   first load, plus `useExerciseStore`, `useRoutineStore`, `useRotationStore`,
   `useHistoryStore`, `useCalendarStore`.
3. `src/lib/progression.ts` — double progression, comparing against the last logged
   session for a given `exerciseId` (not per-routine).
4. Screens: Home → Warmup → Session mode (one exercise at a time) → Cooldown → Summary.
   Session mode is the central screen: one tap to confirm a set with the suggestion
   preloaded, and per `docs/specs/04-routine-picker.md` it's routine-id-driven so any
   entry point (auto-suggested, manually picked, from the calendar) lands here.
5. Rest timer (sound/vibration, skippable).
6. Routine picker (`docs/specs/04-routine-picker.md`) and exercise library
   (`docs/specs/02-exercise-library.md`) screens.
7. History with a simple chart per exercise, and the routine calendar
   (`docs/specs/03-routine-calendar.md`).
8. Settings: barbell/dumbbell weights, plate inventory, sound, reset rotation.
9. Export/import the full state as JSON — must cover all six persisted stores, not just
   settings.
10. Load ceiling (HANDOFF section 7): alternate progression variants once an exercise has
    spent 3 weeks at the max buildable weight.

Before calling a feature done, check it against the acceptance criteria in HANDOFF
section 8 and in the relevant `docs/specs/*.md` file — those are this project's
definition of "done."
