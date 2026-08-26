# HANDOFF — Home training routine app (living document)

> **For Claude Code.** This document contains all the context, data, and requirements.
> No other sources are needed.
>
> **Language note:** this document, the code, file names, and all technical docs are in
> English. The values that populate the program (exercise names, cues, alternatives,
> checklist items) and everything the app renders are kept in **Spanish** — that's the
> UI language, because the end user trains in Spanish. See `CLAUDE.md`'s "Language
> split" section.

---

## 1. User context

- **Goal:** build muscle + lose fat (body recomposition).
- **Level:** beginner, less than 1 year of training.
- **Frequency:** Monday to Saturday, Sunday rest. Needs to tolerate missing 1 day without
  breaking the plan.
- **Session length:** 35–55 min, warmup and cooldown included.
- **Location:** home. No bench, no pull-up bar. Just a mat and free weights.
- **Interface language: Spanish**, for all UI text.
- **Primary device: phone**, hands often busy or sweaty. Big buttons, little scrolling,
  zero long forms.

### Exact equipment (this is a hard design constraint)

| Item | Quantity | Unit weight |
|---|---|---|
| Assemblable barbell, 1.69 m | 1 | ~6 kg (configurable) |
| Dumbbell handle, 35 cm | 2 | ~1.5 kg each |
| Threaded collars | 6 | ~0.2 kg each |
| 1.25 kg plate | 4 | 1.25 kg |
| 2.5 kg plate | 6 | 2.5 kg |
| 5 kg plate | 4 | 5 kg |

**Total plates: 40 kg.** Bar weights are estimates and must be editable in settings.

---

## 2. What to build

A **single-page, offline-first web app**, opened on the phone during the workout. It's a
"living file": it logs every set, remembers history, and decides what's due today.

It is not a static document or a PDF. It's a session tool.

### Suggested stack (open to judgment)

- React + Vite + Tailwind, or vanilla HTML/JS in a single file. Priority: it must start
  with no server and no complicated build.
- **Persistence: `localStorage`** (or IndexedDB if volume justifies it). No backend, no
  accounts, no network.
- Must work 100% offline except for video links, which open YouTube externally.
- Include **JSON export/import** so the user doesn't lose history when switching devices
  or clearing the browser. This is not optional.

---

## 3. Business rules

### 3.1 A–B–C rotation (the heart of the app)

Days are **not** tied to the week. There's a cyclic queue `A → B → C → A → B → C → …`.

- On open, show **the next day in the rotation**, whatever the date is.
- If the user misses a day, nothing happens: the next day, they get whatever was due.
  Nothing is "lost" and there's no session to make up.
- Sunday: the app suggests rest, but **doesn't block** training if the user wants to.
- Never show guilt messages for missed days. No broken streaks in red, no "you missed 2
  days." At most, a neutral nudge: "3 days since your last session. The minimum session
  is 20 minutes." (rendered in Spanish in the actual UI.)

### 3.2 Double progression

The program's only progression rule.

1. Every exercise has a rep range (e.g. 8–12).
2. The user tries to add 1 rep per set each week.
3. Once they complete **the top of the range on every set** (e.g. 4×12), the app
   suggests going up **+2.5 kg** and returning to the bottom of the range.
4. The suggestion is a **proposal, not an order**: "Accept" / "Not yet" buttons.

The app must detect this automatically by comparing against the last logged session for
that exercise.

### 3.3 Minimum jump

- Barbell: 2.5 kg (1.25 kg per side).
- Dumbbell: 2.5 kg (1.25 kg per end).
- **Never suggest asymmetric loads.** If a weight can't be built with the inventory, it
  doesn't exist.

### 3.4 Deload

Every 6–8 weeks of accumulated training, the app warns: "Deload week: use 60% of your
usual weight." Applies 60%, rounded to the nearest buildable load, for 6 sessions, then
reverts automatically.

### 3.5 Minimum session

Visible **"Minimum version (20 min)"** button: trims the session to the first 3
exercises, 2 sets each. Counts as a completed session for the rotation and history. This
is the app's most important anti-dropout mechanism: it must be easy to find, never
hidden.

---

## 4. Plate calculator (core feature)

Given a target weight, the app says **exactly which plates to load**. Given the
inventory, it says **which weights are achievable**.

### Rules

- **Barbell:** plates are split symmetrically across 2 sides. A weight is buildable if
  there's an inventory combination such that `left_side == right_side`.
  - Real range: **6 kg (bar alone) to 46 kg**, in 2.5 kg jumps.
