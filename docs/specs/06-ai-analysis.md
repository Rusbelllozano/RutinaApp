# Spec 06 — AI analysis round trip

## Goal

Let the user get a full coach-style analysis of their training from any chat LLM
(ChatGPT, Claude, Gemini…) and bring the suggested calibration back into the app —
without the app calling an LLM (no backend, no API keys, no cost, works offline).

## Flow

1. **Export** (`Análisis con IA` screen, reached from Settings and History): pick a range
   (4 semanas / 8 semanas / Todo, default Todo) → Copiar / Descargar (.md) / Compartir.
2. The user pastes the prompt into an LLM chat.
3. The LLM answers with prose, ending in one ```json block (format below).
4. **Import**: the user pastes the whole answer → "Revisar cambios", or taps "Subir
   archivo" and picks the answer saved as .md / .txt / .json, which is reviewed right away.
5. **Review**: each change shows before → after, the reason, and Aceptar / Descartar.
   Changes that don't fit the current program or equipment are shown as "No aplicable"
   with the reason and can't be applied. "Aceptar todos" applies every pending one.
6. **Undo**: "Deshacer cambios aplicados" reverts every applied change of one analysis.

Nothing changes in the program without an explicit Aceptar — this is the HANDOFF §9
confirmation for program changes.

## Data logged for the analysis

All fields optional, so older logs stay valid:

- `LoggedSet.completedAt` (epoch ms) and `LoggedSet.restTakenSec` (rest timer start →
  its end or skip, pauses included).
- `SessionLogExercise.effort`: `easy | right | limit` ("Fácil / Justo / Al límite"),
  one tap on the rest card after an exercise's last set, or on Summary (which also covers
  the last exercise). Never required.
- `SessionLog.startedAt` and `SessionLog.note` (optional note on Summary).

## Prompt (`src/lib/aiExport.ts`)

Spanish Markdown, in order: role + what to analyze + program rules; equipment and the
list of buildable weights per equipment type; current program (routine ids, exercise
ids, prescription, the weight the app will suggest next); exercise catalog; computed
summary (frequency, minimal sessions, average duration, first→last best set and effort
per exercise); every session in range as a per-set table (kg, reps/time, real vs.
prescribed rest, effort, note); the response format.

## Response format (`schemaVersion: 1`, parsed by `src/lib/aiImport.ts`)

```json
{
  "schemaVersion": 1,
  "summary": "…",
  "changes": [
    { "type": "setWeight", "routineId": "…", "exerciseId": "…", "weightKg": 26, "reason": "…" },
    { "type": "updatePrescription", "routineId": "…", "exerciseId": "…", "sets": 4, "minReps": 8, "maxReps": 12, "restSec": 90, "reason": "…" },
    { "type": "swapExercise", "routineId": "…", "fromExerciseId": "…", "toExerciseId": "…", "weightKg": 11, "reason": "…" },
    { "type": "addExercise", "routineId": "…", "exerciseId": "…", "sets": 3, "minReps": 10, "maxReps": 15, "restSec": 60, "reason": "…" },
    { "type": "removeExercise", "routineId": "…", "exerciseId": "…", "reason": "…" }
  ]
}
```

The parser takes the last ```json fence (or the last balanced `{…}`); the rest is the
analysis text. Validation: ids exist; weights are buildable with the current inventory
and absent for bodyweight exercises; sets 1-10, reps 1-50, min ≤ max, rest 0-600 s; no
rep range on timed exercises; no duplicate exercise in a routine; a routine never ends
up empty.

## How changes apply

- `setWeight` sets `RoutineExercise.nextWeightKg`: the next session preloads it (no +2.5 kg
  offer that time; reps restart at the bottom of the range if it's heavier than last
  time) and it's cleared once that session is logged — double progression continues from
  what was actually lifted.
- `updatePrescription` patches the slot; `swapExercise` replaces it in the same position
  keeping sets/reps/rest; `addExercise` appends; `removeExercise` removes.
- Undo restores the slot as it was before the change (later manual edits to that same
  slot are lost on undo).

Analyses persist in `routine-app:analysis` and are part of the JSON backup
(`schemaVersion` 3).

## Acceptance criteria

- [ ] With no sessions in range, export is disabled; with sessions, the prompt includes
      every section above and only buildable weights.
- [ ] An answer with prose + JSON imports; one without JSON, with broken JSON or a newer
      `schemaVersion` shows a neutral message and changes nothing.
- [ ] Uploading the answer as a .md, .txt or .json file works like pasting it.
- [ ] Invalid changes are listed as "No aplicable" with a reason and can't be accepted.
- [ ] Accepting a `setWeight` preloads that weight in the next session of that routine,
      once.
- [ ] "Deshacer cambios aplicados" restores the affected routines exactly.
- [ ] Effort and note are optional and never block finishing a set or a session.
- [ ] Backup export/import includes the analyses.
