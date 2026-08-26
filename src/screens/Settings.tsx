import { useRef, useState } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import { useRotationStore } from '../store/useRotationStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SectionLabel } from '../components/ui/SectionLabel'

/**
 * Every persisted Zustand store's localStorage key — confirmed from each store file's
 * `persist(..., { name: '...' })` call. Export/import bundles all six, per
 * docs/HANDOFF.md §5.7 and §8 ("history can be exported and re-imported").
 */
const STORE_KEYS = [
  'routine-app:settings',
  'routine-app:exercises',
  'routine-app:routines',
  'routine-app:rotation',
  'routine-app:history',
  'routine-app:calendar',
] as const

/** Equipment/sound/rotation/export-import per docs/HANDOFF.md §5.7. */
export function Settings() {
  const equipment = useSettingsStore((s) => s.equipment)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const setBarbellWeight = useSettingsStore((s) => s.setBarbellWeight)
  const setDumbbellHandleWeight = useSettingsStore((s) => s.setDumbbellHandleWeight)
  const setPlateQuantity = useSettingsStore((s) => s.setPlateQuantity)
  const toggleSound = useSettingsStore((s) => s.toggleSound)
  const resetRotation = useRotationStore((s) => s.resetRotation)

  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleResetRotation() {
    const confirmed = window.confirm(
      '¿Reiniciar la rotación A-B-C? Empezará de nuevo desde el día A. Tu historial no se borra.',
    )
    if (confirmed) resetRotation()
  }

  function handleExport() {
    // A store that hasn't been written to yet (e.g. the user never touched the Calendar
    // or added a custom routine) has no localStorage entry at all — omit it rather than
    // bundling `null`, so importing this file elsewhere never wipes that store's real data.
    const bundle: Record<string, unknown> = {}
    for (const key of STORE_KEYS) {
      const raw = localStorage.getItem(key)
      if (raw !== null) bundle[key] = JSON.parse(raw)
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rutina-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    setImportError(null)
    fileInputRef.current?.click()
  }

  async function handleImportFile(file: File) {
    setImportError(null)
    try {
      const text = await file.text()
      const bundle = JSON.parse(text) as Record<string, unknown>
      const recognized = STORE_KEYS.filter((key) => key in bundle)
      if (recognized.length === 0) {
        setImportError('El archivo no parece un respaldo válido de RutinaApp.')
        return
      }
      // A missing key means the exporting device never wrote that store — leave this
      // device's copy of it untouched instead of overwriting it with nothing.
      for (const key of recognized) {
        localStorage.setItem(key, JSON.stringify(bundle[key]))
      }
      window.location.reload()
    } catch {
      setImportError('No se pudo leer el archivo. Elige un JSON exportado desde esta app.')
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-6 pt-7">
      <div className="text-lg font-semibold">Ajustes</div>

      <Card className="flex flex-col gap-4">
        <SectionLabel>Equipo</SectionLabel>
        <Stepper
          label="Peso de la barra"
          value={equipment.barbell.weightKg}
          unit="kg"
          step={0.5}
          min={0}
          onChange={setBarbellWeight}
        />
        <Stepper
          label="Peso del mango de mancuerna"
          value={equipment.dumbbellHandle.weightKg}
          unit="kg"
          step={0.5}
          min={0}
          onChange={setDumbbellHandleWeight}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <SectionLabel>Discos disponibles</SectionLabel>
        {equipment.plates.map((plate) => (
          <Stepper
            key={plate.kg}
            label={`Discos de ${plate.kg} kg`}
            value={plate.quantity}
            unit=""
            step={1}
            min={0}
            onChange={(quantity) => setPlateQuantity(plate.kg, quantity)}
          />
        ))}
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <SectionLabel>Sonido</SectionLabel>
          <div className="mt-1 text-sm text-text-secondary">Aviso al terminar el descanso</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={soundEnabled}
          aria-label="Sonido"
          onClick={toggleSound}
          className={`relative h-7 w-12 flex-none rounded-full transition-colors ${
            soundEnabled ? 'bg-accent' : 'bg-bg-elevated-2'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-bg transition-transform ${
              soundEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </Card>

      <Card className="flex flex-col gap-3">
        <SectionLabel>Rotación</SectionLabel>
        <div className="text-sm text-text-secondary">
          Vuelve a empezar la secuencia A → B → C desde el día A.
        </div>
        <Button
          variant="secondary"
          size="md"
          className="border-danger text-danger!"
          onClick={handleResetRotation}
        >
          Reiniciar rotación A-B-C
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <SectionLabel>Respaldo</SectionLabel>
        <div className="text-sm text-text-secondary">
          Exporta todos tus datos a un archivo, o impórtalos en otro dispositivo.
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" onClick={handleExport}>
            Exportar JSON
          </Button>
          <Button variant="secondary" size="md" className="flex-1" onClick={handleImportClick}>
            Importar JSON
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleImportFile(file)
          }}
        />
        {importError && <div className="text-sm text-danger">{importError}</div>}
      </Card>
    </div>
  )
}

interface StepperProps {
  label: string
  value: number
  unit: string
  step: number
  min: number
  onChange: (value: number) => void
}

/** Big-button stepper — no free-text entry, per HANDOFF's one-handed/no-typing UI. */
function Stepper({ label, value, unit, step, min, onChange }: StepperProps) {
  const decrement = () => onChange(Math.max(min, round(value - step)))
  const increment = () => onChange(round(value + step))

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-text">{label}</div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Disminuir ${label}`}
          onClick={decrement}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-border bg-bg-elevated-2 font-mono text-lg leading-none text-text"
        >
          −
        </button>
        <div className="w-14 flex-none text-center font-mono text-base text-text">
          {value}
          {unit}
        </div>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={increment}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-border bg-bg-elevated-2 font-mono text-lg leading-none text-text"
        >
          +
        </button>
      </div>
    </div>
  )
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
