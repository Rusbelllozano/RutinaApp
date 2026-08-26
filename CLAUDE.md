# RutinaApp

Offline-first, single-page web app for training at home following an A-B-C rotation.
It's a session tool (used phone-in-hand during the workout), not a static document.

**Product source of truth:** `docs/HANDOFF.md`. It contains the full user context, all
business rules, the program data, and the acceptance criteria. Read it before touching
any business logic — this CLAUDE.md summarizes technical decisions and project status,
it does not replace the handoff.

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
docs/HANDOFF.md           # full functional spec
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

## Next steps (building v1)

Suggested order, since each step depends on the previous one:

1. `src/lib/plates.ts` — pure plate calculator (no UI), with tests. It's the riskiest
   feature in the app; worth getting solid before building screens on top of it.
2. `src/store/useHistoryStore.ts` + `useRotationStore.ts` — persistence for logged
   sessions and the A/B/C rotation pointer.
3. `src/lib/progression.ts` — double progression, comparing against the last logged
   session.
4. Screens: Home → Warmup → Session mode (one exercise at a time) → Cooldown → Summary.
   Session mode is the central screen: one tap to confirm a set with the suggestion
   preloaded.
5. Rest timer (sound/vibration, skippable).
6. History with a simple chart per exercise.
7. Settings: barbell/dumbbell weights, plate inventory, sound, reset rotation.
8. Export/import the full state as JSON.
9. Load ceiling (HANDOFF section 7): alternate progression variants once an exercise has
   spent 3 weeks at the max buildable weight.

Before calling a feature done, check it against the acceptance criteria (HANDOFF section
8) — that's this project's definition of "done."
