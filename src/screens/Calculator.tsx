import { useMemo, useState } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import { getBuildableWeights, getPlateBreakdown, nearestBuildable, describePlateBreakdown } from '../lib/plates'
import type { EquipmentType } from '../types/program'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionLabel } from '../components/ui/SectionLabel'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { PlateDiagram } from '../components/ui/PlateDiagram'

type Mode = 'target' | 'inventory'

const MODES: { id: Mode; label: string }[] = [
  { id: 'target', label: '¿Qué discos pongo?' },
  { id: 'inventory', label: '¿Qué puedo armar?' },
]

// Bodyweight has no plates, so it's excluded from this screen (per docs/specs/01-weight-calculator.md).
const EQUIPMENT_OPTIONS: { id: EquipmentType; label: string }[] = [
  { id: 'barbell', label: 'Barra' },
  { id: 'dumbbell_pair', label: 'Mancuernas (par)' },
  { id: 'single_dumbbell', label: 'Mancuerna (una)' },
]

const STEP_KG = 2.5

function formatKg(kg: number): string {
  return Number.isInteger(kg) ? `${kg}` : kg.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

/**
 * Base (no-plates) weight for the given equipment type, always buildable. Mirrors the
 * private mapping in src/lib/plates.ts (not exported from there) so it must stay in sync;
 * kept exhaustive over EquipmentType (rather than a barbell/else ternary) so an equipment
 * type this screen doesn't currently offer — e.g. 'bodyweight' — can't silently fall
 * through to the dumbbell-handle weight if the equipment picker is ever extended.
 */
function baseWeightFor(equipmentType: EquipmentType, equipment: ReturnType<typeof useSettingsStore.getState>['equipment']): number {
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

/**
 * Standalone plate/weight calculator per docs/specs/01-weight-calculator.md. Two modes:
 * target weight -> plate breakdown, and equipment -> full buildable-weight list. Pure
 * lookup tool, reads live from useSettingsStore and never writes to any store.
 */
export function Calculator() {
  const equipment = useSettingsStore((s) => s.equipment)
  const [mode, setMode] = useState<Mode>('target')
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('barbell')
  const [targetKg, setTargetKg] = useState<number>(() => baseWeightFor('barbell', equipment))

  const buildableWeights = useMemo(
    () => getBuildableWeights(equipmentType, equipment),
    [equipmentType, equipment],
  )

  // Only the "target" mode renders these, so skip the plate search in "inventory" mode.
  const breakdown = useMemo(
    () => (mode === 'target' ? getPlateBreakdown(equipmentType, targetKg, equipment) : null),
    [mode, equipmentType, targetKg, equipment],
  )

  const alternatives = useMemo(() => {
    if (mode !== 'target' || breakdown) return null
    return nearestBuildable(targetKg, buildableWeights)
  }, [mode, breakdown, targetKg, buildableWeights])

  function selectEquipmentType(next: EquipmentType) {
    setEquipmentType(next)
    setTargetKg(baseWeightFor(next, equipment))
  }

  function step(delta: number) {
    setTargetKg((kg) => Math.max(0, Math.round((kg + delta) * 100) / 100))
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto pb-6">
      <ScreenHeader title="Calculadora de pesos" />

      <div className="flex flex-col gap-6 px-5 pt-5">
        {/* Mode switch */}
        <div className="flex rounded-full bg-bg-elevated-2 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`flex-1 rounded-full px-2 py-2.5 text-[13px] font-semibold transition-colors ${
                mode === m.id ? 'bg-accent text-accent-ink' : 'text-text-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Equipment picker */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Equipo</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" onClick={() => selectEquipmentType(opt.id)}>
                <Chip active={equipmentType === opt.id}>{opt.label}</Chip>
              </button>
            ))}
          </div>
        </div>

        {mode === 'target' ? (
          <>
            {/* Target weight stepper */}
            <div className="flex flex-col gap-2">
              <SectionLabel>Peso objetivo</SectionLabel>
              <Card className="flex items-center justify-between gap-4 py-4">
                <button
                  type="button"
                  aria-label={`Restar ${STEP_KG} kg`}
                  onClick={() => step(-STEP_KG)}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-bg-elevated-2 text-xl font-semibold text-text"
                >
                  −
                </button>
                <div className="font-mono text-4xl font-semibold tabular-nums">
                  {formatKg(targetKg)}
                  <span className="ml-1 text-lg text-text-secondary">kg</span>
                </div>
                <button
                  type="button"
                  aria-label={`Sumar ${STEP_KG} kg`}
                  onClick={() => step(STEP_KG)}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-bg-elevated-2 text-xl font-semibold text-text"
                >
                  +
                </button>
              </Card>
            </div>

            {/* Result */}
            <div className="flex flex-col gap-2">
              <SectionLabel>Discos por lado</SectionLabel>
              {breakdown ? (
                <Card className="flex flex-col gap-4">
                  <PlateDiagram breakdown={breakdown} />
                  <div className="font-mono text-[15px] text-text">{describePlateBreakdown(breakdown)}</div>
                </Card>
              ) : (
                <Card className="flex flex-col gap-3">
                  <div className="text-[14px] text-text-secondary">
                    {formatKg(targetKg)} kg no se puede armar con el equipo actual.
                  </div>
                  {(alternatives?.below !== null || alternatives?.above !== null) && (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-text-tertiary">Opciones más cercanas:</div>
                      <div className="flex gap-2">
                        {alternatives?.below !== null && alternatives?.below !== undefined && (
                          <button
                            type="button"
                            onClick={() => setTargetKg(alternatives.below!)}
                            className="flex-1 rounded-xl bg-bg-elevated-2 py-3 text-center font-mono text-[15px] font-semibold text-text"
                          >
                            {formatKg(alternatives.below)} kg
                          </button>
                        )}
                        {alternatives?.above !== null && alternatives?.above !== undefined && (
                          <button
                            type="button"
                            onClick={() => setTargetKg(alternatives.above!)}
                            className="flex-1 rounded-xl bg-bg-elevated-2 py-3 text-center font-mono text-[15px] font-semibold text-text"
                          >
                            {formatKg(alternatives.above)} kg
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <SectionLabel>Pesos que puedo armar</SectionLabel>
            {buildableWeights.length === 0 ? (
              <Card>
                <div className="text-[14px] text-text-secondary">
                  No hay combinaciones disponibles con el equipo actual.
                </div>
              </Card>
            ) : (
              <Card className="flex flex-wrap gap-2">
                {buildableWeights.map((kg) => (
                  <span
                    key={kg}
                    className="rounded-lg bg-bg-elevated-2 px-3 py-2 font-mono text-[14px] font-medium text-text"
                  >
                    {formatKg(kg)} kg
                  </span>
                ))}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
