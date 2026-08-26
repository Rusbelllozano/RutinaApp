export type Implemento =
  | 'barra'
  | 'par_mancuernas'
  | 'mancuerna_individual'
  | 'peso_corporal'

export interface Ejercicio {
  orden: number
  nombre: string
  series: number
  /** Rango de reps por doble progresión. Si no aplica (ej. plancha), usar `reps` o `duracionSeg`. */
  repMin?: number
  repMax?: number
  /** Texto libre cuando el rango no aplica: "10 por pierna", "máximas". */
  reps?: string
  /** Segundos de trabajo, para ejercicios isométricos (plancha, hollow hold). */
  duracionSeg?: number | [number, number]
  descansoSeg: number
  implemento: Implemento
  cargaInicialKg?: number
  /** Descripción textual de referencia; la calculadora de discos recalcula esto en runtime. */
  discos?: string
  alternativa?: string
  video?: string
  nota?: string
}

export interface DiaRutina {
  id: 'A' | 'B' | 'C'
  nombre: string
  musculos: string[]
  ejercicios: Ejercicio[]
}

export interface ItemCalentamiento {
  nombre: string
  duracion?: string
  reps?: string
}

export interface Disco {
  kg: number
  cantidad: number
}

export interface Equipo {
  barraLarga: { pesoKg: number; longitudCm: number }
  barraMancuerna: { pesoKg: number; cantidad: number; longitudCm: number }
  seguros: { cantidad: number; pesoKg: number }
  discos: Disco[]
}

export interface ProgramaEntrenamiento {
  equipo: Equipo
  calentamiento: ItemCalentamiento[]
  estiramiento: string[]
  dias: DiaRutina[]
}
