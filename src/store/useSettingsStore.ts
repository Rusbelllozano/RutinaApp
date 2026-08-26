import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { program } from '../data/program'
import type { Equipment } from '../types/program'

interface SettingsState {
  equipment: Equipment
  soundEnabled: boolean
  setBarbellWeight: (weightKg: number) => void
  setDumbbellHandleWeight: (weightKg: number) => void
  /** Sets the on-hand count for one plate size (kg), for a plate not already in inventory this is a no-op. */
  setPlateQuantity: (kg: number, quantity: number) => void
  toggleSound: () => void
  resetEquipment: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      equipment: program.equipment,
      soundEnabled: true,
      setBarbellWeight: (weightKg) =>
        set((s) => ({ equipment: { ...s.equipment, barbell: { ...s.equipment.barbell, weightKg } } })),
      setDumbbellHandleWeight: (weightKg) =>
        set((s) => ({
          equipment: { ...s.equipment, dumbbellHandle: { ...s.equipment.dumbbellHandle, weightKg } },
        })),
      setPlateQuantity: (kg, quantity) =>
        set((s) => ({
          equipment: {
            ...s.equipment,
            plates: s.equipment.plates.map((p) => (p.kg === kg ? { ...p, quantity } : p)),
          },
        })),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      resetEquipment: () => set({ equipment: program.equipment }),
    }),
    { name: 'routine-app:settings' },
  ),
)
