/**
 * Estimation slice - estimation, scenarios, scaling, comparison.
 * Extracted from useWorkflowStore.ts.
 */
import { StateCreator } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Node, Edge } from '@xyflow/react';
import type {
  WorkflowNodeData,
  WorkflowEstimation,
  WorkflowScenario,
  BatchEstimateResult,
  ActualNodeStats,
} from '@/types/workflow';
import { nodesToPayload, edgesToPayload, workflowNodeDataFromPayload } from '../utils';
import type { ScalingParams } from '../types';

// Import other slice types for combined state
import type { WorkflowSlice } from './workflowSlice';
import type { UISlice } from './uiSlice';
import type { PersistenceSlice } from './persistenceSlice';

export interface EstimationSlice {
  // State
  estimation: WorkflowEstimation | null;
  scalingParams: ScalingParams;
  actualStats: ActualNodeStats[];
  scenarios: Record<string, WorkflowScenario>;
  currentScenarioId: string | null;
  selectedForComparison: string[];
  comparisonResults: BatchEstimateResult[];

  // Actions - estimation
  setEstimation: (est: WorkflowEstimation) => void;
  clearEstimation: () => void;

  // Actions - scenarios
  saveCurrentScenario: (name: string) => string;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => string;
  toggleComparisonSelection: (id: string) => void;
  setComparisonResults: (results: BatchEstimateResult[]) => void;
  clearComparisonResults: () => void;

  // Actions - scaling
  setRunsPerDay: (rpd: number | null) => void;
  setLoopIntensity: (li: number) => void;

  // Actions - observability
  setActualStats: (stats: ActualNodeStats[]) => void;
  clearActualStats: () => void;
}

type CombinedState = WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice;

export const createEstimationSlice: StateCreator<CombinedState, [], [], EstimationSlice> = (set, get) => ({
  estimation: null,
  scalingParams: { runsPerDay: null, loopIntensity: 1.0 },
  actualStats: [],
  scenarios: {},
  currentScenarioId: null,
  selectedForComparison: [],
  comparisonResults: [],

  setEstimation: (estimation) =>
    set({ estimation, ui: { ...get().ui, isEstimatePanelOpen: true } }),
  clearEstimation: () => set({ estimation: null }),

  saveCurrentScenario: (name: string) => {
    const s = get();
    const id = uuid();
    const now = new Date().toISOString();
    const scenario: WorkflowScenario = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      graph: {
        nodes: nodesToPayload(s.nodes),
        edges: edgesToPayload(s.edges),
        recursionLimit: 25,
      },
      estimate: s.estimation ?? undefined,
    };
    set((prev) => ({
      scenarios: { ...prev.scenarios, [id]: scenario },
      currentScenarioId: id,
    }));
    return id;
  },

  loadScenario: (id: string) => {
    const scenario = get().scenarios[id];
    if (!scenario) return;

    // Convert payload nodes back to React Flow nodes
    const rfNodes: Node<WorkflowNodeData>[] = scenario.graph.nodes.map((n, i) => ({
      id: n.id,
      type: n.type,
      position: { x: 200 + (i % 3) * 280, y: 100 + Math.floor(i / 3) * 180 },
      data: workflowNodeDataFromPayload(n),
    }));

    const rfEdges: Edge[] = scenario.graph.edges.map((e) => ({
      id: e.id ?? `e-${uuid()}`,
      source: e.source,
      target: e.target,
    }));

    set({
      nodes: rfNodes,
      edges: rfEdges,
      historyStack: [],
      redoStack: [],
      estimation: scenario.estimate ?? null,
      currentScenarioId: id,
    });
  },

  deleteScenario: (id: string) =>
    set((s) => {
      const { [id]: _, ...rest } = s.scenarios;
      const isCurrent = s.currentWorkflowId === id;
      return {
        scenarios: rest,
        selectedForComparison: s.selectedForComparison.filter((sid) => sid !== id),
        currentScenarioId: s.currentScenarioId === id ? null : s.currentScenarioId,
        ...(isCurrent ? { currentWorkflowId: null, currentWorkflowName: 'Untitled Workflow', isDirty: false } : {}),
      };
    }),

  duplicateScenario: (id: string) => {
    const original = get().scenarios[id];
    if (!original) return '';
    const newId = uuid();
    const now = new Date().toISOString();
    const dup: WorkflowScenario = {
      ...original,
      id: newId,
      name: `${original.name} (copy)`,
      createdAt: now,
      updatedAt: now,
      estimate: undefined,
    };
    set((prev) => ({
      scenarios: { ...prev.scenarios, [newId]: dup },
    }));
    return newId;
  },

  toggleComparisonSelection: (id: string) =>
    set((s) => ({
      selectedForComparison: s.selectedForComparison.includes(id)
        ? s.selectedForComparison.filter((sid) => sid !== id)
        : [...s.selectedForComparison, id],
    })),

  setComparisonResults: (results) => set({ comparisonResults: results }),
  clearComparisonResults: () => set({ comparisonResults: [] }),

  setRunsPerDay: (rpd) =>
    set((s) => ({ scalingParams: { ...s.scalingParams, runsPerDay: rpd } })),
  setLoopIntensity: (li) =>
    set((s) => ({ scalingParams: { ...s.scalingParams, loopIntensity: li } })),

  setActualStats: (stats) => set({ actualStats: stats }),
  clearActualStats: () => set({ actualStats: [] }),
});
