import type { EquipmentType, Equipment } from '../types/program'

export interface PlateInventoryItem {
  kg: number
  quantity: number
}

/** Per-side (or per-end) plate counts, e.g. [{kg: 5, count: 1}, {kg: 2.5, count: 1}]. */
export interface PlateBreakdown {
  totalKg: number
  perSide: { kg: number; count: number }[]
}

interface SideCombo {
  weightPerSide: number
  totalCount: number
  perSide: { kg: number; count: number }[]
}

function perSideInventory(inventory: PlateInventoryItem[], divisor: number): PlateInventoryItem[] {
  return inventory
    .filter((p) => p.kg > 0)
    .map((p) => ({ kg: p.kg, quantity: Math.floor(p.quantity / divisor) }))
}

/** All achievable per-side plate combinations, one entry per distinct combination (not deduped by weight). */
function enumerateSideCombos(perSide: PlateInventoryItem[]): SideCombo[] {
  let combos: SideCombo[] = [{ weightPerSide: 0, totalCount: 0, perSide: [] }]
  for (const plate of perSide) {
    if (plate.quantity <= 0) continue
    const next: SideCombo[] = []
    for (const combo of combos) {
      for (let count = 0; count <= plate.quantity; count++) {
        next.push({
          weightPerSide: combo.weightPerSide + count * plate.kg,
          totalCount: combo.totalCount + count,
          perSide: count > 0 ? [...combo.perSide, { kg: plate.kg, count }] : combo.perSide,
        })
      }
    }
    combos = next
  }
  return combos
}

/**
 * Symmetric load buildable on a bar/handle whose plates split evenly across `sides`
 * loading points (2 for a barbell or a single dumbbell's two ends, 4 for a dumbbell
 * pair's four ends — see docs/HANDOFF.md §4).
 */
function symmetricCombos(inventory: PlateInventoryItem[], sides: number): SideCombo[] {
  return enumerateSideCombos(perSideInventory(inventory, sides))
}

export function buildableWeights(baseWeightKg: number, inventory: PlateInventoryItem[], sides: number): number[] {
  const totals = new Set<number>()
  for (const combo of symmetricCombos(inventory, sides)) {
    totals.add(round2(baseWeightKg + 2 * combo.weightPerSide))
  }
  return [...totals].sort((a, b) => a - b)
}

export function plateBreakdown(
  targetKg: number,
  baseWeightKg: number,
  inventory: PlateInventoryItem[],
  sides: number,
): PlateBreakdown | null {
  let best: SideCombo | null = null
  for (const combo of symmetricCombos(inventory, sides)) {
    const total = round2(baseWeightKg + 2 * combo.weightPerSide)
    if (total === round2(targetKg)) {
      if (!best || combo.totalCount < best.totalCount) best = combo
    }
  }
  if (!best) return null
  return { totalKg: round2(targetKg), perSide: best.perSide }
}

export function nearestBuildable(targetKg: number, weights: number[]): { below: number | null; above: number | null } {
  let below: number | null = null
  let above: number | null = null
  for (const w of weights) {
    if (w <= targetKg) below = w
    if (w >= targetKg && above === null) above = w
  }
  return { below, above }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// --- Equipment-type dispatchers -------------------------------------------------

/** Loading points for each equipment type, per docs/HANDOFF.md §4. `bodyweight` has none. */
function sidesFor(equipmentType: EquipmentType): number | null {
  switch (equipmentType) {
    case 'barbell':
      return 2
    case 'single_dumbbell':
      return 2
    case 'dumbbell_pair':
      return 4
    case 'bodyweight':
      return null
  }
}

function baseWeightFor(equipmentType: EquipmentType, equipment: Equipment): number {
  switch (equipmentType) {
    case 'barbell':
      return equipment.barbell.weightKg
    case 'single_dumbbell':
    case 'dumbbell_pair':
      return equipment.dumbbellHandle.weightKg
    case 'bodyweight':
      return 0
  }
}

export function getBuildableWeights(equipmentType: EquipmentType, equipment: Equipment): number[] {
  const sides = sidesFor(equipmentType)
  if (sides === null) return []
  return buildableWeights(baseWeightFor(equipmentType, equipment), equipment.plates, sides)
}

export function getPlateBreakdown(
  equipmentType: EquipmentType,
  targetKg: number,
  equipment: Equipment,
): PlateBreakdown | null {
  const sides = sidesFor(equipmentType)
  if (sides === null) return null
  return plateBreakdown(targetKg, baseWeightFor(equipmentType, equipment), equipment.plates, sides)
}

/** True when `targetKg` can be loaded exactly with the current inventory. */
export function isBuildable(equipmentType: EquipmentType, targetKg: number, equipment: Equipment): boolean {
  return getPlateBreakdown(equipmentType, targetKg, equipment) !== null
}

/** Snaps a raw target weight onto the nearest weight the given plate inventory can build. */
export function clampToBuildable(weight: number | undefined, buildable: number[]): number | undefined {
  if (weight === undefined || buildable.length === 0) return undefined
  if (buildable.includes(weight)) return weight
  const { below, above } = nearestBuildable(weight, buildable)
  return below ?? above ?? undefined
}

export function describePlateBreakdown(breakdown: PlateBreakdown): string {
  if (breakdown.perSide.length === 0) return 'sin discos'
  return breakdown.perSide.map((p) => `${p.count}×${p.kg}kg`).join(' + ') + ' por lado'
}