- **Single dumbbell** (goblet, pullover, one-arm row): 2 symmetric ends.
- **Dumbbell pair:** each plate type used must cover **4 ends**. Watch this limit: there
  are 6 plates of 2.5 kg, so only 4 are usable in a pair (1 per end); 2 are left over.
  - Max per dumbbell in a pair: 1.25 + 2.5 + 5 per end = **19 kg each** (uses every
    plate).

### Inventory conflict (important)

The 40 kg of plates are shared across all 3 bars. The app must **detect and warn** when
an exercise's configuration isn't buildable because the plates are already on another bar
within the same session.

It must also **order the session's exercises to minimize plate changes**. This is a real
usability requirement, not decoration — changing plates mid-session is the biggest source
of friction.

---

## 5. Features

### Must-have (v1)

1. **Home screen:** which day is due (A/B/C), estimated duration, big "Start" button +
   "Minimum version" button.
2. **Warmup:** 7-item checklist, skippable.
3. **Session mode:** one exercise at a time, not a long table. For each exercise, show:
   - Name, sets × rep range, suggested load and **which plates to load**.
   - What they did last time ("Last time: 3×10 at 12 kg").
   - Fields to log weight and reps per set, preloaded with the suggestion — confirming
     must be **one tap**.
   - ▶ link to a demo video.
4. **Rest timer:** starts automatically on logging a set, with the prescribed time
   (45/60/75/90 s). Sound or vibration when it ends. Must be skippable.
5. **Final cooldown:** 7-item checklist.
6. **History:** per exercise, weight and reps over time. A simple load chart per exercise
   already adds a lot of value.
7. **Settings:** bar weights, plate inventory, sound on/off, reset rotation.
8. **JSON export/import.**

### Nice-to-have (v2, non-blocking)

- Mark an exercise as "bothers a joint" and offer the alternative already defined in the
  notes.
- Free-form notes per session.
- Weekly volume view per muscle group.
- Automatic deload warning.

### Out of scope

- User accounts, sync, backend.
- Calorie counting or meal logging. The app is training-only.
- **No body weight, measurements, or progress photos in v1.** The user's goal is
  recomposition, and the scale moves misleadingly in that scenario; a visible daily
  number demotivates more than it informs.

---

## 6. Program data

Suggested structure. Field names match `src/types/program.ts` and
`src/data/program.ts` in the codebase. **Values stay in Spanish** (exercise names, cues,
alternatives) — they're UI content for the Spanish-speaking end user. Initial loads are
already calculated for the real inventory and ordered to minimize plate changes.

