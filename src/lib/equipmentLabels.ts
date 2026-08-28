import type { EquipmentType } from '../types/routine'

/** User-facing (Spanish) label per equipment type — "es barra o mancuerna", shown wherever an exercise is listed. */
export const equipmentLabels: Record<EquipmentType, string> = {
  barbell: 'Barra',
  dumbbell_pair: 'Mancuernas (par)',
  single_dumbbell: 'Mancuerna',
  bodyweight: 'Peso corporal',
}
