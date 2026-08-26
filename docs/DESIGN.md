# Design system

Visual language for RutinaApp's screens, drafted as static mockups (12 screens, phone
frames) before any screen was built. Reference:
[the published mockups](https://claude.ai/code/artifact/3e1d3934-0a50-4609-8593-09b30714cb06).

**Brief that produced this:** sober, easy to use, flat colors. Dark theme, one muted
blue accent used sparingly, flat blocks with no shadows, IBM Plex type. No design system
existed in the codebase before this — these are the tokens to carry into
`src/index.css`'s `@theme` block (Tailwind v4, per `CLAUDE.md`) when screens get built,
not a retrofit of something already implemented.

## Color

Dark theme only for now (no light variant was designed).

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#14171c` | Page background |
| `--bg-elevated` | `#1b1f26` | Cards, blocks, one layer above `--bg` |
| `--bg-elevated-2` | `#232833` | Nested surfaces: chips, input pills, active tab-bar bg |
| `--border` | `#2b313d` | Hairline only — inputs, secondary-button outline, tab bar divider. **Not** used on cards; cards separate from the page by background contrast alone, no border, no shadow (the "flat blocks" brief). |
| `--text` | `#eef1f5` | Primary text |
| `--text-secondary` | `#a7b0bd` | Secondary text, meta rows |
| `--text-tertiary` | `#707888` | Section labels, placeholders, disabled/muted |
| `--accent` | `#6C93D8` | The one accent color. Primary buttons, active tab, progress fill, active/selected states. Used sparingly — never as a background wash. |
| `--accent-ink` | `#10182B` | Text/icon color on top of a solid `--accent` fill (dark-on-light-blue, not white) |
| `--danger` | `#C57272` | Muted red-brown, for destructive actions only (e.g. "reset rotation"). Never used for missed-day/streak messaging — the app doesn't shame the user for that (HANDOFF §3.1). |

Subtle accent-tinted fills (e.g. a badge background) are computed, not a separate token:
`color-mix(in oklch, var(--accent) 20%, var(--bg-elevated))`. That keeps every accent-tinted
surface in sync if the accent ever changes.

### Routine tag colors

A small fixed categorical palette, one hue per routine, same muted family as the accent
(mid lightness, low-medium chroma) so they read as siblings, not clashing brand colors.
Used only as small dots/badges next to a routine's name (Home, Calendar, routine picker),
never as a background wash.

| Token | Hex | Routine |
|---|---|---|
| `--routine-a` | `#C98A5E` | A — Empuje (muted terracotta) |
| `--routine-b` | `#7FA97F` | B — Pierna + Core (sage green) |
| `--routine-c` | `#9B8AC4` | C — Tirón (soft violet) |

A 4th custom routine in the mockups reuses `--accent` (`#6C93D8`) as its tag color —
fine as a default when a user creates a routine beyond A/B/C, since the palette isn't
meant to be exhaustive.

## Typography

Google Fonts, loaded via `<link>` (or `@import` in `src/index.css`):

- **IBM Plex Sans** — all UI text. Weights used: 400 (body), 500 (labels/buttons), 600
  (headings/emphasis), 700 (rare, big totals).
- **IBM Plex Mono** — anything numeric that matters: suggested weight, plate labels, the
  rest timer countdown, reps/weight already logged, history chart values, session
  duration. This is deliberate, not decorative — it's what gives weights and the timer
  their "read at a glance, sweaty hands, one tap" legibility, and it's the one clear
  differentiator in an otherwise flat, quiet UI.

Chosen over Inter/Roboto/system-ui specifically to avoid the generic-AI-tool look while
staying sober (not a display/personality font).

### Scale (as used across the 12 mockups)

| Role | Size / weight | Notes |
|---|---|---|
| Big numeric display | 36–48px / 600, mono | Suggested weight, rest timer |
| Screen title | 18–22px / 600, sans | Top of each screen |
| Section label | 11px / 600, sans, uppercase, `letter-spacing: 0.08em`, `--text-tertiary` | Groups content ("HOY TOCA", "SERIES", "EQUIPO") |
| Body | 14–15px / 400–500, sans | Exercise names, list rows, form values |
| Secondary/meta | 12–13px / 400, sans, `--text-secondary` or `--text-tertiary` | Timestamps, muscle groups, helper text |

## Layout and components

- **Mobile-first, one column.** Mockups are 390×844 phone frames. No fake iOS status bar
  or keyboard was drawn — that's the OS's job, not the app's (see HANDOFF's phone-first
  constraint: one-handed, no zoom).
- **Cards/blocks:** `background: var(--bg-elevated)`, `border-radius: 16–20px`, padding
  18–24px. No border, no shadow.
- **Buttons:**
  - Primary: full width, 52–56px tall, `border-radius: 12–14px`, `background: var(--accent)`,
    text `var(--accent-ink)`, weight 600. One per screen, the obvious next action
    (HANDOFF's "one tap to confirm" principle).
  - Secondary/ghost: same shape, transparent background, `border: 1px solid var(--border)`,
    text `var(--text)`.
  - Inline/small (Aceptar / Todavía no on the progression prompt): ~38px tall, same
    radius logic scaled down.
- **Inputs, steppers, pills:** `background: var(--bg-elevated-2)`, `border: 1px solid var(--border)`,
  `border-radius: 10–12px`. This is the one place hairline borders are load-bearing
  (distinguishing an editable value from a card).
- **Chips/tags:** `border-radius: 999px` (full pill), `background: var(--bg-elevated-2)`,
  text `var(--text-secondary)`, 12–12.5px. Selected/active state swaps to
  `background: var(--accent)`, text `var(--accent-ink)`.
- **Bottom tab bar** (Home, History, Calendar, Settings only — not on focused/flow
  screens like Session mode or the add-exercise form): 66px tall,
  `border-top: 1px solid var(--border)`, `background: var(--bg-elevated)`. Active tab:
  `var(--accent)` + weight 600 label. Inactive: `var(--text-tertiary)`.
- **Checklists** (warmup/cooldown): a filled accent circle + check icon for done items,
  an outlined circle for pending, the current item's row gets a subtle
  `var(--bg-elevated)` background to stand out without shadow or border.
- **Plate diagrams** (session mode, standalone calculator): the bar as a thin neutral
  rectangle, plates as small flat colored rectangles sized by relative weight, tinted
  with the relevant routine color where contextually tied to a routine, otherwise
  `--accent`. No 3D/gradient plate rendering.
- **Icons:** inline SVG only, stroke-based, 20–24px grid, `stroke-width: 1.75`, round
  caps/joins. Never emoji, never a filled/glyph icon font.

## What's intentionally not decided here

- No light theme was designed (dark was the explicit choice). If one gets requested
  later, redo the neutral ramp — don't just invert these hex values.
- Interaction/motion (tap states, the rest-timer's animated ring, transitions between
  session steps) wasn't specced — the mockups are static.
- These are visual tokens, not implementation. Translating them into Tailwind v4's
  `@theme` block in `src/index.css` (per `CLAUDE.md`'s stack section) is next-steps work,
  not done yet.