```json
{
  "equipment": {
    "barbell": { "weightKg": 6, "lengthCm": 169 },
    "dumbbellHandle": { "weightKg": 1.5, "quantity": 2, "lengthCm": 35 },
    "collars": { "quantity": 6, "weightKg": 0.2 },
    "plates": [
      { "kg": 1.25, "quantity": 4 },
      { "kg": 2.5, "quantity": 6 },
      { "kg": 5, "quantity": 4 }
    ]
  },

  "warmup": [
    { "name": "Marcha en el sitio o jumping jacks", "duration": "2 min" },
    { "name": "Círculos de brazos adelante/atrás", "reps": "20 c/u" },
    { "name": "Gato-camello", "reps": "10" },
    { "name": "Puente de glúteo sin peso", "reps": "15" },
    { "name": "Sentadilla sin peso lenta", "reps": "10" },
    { "name": "Rotaciones de cadera y tobillo", "reps": "10 c/lado" },
    { "name": "1 serie ligera del primer ejercicio (50% del peso, 10 reps)" }
  ],

  "cooldown": [
    "Pectoral en marco de puerta (30 s)",
    "Tríceps sobre la cabeza (30 s)",
    "Isquiotibiales sentado, una pierna a la vez (30 s)",
    "Cuádriceps de pie (30 s)",
    "Flexor de cadera en zancada (30 s)",
    "Postura del niño (30 s)",
    "Cuello lateral (10 s por lado)"
  ],

  "days": [
    {
      "id": "A",
      "name": "Empuje",
      "muscleGroups": ["pecho", "hombros", "tríceps"],
      "exercises": [
        {
          "order": 1, "name": "Press de pecho en piso con mancuernas",
          "sets": 4, "minReps": 8, "maxReps": 12, "restSec": 90,
          "equipment": "dumbbell_pair", "initialWeightKg": 12,
          "plateNote": "5 kg en cada extremo",
          "alternative": "Si no llegas a 8 reps limpias, baja a 9.5 kg (2.5 + 1.25 por extremo)",
          "video": "https://www.youtube.com/results?search_query=press+en+piso+con+mancuernas+tecnica",
          "note": "Baja hasta que el codo toque el suelo, pausa 1 s, sube."
        },
        {
          "order": 2, "name": "Press militar de pie con barra",
          "sets": 3, "minReps": 8, "maxReps": 12, "restSec": 90,
          "equipment": "barbell", "initialWeightKg": 11, "plateNote": "2.5 kg por lado",
          "video": "https://www.youtube.com/results?search_query=press+militar+de+pie+con+barra+tecnica"
        },
        {
          "order": 3, "name": "Aperturas en piso con mancuernas",
          "sets": 3, "minReps": 12, "maxReps": 15, "restSec": 60,
          "equipment": "dumbbell_pair", "initialWeightKg": 7, "plateNote": "2.5 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=aperturas+en+piso+con+mancuernas"
        },
        {
          "order": 4, "name": "Elevaciones laterales",
          "sets": 3, "minReps": 12, "maxReps": 15, "restSec": 60,
          "equipment": "dumbbell_pair", "initialWeightKg": 4.5, "plateNote": "1.25 kg en cada extremo",
          "alternative": "Si los hombros se van hacia arriba, usa las barras solas (~2 kg)",
          "video": "https://www.youtube.com/results?search_query=elevaciones+laterales+con+mancuernas+tecnica"
        },
        {
          "order": 5, "name": "Extensión de tríceps sobre la cabeza",
          "sets": 3, "minReps": 10, "maxReps": 12, "restSec": 60,
          "equipment": "barbell", "initialWeightKg": 11, "plateNote": "la misma barra, sin tocar",
          "alternative": "Si molesta el codo, una sola mancuerna de 9.5 kg con las dos manos",
          "video": "https://www.youtube.com/results?search_query=extension+de+triceps+sobre+la+cabeza"
        },
        {
          "order": 6, "name": "Flexiones (rodillas si hace falta)",
          "sets": 2, "reps": "máximas", "restSec": 60, "equipment": "bodyweight",
          "video": "https://www.youtube.com/results?search_query=flexiones+de+pecho+tecnica+correcta"
        },
        {
          "order": 7, "name": "Plancha frontal",
          "sets": 3, "durationSec": [30, 45], "restSec": 45, "equipment": "bodyweight",
          "video": "https://www.youtube.com/results?search_query=plancha+abdominal+tecnica+correcta"
        }
      ]
    },

    {
      "id": "B",
      "name": "Pierna + Core",
      "muscleGroups": ["cuádriceps", "femorales", "glúteos", "pantorrillas", "core"],
      "exercises": [
        {
          "order": 1, "name": "Sentadilla con barra en la espalda",
          "sets": 4, "minReps": 10, "maxReps": 12, "restSec": 90,
          "equipment": "barbell", "initialWeightKg": 21, "plateNote": "5 + 2.5 por lado",
          "alternative": "Primeras 2 semanas: 16 kg (un disco de 5 por lado). O goblet con mancuerna.",
          "video": "https://www.youtube.com/results?search_query=sentadilla+con+barra+tecnica+correcta"
        },
        {
          "order": 2, "name": "Peso muerto rumano con barra",
          "sets": 4, "minReps": 10, "maxReps": 12, "restSec": 90,
          "equipment": "barbell", "initialWeightKg": 21, "plateNote": "la misma barra, sin tocar",
          "video": "https://www.youtube.com/results?search_query=peso+muerto+rumano+con+barra+tecnica",
          "note": "Espalda recta, rodillas casi rectas. El estiramiento se siente en el femoral, no en la lumbar."
        },
        {
          "order": 3, "name": "Zancadas estáticas con mancuernas",
          "sets": 3, "reps": "10 por pierna", "restSec": 75,
          "equipment": "dumbbell_pair", "initialWeightKg": 7, "plateNote": "2.5 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=zancadas+con+mancuernas+tecnica"
        },
        {
          "order": 4, "name": "Puente de glúteo con barra sobre la cadera",
          "sets": 3, "minReps": 15, "maxReps": 15, "restSec": 60,
          "equipment": "barbell", "initialWeightKg": 31,
          "plateNote": "añade los 2 discos de 5 kg sobrantes: 5 + 5 + 2.5 por lado",
          "video": "https://www.youtube.com/results?search_query=puente+de+gluteo+con+barra"
        },
        {
          "order": 5, "name": "Elevación de talones con barra",
          "sets": 3, "minReps": 15, "maxReps": 20, "restSec": 45,
          "equipment": "barbell", "initialWeightKg": 31, "plateNote": "la misma barra, sin tocar",
          "video": "https://www.youtube.com/results?search_query=elevacion+de+talones+con+barra+pantorrilla"
        },
        {
          "order": 6, "name": "Dead bug", "sets": 3, "reps": "10 por lado",
          "restSec": 45, "equipment": "bodyweight",
          "video": "https://www.youtube.com/results?search_query=dead+bug+ejercicio+abdominal"
        },
        {
          "order": 7, "name": "Plancha lateral", "sets": 3, "durationSec": 25,
          "restSec": 45, "equipment": "bodyweight",
          "video": "https://www.youtube.com/results?search_query=plancha+lateral+tecnica"
        }
      ]
    },

    {
      "id": "C",
      "name": "Tirón",
      "muscleGroups": ["espalda", "bíceps", "deltoides posterior"],
      "exercises": [
        {
          "order": 1, "name": "Remo con barra inclinado (torso a 45°)",
          "sets": 4, "minReps": 8, "maxReps": 12, "restSec": 90,
          "equipment": "barbell", "initialWeightKg": 21, "plateNote": "5 + 2.5 por lado",
          "video": "https://www.youtube.com/results?search_query=remo+con+barra+inclinado+tecnica"
        },
        {
          "order": 2, "name": "Remo a una mano con mancuerna",
          "sets": 3, "reps": "10-12 por lado", "restSec": 75,
          "equipment": "single_dumbbell", "initialWeightKg": 11.5,
          "plateNote": "5 kg en cada extremo (los 2 que quedan libres)",
          "video": "https://www.youtube.com/results?search_query=remo+a+una+mano+con+mancuerna"
        },
        {
          "order": 3, "name": "Pull-over en piso con una mancuerna",
          "sets": 3, "minReps": 12, "maxReps": 15, "restSec": 60,
          "equipment": "single_dumbbell", "initialWeightKg": 6.5, "plateNote": "2.5 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=pullover+con+mancuerna+en+el+piso"
        },
        {
          "order": 4, "name": "Pájaros / aperturas invertidas inclinado",
          "sets": 3, "minReps": 12, "maxReps": 15, "restSec": 60,
          "equipment": "dumbbell_pair", "initialWeightKg": 4.5, "plateNote": "1.25 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=pajaros+con+mancuernas+deltoides+posterior"
        },
        {
          "order": 5, "name": "Curl de bíceps con barra",
          "sets": 3, "minReps": 10, "maxReps": 12, "restSec": 60,
          "equipment": "barbell", "initialWeightKg": 11, "plateNote": "quita hasta dejar 2.5 por lado",
          "video": "https://www.youtube.com/results?search_query=curl+de+biceps+con+barra+tecnica"
        },
        {
          "order": 6, "name": "Curl martillo con mancuernas",
          "sets": 3, "minReps": 12, "maxReps": 12, "restSec": 60,
          "equipment": "dumbbell_pair", "initialWeightKg": 7, "plateNote": "2.5 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=curl+martillo+con+mancuernas"
        },
        {
          "order": 7, "name": "Hollow hold o bicicleta abdominal",
          "sets": 3, "durationSec": 30, "restSec": 45, "equipment": "bodyweight",
          "video": "https://www.youtube.com/results?search_query=hollow+hold+ejercicio+abdominal"
        }
      ]
    }
  ]
}
```

