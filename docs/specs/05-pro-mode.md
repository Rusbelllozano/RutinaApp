# Spec — PRO mode (second, switchable program)

## Goal

The app goes from one program to **two modes**, picked from a visible switch at the top
of Home:

| Mode | UI label | Program |
|---|---|---|
| `base` | **Base** | The existing A→B→C rotation, 6 flexible days (default, unchanged) |
| `pro` | **PRO** | 5-day split tied to the weekday, Monday to Friday, weekend off |

Switching mode changes which routines Home suggests, how the calendar fills in, which
rotation logic applies, and the whole app's color palette. It does **not** replace
anything existing: Base stays the default and behaves exactly as before this feature.

This spec builds on `00-overview.md`'s catalog/routine model and amends two of its rules
(progression lookup and seeding) — see "Changes to earlier specs" at the end.

## The conceptual difference (this drives the implementation)

They are not the same program with different exercises — they schedule differently:

- **Base is a cyclic queue.** `A → B → C → A…` regardless of date. Miss a day and the
  same routine is still next. Nothing is ever lost (HANDOFF §3.1, unchanged).
- **PRO is tied to the week.** Monday = Day 1 … Friday = Day 5. Miss Wednesday and
  **that day is not made up**: Thursday is still Day 4. Saturday and Sunday are rest.

So PRO has **no stored rotation state**: "today's routine" is a pure function of the
local date. Base keeps `routine-app:rotation` exactly as it is today.

## Mode switch

- **Placement:** top of Home, a two-segment control (`Base` | `PRO`). Not hidden in
  Settings.
- **Persisted** in a new store, `routine-app:mode` (`{ mode: 'base' | 'pro' }`). Reopening
  the app returns to the last mode used.
- **Confirmation required.** Modal copy, switching to PRO:
  "Vas a cambiar a modo PRO: 5 días, lunes a viernes, sin recuperar días perdidos. Tu
  historial se conserva." Switching to Base:
  "Vas a cambiar a modo Base: rotación A-B-C, sin días fijos. Tu historial se conserva."
  Buttons: **Cambiar** / **Cancelar**.
- **Locked during a session.** While a session has been started and not yet logged or
  discarded (`useSessionTimerStore.startedAt !== null`), the switch is disabled and shows
  "Termina o descarta la sesión actual." as visible helper text — not only a tooltip,
  since there's no hover on a phone. Home also shows a "Tienes una sesión en curso" card
  with **Continuar** / **Descartar** (with confirmation), so a session abandoned by
  closing the app can't leave the switch locked for good.
- **The current mode is always stated in text on Home** (e.g. a "Modo PRO" / "Modo Base"
  label next to the switch). Color alone is not enough.

## Theme per mode

The palette change is the at-a-glance signal of which program is active, so it must be
unmistakable, not a subtle tint.

- **Base:** the user keeps choosing their theme in Settings → Apariencia. The four
  existing dark themes stay, and a new **light theme ("Claro")** is added and becomes the
  default for new installs. Existing users keep whatever theme they already stored; one
  who never picked a theme (nothing stored, but other app data present) keeps the dark
  "Océano" default they've been seeing rather than flipping to light on update.
