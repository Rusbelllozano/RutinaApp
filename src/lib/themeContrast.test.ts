/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// docs/specs/05-pro-mode.md: text in the `claro` and `pro` themes must reach 4.5:1 on
// every surface. Reads the real tokens from src/index.css so a palette edit can't drift.
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
function tokens(theme: string): Record<string, string> {
  const block = css.match(new RegExp(`\\[data-theme='${theme}'\\] \\{([^}]*)\\}`))?.[1]
  if (!block) throw new Error(`No [data-theme='${theme}'] block in index.css`)
  return Object.fromEntries([...block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))
}

const defaults = Object.fromEntries(
  [...(css.match(/@theme \{([^}]*)\}/)?.[1] ?? '').matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
)

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const SURFACES = ['bg', 'bg-elevated', 'bg-elevated-2']
const FOREGROUNDS = ['text', 'text-secondary', 'text-tertiary', 'accent', 'danger']
/** Routine colors are used as calendar text and as cell fills under `text-bg`, so they're checked against `bg`. */
const ROUTINE_COLORS = ['routine-pro-1', 'routine-pro-2', 'routine-pro-3', 'routine-pro-4', 'routine-pro-5']

describe.each(['claro', 'pro'])('%s theme contrast', (theme) => {
  const t = tokens(theme)

  it.each(FOREGROUNDS.flatMap((fg) => SURFACES.map((bg) => [fg, bg])))('%s on %s ≥ 4.5:1', (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(ROUTINE_COLORS)('%s vs bg ≥ 4.5:1', (color) => {
    // `pro` inherits the default (dark) routine colors from the @theme block.
    const value = t[color] ?? defaults[color]
    expect(contrast(value, t.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('accent-ink on accent ≥ 4.5:1', () => {
    expect(contrast(t['accent-ink'], t.accent)).toBeGreaterThanOrEqual(4.5)
  })
})