---

## 7. Load ceiling and what to do when it's reached

Legs will hit it first: **46 kg is the barbell's absolute max** and within a few months
it'll fall short for squats. The app must not suggest buying more plates. Once an
exercise has spent 3 weeks at its max buildable weight, it should offer these alternate
progressions, in this order:

1. **Tempo:** 3 s down, 1 s pause at the bottom, 1 s up.
2. **Pause:** 2 s at the hardest point.
3. **Unilateral:** Bulgarian split squat, single-leg deadlift.
4. **Less rest:** drop to 45 s.
5. **More reps:** raise the range to 15–20.

Ideally the log stores the tempo/variant used, so history stays comparable.

---

## 8. Acceptance criteria

- [ ] Open the app and within 3 seconds know which day is due and which plates to load
      for the first exercise.
- [ ] Logging a set is **one tap** when the suggested weight and reps are correct.
- [ ] If Wednesday is skipped, Thursday shows exactly what was due Wednesday.
- [ ] The app never suggests a load that can't be built with
      4×1.25 + 6×2.5 + 4×5 kg.
- [ ] After completing 4×12 on an exercise, next time it proposes +2.5 kg and it can be
      rejected.
- [ ] Close the browser, come back tomorrow, and all history is still there.
- [ ] History can be exported to a file and re-imported.
- [ ] Everything is usable one-handed, on a phone screen, without zooming.
- [ ] No UI text blames the user for missing a day.

---

## 9. Decisions Claude Code can make

Without needing to ask: framework, file structure, visual design, internal names, the
exact shape of the charts, and whether persistence is `localStorage` or IndexedDB.

**Worth asking before implementing:** anything that changes the training program itself
(exercises, sets, reps, initial loads, rotation). Those numbers are calculated for the
real equipment inventory and must not be improvised.