- **PRO:** one fixed theme — dark, high contrast, warm saturated amber accent. While in
  PRO the Settings theme picker is hidden (or disabled with a note "El modo PRO usa su
  propio tema"); the user's Base choice is kept and restored when switching back.

### Implementation

Keep the existing mechanism (`data-theme` on `<html>`, `[data-theme="..."]` blocks in
`src/index.css`, see `src/App.tsx`). Add two blocks, `claro` and `pro`. `App.tsx` sets
`data-theme="pro"` while the mode is PRO and the stored Base theme otherwise. Do not add
a second attribute (`data-mode`) — one attribute, one source of palette truth. No
hardcoded colors in components (already the rule in `docs/DESIGN.md`).

Proposed palettes (contrast verified with the WCAG 2.x formula; every text/accent/status
token below is ≥ 4.5:1 against all three surface levels of its own theme):

| Token | `claro` | `pro` |
|---|---|---|
| `--color-bg` | `#f5f6f8` | `#0b0b0d` |
| `--color-bg-elevated` | `#ffffff` | `#17171b` |
| `--color-bg-elevated-2` | `#e9edf2` | `#222228` |
| `--color-text` | `#14171c` | `#f5f5f7` |
| `--color-text-secondary` | `#4a5361` | `#bdbdc7` |
| `--color-text-tertiary` | `#5f6877` | `#9393a0` |
| `--color-accent` | `#2f62a8` | `#ff9f1c` |
| `--color-accent-ink` | `#ffffff` | `#1a0f00` |
| `--color-danger` | `#b23b3b` | `#ff6b6b` |

Lowest measured pairs: `claro` tertiary text on `bg-elevated-2` 4.78:1; `pro` tertiary
text on `bg-elevated-2` 5.21:1. There is no separate "success" token: a done set uses the
accent and neutral surfaces, which are covered above. Routine colors are used as
calendar text and as cell fills under `--color-bg` text, so they're held to 4.5:1 against
`--color-bg` too — `claro` gets darker variants of A/B/C. Each PRO weekday routine has
its own color (`--color-routine-pro-1…5`: coral, teal, blue, lilac, yellow), distinct from
the amber accent and from Base's A/B/C so a calendar legend that mixes both modes stays
readable. Exact hex values are the implementer's call; **the 4.5:1 floor is not** —
`src/lib/themeContrast.test.ts` reads `src/index.css` and enforces it.

### Non-negotiable requirements

- Text contrast ≥ 4.5:1 in `claro` and `pro`. Verify, don't assume.
- ~200 ms color transition when switching, disabled under `prefers-reduced-motion`.
- PRO stays readable in daylight at medium screen brightness (it's used in a room, not a
  studio) — hence the near-black background with bright, not muted, text.
- Status colors (green = set done, red = error) stay recognizable in both.
- PRO must be distinguishable at a glance from **every** Base theme — including
  `atardecer`, whose muted orange accent (`#d89e6c`) is the closest. The PRO accent is
  more saturated and the background is near-black, and the "Modo PRO" label is always
  present.

## State: what's split and what's shared

### Split by mode

| Concern | Base | PRO |
|---|---|---|
| "What's next" | `routine-app:rotation` (unchanged) | Derived from the date, no store |
| Last completed session in this program | Derived from history: latest log whose `routineId` is a Base routine | Same, for PRO routines |
| Theme | User's choice (`routine-app:theme`) | Fixed `pro` |
| Calendar future cells | Manual planning (`routine-app:calendar`) | Auto-filled, read-only (see Calendar) |

PRO completing a session never touches `routine-app:rotation`, and Base never reads
anything PRO-specific. `advanceAfter` already ignores routine ids outside its `order`, so
logging a PRO routine is a no-op for the Base queue with no code change there.

### Shared across modes (key)

- **One history, keyed by `exerciseId`, not by mode.** Barbell squat exists in Base/B
  and PRO/Tuesday. It's the same exercise: if history were duplicated, double
  progression would reset on switching mode and the user would lose weeks of progress.
  PRO references the existing catalog ids — see the mapping table below.
- **Equipment inventory and bar weights** (`routine-app:settings`).
- **Total session count and the deload cycle** (HANDOFF §3.4) — when deload is built,
  it counts sessions from both modes. (Deload isn't implemented yet; this only fixes
  which sessions it will count.)
- **Export/import:** one file with everything (see below).

### Data model additions

- `Routine.mode?: 'base' | 'pro'` — set on seeded routines (`base-a/b/c` → `base`,
  `pro-1…5` → `pro`). Custom routines leave it unset and appear in the routine picker in
  **both** modes; they never enter PRO's weekday schedule or Base's rotation `order`
  (same as custom routines today).
- `Routine.weekday?: 1 | 2 | 3 | 4 | 5` — PRO routines only (ISO weekday, Monday = 1).
- `RoutineExercise.initialPlates?: number[]` — plates per side (barbell / single dumbbell)
  or per end (each dumbbell of a pair) for the first session. When present, the initial
  weight is **computed** as `handle + 2 × sum(initialPlates)` using the bar weights in
  Settings, never stored as a number. See "Loads are computed".
- `RoutineExercise.keepPlates?: true` — "same bar/dumbbell as the previous exercise,
  don't touch the plates" (the source's `sinCambioDeDiscos`). Feeds the plate-setup
  screen's change list; when set, `initialPlates` is inherited from the previous
  exercise using the same implement if omitted.
