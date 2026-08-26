import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { programa } from '../data/programa'
import type { Equipo } from '../types/programa'

interface AjustesState {
  equipo: Equipo
  sonidoActivo: boolean
  setPesoBarraLarga: (pesoKg: number) => void
  setPesoBarraMancuerna: (pesoKg: number) => void
  toggleSonido: () => void
  resetearEquipo: () => void
}

export const useAjustesStore = create<AjustesState>()(
  persist(
    (set) => ({
      equipo: programa.equipo,
      sonidoActivo: true,
      setPesoBarraLarga: (pesoKg) =>
        set((s) => ({ equipo: { ...s.equipo, barraLarga: { ...s.equipo.barraLarga, pesoKg } } })),
      setPesoBarraMancuerna: (pesoKg) =>
        set((s) => ({
          equipo: { ...s.equipo, barraMancuerna: { ...s.equipo.barraMancuerna, pesoKg } },
        })),
      toggleSonido: () => set((s) => ({ sonidoActivo: !s.sonidoActivo })),
      resetearEquipo: () => set({ equipo: programa.equipo }),
    }),
    { name: 'rutina:ajustes' },
  ),
)
