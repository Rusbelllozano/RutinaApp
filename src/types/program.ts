export type EquipmentType =
  | 'barbell'
  | 'dumbbell_pair'
  | 'single_dumbbell'
  | 'bodyweight'

export interface Exercise {
  order: number
  /** User-facing name — kept in Spanish, this app's UI language. */
  name: string
  sets: number
  /** Rep range for double progression. If it doesn't apply (e.g. plank), use `reps` or `durationSec`. */
  minReps?: number
  maxReps?: number
  /** Free text when the range doesn't apply: "10 per leg", "max reps" — Spanish in the data. */
  reps?: string
  /** Work duration in seconds, for isometric exercises (plank, hollow hold). */
  durationSec?: number | [number, number]
  restSec: number
  equipment: EquipmentType
  initialWeightKg?: number
  /** Reference plate description shown to the user; the plate calculator recomputes this at runtime. */
  plateNote?: string
  alternative?: string
  video?: string
  note?: string
}

export interface WorkoutDay {
  id: 'A' | 'B' | 'C'
  /** User-facing name — kept in Spanish. */
  name: string
  muscleGroups: string[]
  exercises: Exercise[]
}

export interface WarmupItem {
  name: string
  duration?: string
  reps?: string
}

export interface Plate {
  kg: number
  quantity: number
}

export interface Equipment {
  barbell: { weightKg: number; lengthCm: number }
  dumbbellHandle: { weightKg: number; quantity: number; lengthCm: number }
  collars: { quantity: number; weightKg: number }
  plates: Plate[]
}

export interface TrainingProgram {
  equipment: Equipment
  warmup: WarmupItem[]
  cooldown: string[]
  days: WorkoutDay[]
}