- `RoutineExercise.nameOverride?: string` — display name for this routine only. Needed
  once: PRO shows "Hollow hold" for the catalog entry "Hollow hold o bicicleta
  abdominal" (see mapping).

## Loads are computed, not copied

PRO loads are specified as **plate configurations**, not kilograms. The kg shown is
derived from the bar weights in Settings (`plates.ts`, the single plate implementation —
`00-overview.md`). So if the user changes the barbell from 6 to 7 kg, the first-session
suggestion for "Sentadilla" goes from 26 to 27 kg automatically.

Storing the plates (not just the total) also matters because the source chose specific
plates to avoid inventory conflicts — e.g. Wednesday's one-hand row uses 2 × 2.5 per end
because the 5 kg plates are on the barbell. `plateBreakdown()` alone would pick one 5 kg
per end. For the first session, show `initialPlates` as the plate suggestion; after
that, the suggested weight comes from history as usual and `plates.ts` computes the
breakdown.

**Weight convention (applies to both modes):** handle + plates, collars not counted —
the way `plates.ts` already computes. The nominal kg in the tables below assume a 6 kg
barbell and a 1.5 kg dumbbell handle.

### Fixing the same inconsistency in Base

Base's dumbbell numbers in `src/data/program.ts` (and HANDOFF §6) are all 0.5 kg higher
than the plates they describe — they assumed a 2 kg handle. The user confirmed
correcting them to the handle + plates convention; **the plates loaded don't change**:

| Routine / exercise | Plates | Was | Now |
|---|---|---|---|
| A · Press de pecho en piso con mancuernas | 5 per end | 12 | 11.5 |
| A · same, `alternative` text | 2.5 + 1.25 per end | "9.5 kg" | "9 kg" |
| A · Aperturas en piso con mancuernas | 2.5 per end | 7 | 6.5 |
| A · Elevaciones laterales | 1.25 per end | 4.5 | 4 |
| A · same, `alternative` text | bare handles | "~2 kg" | "~1.5 kg" |
| A · Extensión de tríceps, `alternative` text | 2.5 + 1.25 per end | "9.5 kg" | "9 kg" |
| B · Zancadas estáticas con mancuernas | 2.5 per end | 7 | 6.5 |
| C · Pájaros / aperturas invertidas | 1.25 per end | 4.5 | 4 |
| C · Curl martillo con mancuernas | 2.5 per end | 7 | 6.5 |

Barbell loads (11, 21, 31) and C's single-dumbbell loads (11.5, 6.5) are already
consistent. Already-logged weights in history are **not** rewritten. For existing users,
the migration patches `initialWeightKg` on the stored `base-a/b/c` routines only where
it still equals the old value (the user may have edited it in the routine editor).

## PRO program data

**Profile:** 92 kg · 1.86 m · beginner · desk job · priority: muscle.

### Weekly schedule

| Day | Focus | Routine id | Name (UI) |
|---|---|---|---|
| Monday | Chest + triceps | `pro-1` | Pecho + Tríceps |
| Tuesday | Legs (quads) + core | `pro-2` | Pierna (cuádriceps) + Core |
| Wednesday | Back + biceps | `pro-3` | Espalda + Bíceps |
| Thursday | Shoulders + core | `pro-4` | Hombros + Core |
| Friday | Hamstrings, glutes, calves + core | `pro-5` | Femoral, Glúteo y Pantorrilla + Core |
| Sat / Sun | Rest | — | — |

