import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExportRange } from '../lib/aiExport'
import { applyChange, revertChange, type AiChange, type ChangeUndo, type ParsedResponse } from '../lib/aiImport'
import { useRoutineStore } from './useRoutineStore'
import { useExerciseStore } from './useExerciseStore'

export type ChangeStatus = 'pending' | 'applied' | 'discarded' | 'invalid' | 'reverted'

export interface AnalysisChange {
  raw: unknown
  change?: AiChange
  error?: string
  status: ChangeStatus
  undo?: ChangeUndo
}

export interface Analysis {
  id: string
  /** Epoch ms when the response was imported. */
  createdAt: number
  range?: ExportRange
  prose: string
  summary: string
  changes: AnalysisChange[]
}

interface AnalysisState {
  /** Newest first. */
  analyses: Analysis[]
  addAnalysis: (parsed: ParsedResponse, range?: ExportRange) => Analysis
  /** Applies one pending change to its routine. Returns a Spanish error message, or null on success. */
  applyChange: (analysisId: string, index: number) => string | null
  discardChange: (analysisId: string, index: number) => void
  /** Reverts every applied change of the analysis, newest first. */
  undoAnalysis: (analysisId: string) => void
  deleteAnalysis: (analysisId: string) => void
}

function updateChange(analyses: Analysis[], id: string, index: number, patch: Partial<AnalysisChange>): Analysis[] {
  return analyses.map((a) =>
    a.id === id ? { ...a, changes: a.changes.map((c, i) => (i === index ? { ...c, ...patch } : c)) } : a,
  )
}

/** Imported AI analyses and the review state of their proposed changes (docs/specs/06-ai-analysis.md). */
export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      analyses: [],

      addAnalysis: (parsed, range) => {
        const analysis: Analysis = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          range,
          prose: parsed.prose,
          summary: parsed.summary,
          changes: parsed.changes.map((c) => ({ ...c, status: c.change ? 'pending' : 'invalid' })),
        }
        set((s) => ({ analyses: [analysis, ...s.analyses] }))
        return analysis
      },

      applyChange: (analysisId, index) => {
        const item = get().analyses.find((a) => a.id === analysisId)?.changes[index]
        if (!item?.change || item.status !== 'pending') return null
        const routines = useRoutineStore.getState()
        const routine = routines.getRoutineById(item.change.routineId)
        if (!routine) return 'La rutina ya no existe.'
        try {
          const { exercises, undo } = applyChange(routine, item.change, useExerciseStore.getState().exercises)
          routines.setRoutineExercises(routine.id, exercises)
          set((s) => ({ analyses: updateChange(s.analyses, analysisId, index, { status: 'applied', undo }) }))
          return null
        } catch (e) {
          return e instanceof Error ? e.message : 'No se pudo aplicar el cambio.'
        }
      },

      discardChange: (analysisId, index) =>
        set((s) => ({ analyses: updateChange(s.analyses, analysisId, index, { status: 'discarded' }) })),

      undoAnalysis: (analysisId) => {
        const analysis = get().analyses.find((a) => a.id === analysisId)
        if (!analysis) return
        const routines = useRoutineStore.getState()
        const reverted = analysis.changes.map((c, i) => ({ c, i })).filter(({ c }) => c.status === 'applied' && c.undo)
        for (const { c } of reverted.reverse()) {
          const routine = useRoutineStore.getState().getRoutineById(c.undo!.routineId)
          if (routine) routines.setRoutineExercises(routine.id, revertChange(routine, c.undo!))
        }
        set((s) => ({
          analyses: s.analyses.map((a) =>
            a.id === analysisId
              ? { ...a, changes: a.changes.map((c) => (c.status === 'applied' ? { ...c, status: 'reverted', undo: undefined } : c)) }
              : a,
          ),
        }))
      },

      deleteAnalysis: (analysisId) => set((s) => ({ analyses: s.analyses.filter((a) => a.id !== analysisId) })),
    }),
    { name: 'routine-app:analysis' },
  ),
)