> The order is intentional: back is on Wednesday so it isn't adjacent to leg day — the
> lower back works hard in both and needs a day between. **Do not reorder** days, and
> do not reorder exercises within a day (that's a program change, HANDOFF §9). Plate
> changes between exercises are shown by the plate-setup screen, not "fixed" by
> reordering.

Warmup and cooldown: the same as Base (`program.warmup` / `program.cooldown`). Reuse,
don't duplicate.

### Catalog mapping

PRO reuses existing catalog entries wherever it's the same movement, so history and
progression carry over. Existing ids are what `seed.ts` derives today (`base-<slug>`);
new PRO entries get **explicit literal ids** in the data file (not re-derived from the
name), with `source: 'base'`.

| PRO exercise | Catalog id | |
|---|---|---|
| Press de pecho en piso con barra | `base-press-de-pecho-en-piso-con-barra` | new (≠ Base's dumbbell version — different implement, separate history) |
| Press cerrado en piso (tríceps) | `base-press-cerrado-en-piso-triceps` | new |
| Pull-over en piso con 1 mancuerna | `base-pull-over-en-piso-con-una-mancuerna` | existing |
| Aperturas en piso con mancuernas | `base-aperturas-en-piso-con-mancuernas` | existing |
| Extensión de tríceps sobre la cabeza | `base-extension-de-triceps-sobre-la-cabeza` | existing |
| Flexiones | `base-flexiones-rodillas-si-hace-falta` | existing |
| Plancha frontal | `base-plancha-frontal` | existing |
| Sentadilla con barra en la espalda | `base-sentadilla-con-barra-en-la-espalda` | existing |
| Puente de glúteo con barra | `base-puente-de-gluteo-con-barra-sobre-la-cadera` | existing |
| Elevación de talones con barra | `base-elevacion-de-talones-con-barra` | existing |
| Zancadas estáticas con mancuernas | `base-zancadas-estaticas-con-mancuernas` | existing |
| Sentadilla búlgara (pie atrás en silla) | `base-sentadilla-bulgara-pie-atras-en-silla` | new |
| Dead bug | `base-dead-bug` | existing |
| Plancha lateral | `base-plancha-lateral` | existing |
| Peso muerto convencional | `base-peso-muerto-convencional` | new |
| Remo con barra inclinado (45°) | `base-remo-con-barra-inclinado-torso-a-45` | existing |
| Remo a una mano con mancuerna | `base-remo-a-una-mano-con-mancuerna` | existing |
| Curl de bíceps con barra | `base-curl-de-biceps-con-barra` | existing |
| Curl concentrado | `base-curl-concentrado` | new |
| Press militar de pie con barra | `base-press-militar-de-pie-con-barra` | existing (same exercise despite Base 11 kg / PRO 16 kg start — progression continues) |
| Encogimientos de hombros (trapecio) | `base-encogimientos-de-hombros-trapecio` | new |
| Elevaciones laterales | `base-elevaciones-laterales` | existing |
| Pájaros (deltoides posterior) | `base-pajaros-aperturas-invertidas-inclinado` | existing |
| Press de hombro sentado en el piso | `base-press-de-hombro-sentado-en-el-piso` | new |
| Hollow hold | `base-hollow-hold-o-bicicleta-abdominal` | existing, `nameOverride: 'Hollow hold'` — Base history for the combined exercise continues here |
| Bicicleta abdominal | `base-bicicleta-abdominal` | new, starts with no history |
| Peso muerto rumano con barra | `base-peso-muerto-rumano-con-barra` | existing |
| Zancadas hacia atrás con mancuernas | `base-zancadas-hacia-atras-con-mancuernas` | new |
| Peso muerto a una pierna | `base-peso-muerto-a-una-pierna` | new |

Where PRO's display name differs slightly from the catalog name (e.g. "Flexiones" vs
"Flexiones (rodillas si hace falta)"), the catalog name is shown — only Hollow hold gets
an override, because there the catalog name would be actively wrong next to a separate
"Bicicleta abdominal".

New catalog entries get `video` as a YouTube search URL in the same format Base uses
(`https://www.youtube.com/results?search_query=<terms>`); existing entries keep theirs.
Muscle groups for new entries: the PRO day's tags, as `seed.ts` does for Base.

### Routines

Columns: sets · reps (range, fixed, or text) · rest · implement · `initialPlates` per
side/end · nominal kg (for reference only — computed, never stored) · notes.
Implements: `barbell`, `single_dumbbell`, `dumbbell_pair`, `bodyweight` (existing
`EquipmentType`).

**`pro-1` · Monday · Pecho + Tríceps** — muscle groups `pecho`, `tríceps`

| # | Exercise | Sets | Reps | Rest | Implement | Plates | kg | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Press de pecho en piso con barra | 4 | 8–12 | 90 | barbell | 5, 5 | 26 | |
| 2 | Press cerrado en piso (tríceps) | 3 | 10 | 75 | barbell | — | 26 | `keepPlates` |
| 3 | Pull-over en piso con 1 mancuerna | 3 | 12–15 | 60 | single_dumbbell | 2.5, 1.25 | 9 | |
| 4 | Aperturas en piso con mancuernas | 3 | 12–15 | 60 | dumbbell_pair | 2.5 | 6.5 | |
| 5 | Extensión de tríceps sobre la cabeza | 3 | 10–12 | 60 | barbell | 1.25, 1.25 | 11 | alt: "Si molesta el codo: una mancuerna con las dos manos" |
| 6 | Flexiones | 2 | "máximas" | 60 | bodyweight | | | |
| 7 | Plancha frontal | 3 | 40 s | 45 | bodyweight | | | |

**`pro-2` · Tuesday · Pierna (cuádriceps) + Core** — `cuádriceps`, `glúteos`, `pantorrillas`, `core`

| # | Exercise | Sets | Reps | Rest | Implement | Plates | kg | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Sentadilla con barra en la espalda | 4 | 10–12 | 90 | barbell | 5, 5 | 26 | |
| 2 | Puente de glúteo con barra | 3 | 15 | 60 | barbell | 5, 5, 2.5 | 31 | |
| 3 | Elevación de talones con barra | 4 | 15–20 | 45 | barbell | — | 31 | `keepPlates` |
| 4 | Zancadas estáticas con mancuernas | 3 | "10 por pierna" | 75 | dumbbell_pair | 2.5 | 6.5 | |
| 5 | Sentadilla búlgara (pie atrás en silla) | 3 | "10 por pierna" | 75 | dumbbell_pair | — | 6.5 | `keepPlates` |
| 6 | Dead bug | 3 | "10 por lado" | 45 | bodyweight | | | |
| 7 | Plancha lateral | 3 | 25 s | 45 | bodyweight | | | |

**`pro-3` · Wednesday · Espalda + Bíceps** — `espalda`, `bíceps`

| # | Exercise | Sets | Reps | Rest | Implement | Plates | kg | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Peso muerto convencional | 4 | 8 | 120 | barbell | 5, 5, 2.5, 2.5, 2.5 | 41 | note: "Barra pegada a las piernas, espalda recta. Si se redondea, baja el peso de inmediato." |
| 2 | Remo con barra inclinado (45°) | 3 | 10–12 | 90 | barbell | 5, 5, 2.5 | 31 | |
| 3 | Remo a una mano con mancuerna | 3 | "12 por lado" | 75 | single_dumbbell | 2.5, 2.5 | 11.5 | |
| 4 | Pull-over en piso | 3 | 12–15 | 60 | single_dumbbell | — | 11.5 | `keepPlates` |
| 5 | Curl de bíceps con barra | 3 | 10–12 | 60 | barbell | 1.25, 1.25 | 11 | |
| 6 | Curl concentrado | 3 | "12 por brazo" | 45 | single_dumbbell | 2.5, 2.5 | 11.5 | |
| 7 | Plancha frontal | 3 | 40 s | 45 | bodyweight | | | |

**`pro-4` · Thursday · Hombros + Core** — `hombros`, `trapecio`, `core`

| # | Exercise | Sets | Reps | Rest | Implement | Plates | kg | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Press militar de pie con barra | 4 | 8–12 | 90 | barbell | 5 | 16 | note: "Sube de peso solo cuando no se arquee la espalda baja." |
| 2 | Encogimientos de hombros (trapecio) | 3 | 15 | 60 | barbell | 5, 5, 2.5, 2.5, 2.5 | 41 | |
| 3 | Elevaciones laterales | 4 | 12–15 | 60 | dumbbell_pair | 1.25 | 4 | alt: "Si los hombros se van hacia arriba, usa las barras solas" |
| 4 | Pájaros (deltoides posterior) | 3 | 12–15 | 60 | dumbbell_pair | — | 4 | `keepPlates` |
| 5 | Press de hombro sentado en el piso | 3 | 10–12 | 75 | dumbbell_pair | 2.5 | 6.5 | |
| 6 | Hollow hold | 3 | 30 s | 45 | bodyweight | | | |
| 7 | Bicicleta abdominal | 3 | "20 por lado" | 45 | bodyweight | | | |

**`pro-5` · Friday · Femoral, Glúteo y Pantorrilla + Core** — `femorales`, `glúteos`, `pantorrillas`, `core`

| # | Exercise | Sets | Reps | Rest | Implement | Plates | kg | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Peso muerto rumano con barra | 4 | 10–12 | 90 | barbell | 5, 5, 2.5, 2.5 | 36 | note: "El estiramiento se siente en el femoral, no en la lumbar." |
| 2 | Puente de glúteo con barra | 4 | 15 | 75 | barbell | 5, 5, 2.5, 2.5, 2.5 | 41 | |
| 3 | Elevación de talones con barra | 4 | 20 | 45 | barbell | — | 41 | `keepPlates` |
| 4 | Zancadas hacia atrás con mancuernas | 3 | "10 por pierna" | 75 | dumbbell_pair | 1.25 | 4 | |
| 5 | Peso muerto a una pierna | 3 | "10 por lado" | 60 | dumbbell_pair | — | 4 | `keepPlates` |
| 6 | Dead bug | 3 | "12 por lado" | 45 | bodyweight | | | |
| 7 | Plancha lateral | 3 | 30 s | 45 | bodyweight | | | |

Notes and alternatives above are **per routine** in the source, but the catalog's
`note`/`alternative` fields are per exercise. Where a reused catalog entry already has a
note (e.g. Base's Peso muerto rumano), keep the existing one; set the PRO text only on
new entries.

**Inventory check (done while writing this spec):** every configuration above is
buildable from 4×1.25 + 6×2.5 + 4×5 on its own. The 41 kg loads use *all* 5 kg and
2.5 kg plates, so Wednesday (deadlift → one-hand row), Thursday (shrugs → shoulder press)
and Friday require stripping the barbell before loading dumbbells — the plate-setup
screen must show those changes (HANDOFF §4, "Inventory conflict").

## Home in PRO

- **Weekday (Mon–Fri):** today's routine (`pro-<weekday>`) as the main "Empezar" card,
  same layout as Base.
- **Saturday/Sunday:** a rest screen ("Hoy es día de descanso.") with a secondary
  "Entrenar igual" link that opens the routine picker — same spirit as Base's Sunday
  (HANDOFF §3.1): rest is suggested, never enforced.
- **Missed days are never mentioned as failures.** No "you missed Wednesday", no red. The
  neutral nudge from HANDOFF ("N días desde tu última sesión. La sesión mínima es de 20
  min.") still applies, counting days since the last session in either mode.
- **Minimum session (20 min)** works exactly as in Base: same always-visible button,
  first 3 exercises, 2 sets each, counts as a completed session — including toward the
  cycle goal below.

## Routine picker in PRO

`04-routine-picker.md` applies unchanged: the picker lists the five PRO routines plus any
custom routines, and the user can start **any** of them on any day (e.g. Wednesday's
back day on Thursday or Saturday). It's logged and counts as a session, but it changes
nothing: Thursday's suggestion is still Day 4, because PRO's suggestion only reads the
date. Making up a day is the user's decision, never something the app asks for.

In Base mode the picker lists Base routines plus custom ones (PRO routines hidden), so
each mode stays self-contained.

## Calendar in PRO

- **Future dates:** auto-filled and **read-only** — each weekday shows its PRO day,
  weekends show rest. No manual planning; `routine-app:calendar` entries are neither
  shown nor written in PRO (they're kept for Base).
- **Past dates:** history from `routine-app:history` exactly as in Base, **including
  sessions logged in Base mode** (history is shared).
- Same no-guilt visual language as `03-routine-calendar.md`: a past weekday with no
  session is just empty, never marked as missed.

## Cycle goal (PRO Home, optional block)

The user has a dated goal: **27 Oct → 15 Dec 2026, 30 of 36 sessions** (36 = the
weekdays in that range; it starts on a Tuesday, so the first week has 4 training days).

- Stored in a new store `routine-app:goal`:
  `{ startDate: string; endDate: string; targetSessions: number } | null`, seeded with the
  values above and editable — **not hardcoded** in components, so the next cycle doesn't
  need a code change.
- Shown on PRO's Home as a discreet progress bar: "12 de 30 sesiones" and "Quedan 5
  semanas" (weeks remaining until `endDate`, rounded up).
- **Counts** every logged session dated within `[startDate, endDate]`, in either mode,
  minimum sessions included, at most one per calendar date.
- **Never** shows missed sessions, red, or broken streaks; never a "you're behind" pace
  message. After `endDate` the block shows the final count neutrally and offers to set a
  new goal.

## Persistence, migration, export/import

### New stores

| Store | Content |
|---|---|
| `routine-app:mode` | `{ mode: 'base' \| 'pro' }`, default `'base'` |
| `routine-app:goal` | the cycle goal above, or `null` |

### Migration (existing users)

Today the catalog/routine stores are seeded from their initial state, so an existing
user's persisted `routine-app:exercises` / `routine-app:routines` would hide any new
seed data. Add a zustand `persist` `version` + `migrate` to both stores that:

1. Adds any seeded entry (exercise or routine) whose id isn't already stored. Never
   overwrites or deletes an existing entry.
2. Sets `mode: 'base'` on `base-a/b/c` and applies the Base weight correction above
   (only where the stored value equals the old one).

A user with existing data opens the app in Base, sees no difference except the switch
and the corrected dumbbell numbers, and loses nothing.

### Export/import

- Export bundles every persisted store: the six existing keys plus `routine-app:mode`,
  `routine-app:goal`, and `routine-app:theme` (currently missing from `STORE_KEYS` in
  `src/screens/Settings.tsx`). The session-timer store stays out (it's transient).
- Add a top-level `schemaVersion: 2` to the bundle. Importing a file without
  `schemaVersion` treats it as version 1: its stores are restored as today, and the
  same migration above runs on load (so the PRO routines appear and mode is `base`).
- Import of a file with a `schemaVersion` higher than the app knows: refuse with
  "Este respaldo es de una versión más nueva de la app." instead of half-importing.

## Changes to earlier specs

- **Progression lookup (`00-overview.md`, `04-routine-picker.md`).** Was: last log for the
  `exerciseId`, from any routine. Now: **the last log for that `exerciseId` within the
  same routine; if the exercise has never been done in this routine, the last log for
  it in any routine.** Reason: PRO repeats exercises at deliberately different loads in
  the same week (Puente de glúteo: 31 kg Tuesday, 41 kg Friday; Elevación de talones:
  31 kg at 15–20 reps Tuesday, 41 kg at 20 reps Friday). With the old rule, Tuesday
  would suggest Friday's load. The fallback keeps history continuous across modes: the
  first PRO Tuesday squat continues from the last Base squat. Base itself has no
  exercise repeated across A/B/C, so Base behavior is unchanged.
  `04-routine-picker.md`'s criterion "an exercise shared by two routines shows the same
  suggestion in both" no longer holds by design; "last time" data still shows the most
  recent log from any routine, labeled with the routine it came from.
- **Seeding (`00-overview.md`).** "Seeded on first load if empty" becomes "seeded on first
  load, and new seed entries are merged in by migration" (see above).
- **Design (`docs/DESIGN.md`).** "Dark theme only" no longer holds: add the `claro` and
  `pro` palettes.

## Non-goals

- A third mode, or user-defined modes.
- A routine editor for PRO beyond what already exists (`RoutineEditor.tsx` works on any
  routine, PRO included; no PRO-specific editing).
- Making up missed PRO days automatically, or any "catch-up" suggestion.
- Backend, sync, accounts (unchanged from HANDOFF).

## Decided without asking vs. needs confirmation

Free to decide: component structure, naming, exact palette hex (within the contrast
floor), switch shape, animations.

**Ask before changing:** exercises, sets, reps, loads/plates, the order of days or of
exercises within a day, or the rule that PRO doesn't make up missed days. These numbers
are calculated for the real inventory and profile.

## Acceptance criteria

- [ ] A Base/PRO switch is visible at the top of Home; the mode persists across reloads,
      and Home states the active mode in text.
- [ ] Switching asks for confirmation and is disabled (with visible helper text) while a
      session is in progress.
- [ ] In PRO, opening the app on a Wednesday shows Day 3 (Espalda + Bíceps); on a
      Saturday it shows the rest screen with an "Entrenar igual" option.
- [ ] In PRO, skipping Wednesday shifts nothing: Thursday shows Day 4.
- [ ] In PRO, manually starting Day 3 on Thursday from the picker logs it and still
      leaves Friday's suggestion as Day 5.
- [ ] In Base, the A–B–C rotation behaves exactly as before; logging a PRO session never
      changes `routine-app:rotation`.
- [ ] Switching mode changes background, surfaces and accent in an immediately
      perceptible way — including vs. the `atardecer` theme.
- [ ] `claro` and `pro` both pass 4.5:1 for all text, accent-as-text and status colors on
      every surface level (verified, e.g. with a unit test over the token values).
- [ ] The color transition is skipped under `prefers-reduced-motion`.
- [ ] **A squat logged in Base appears in history when training it in PRO, and the first
      PRO suggestion continues from it.**
- [ ] After training both PRO days, Tuesday's glute bridge suggestion follows Tuesday's
      last log and Friday's follows Friday's.
- [ ] Base history for "Hollow hold o bicicleta abdominal" shows up under PRO's "Hollow
      hold"; "Bicicleta abdominal" starts empty.
- [ ] No load shown is impossible to build from 4×1.25 + 6×2.5 + 4×5 kg.
- [ ] PRO first-session loads are recomputed when the bar weight changes in Settings
      (barbell 6 → 7 kg: squat 26 → 27 kg).
- [ ] Base dumbbell initial weights read 11.5 / 6.5 / 4 kg (not 12 / 7 / 4.5) for new and
      migrated users; a value the user edited isn't overwritten.
- [ ] The minimum-session button is present and works identically in PRO.
- [ ] The PRO calendar auto-fills future weekdays, is read-only, and shows past sessions
      from both modes; no missed day is styled as a failure.
- [ ] The goal block counts sessions in range from both modes (max one per date) and
      never shows misses or red.
- [ ] Export includes both modes, the shared history, the goal and `schemaVersion: 2`;
      import restores it fully; importing an old (versionless) backup lands in Base
      with PRO routines available.
- [ ] An existing user upgrading lands in `base` with no data lost or rewritten (other
      than the documented Base weight correction).
