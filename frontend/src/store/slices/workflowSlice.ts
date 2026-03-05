/**
 * Workflow slice - nodes, edges, graph operations.
 * Extracted from useWorkflowStore.ts.
 */
import { StateCreator } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type { WorkflowNodeData, WorkflowNodeType, ImportedWorkflow } from '@/types/workflow';
import { v4 as uuid } from 'uuid';

// Import other slice types for combined state
import type { EstimationSlice } from './estimationSlice';
import type { UISlice } from './uiSlice';
import type { PersistenceSlice } from './persistenceSlice';

export interface WorkflowSlice {
  // State
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Actions
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addNode: (node: Node<WorkflowNodeData>) => void;
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (id: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  importWorkflow: (imported: ImportedWorkflow, mode: 'replace' | 'scenario') => void;
  loadNeurovnWorkflow: (payload: {
    schema_version?: string;
    nodes: { id: string; type: WorkflowNodeType; position?: { x: number; y: number }; data?: Record<string, unknown> }[];
    edges: Edge[];
  }) => void;
}

type CombinedState = WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice;

export const createWorkflowSlice: StateCreator<CombinedState, [], [], WorkflowSlice> = (set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    const updated = applyNodeChanges(changes, get().nodes) as Node<WorkflowNodeData>[];
    let needsZFix = false;
    for (const n of updated) {
      if (n.type === 'blankBoxNode' && n.zIndex !== -1) {
        needsZFix = true;
        break;
      }
    }
    const meaningful = changes.some((c) => c.type !== 'select');
    set({
      nodes: needsZFix
        ? updated.map((n) => n.type === 'blankBoxNode' && n.zIndex !== -1 ? { ...n, zIndex: -1 } : n)
        : updated,
      ...(meaningful && !get().isDirty ? { isDirty: true } : {}),
    });
  },

  onEdgesChange: (changes) => {
    const meaningful = changes.some((c) => c.type !== 'select');
    set({
      edges: applyEdgeChanges(changes, get().edges),
      ...(meaningful && !get().isDirty ? { isDirty: true } : {}),
    });
  },

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node], isDirty: true })),

  updateNodeData: (id, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      isDirty: true,
    })),

  updateEdgeLabel: (id, label) =>
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id ? { ...e, data: { ...((e.data as Record<string, unknown>) ?? {}), label } } : e
      ),
      isDirty: true,
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  importWorkflow: (imported, mode) => {
    const rfNodes: Node<WorkflowNodeData>[] = imported.nodes.map((n, i) => ({
      id: n.id,
      type: n.type,
      position: { x: 200 + (i % 4) * 250, y: 100 + Math.floor(i / 4) * 180 },
      data: {
        label: n.label ?? n.type,
        type: n.type,
        modelProvider: n.model_provider,
        modelName: n.model_name,
        context: n.context,
        toolId: n.tool_id,
        toolCategory: n.tool_category,
        maxSteps: n.max_steps,
        taskType: n.task_type ?? undefined,
        expectedOutputSize: n.expected_output_size ?? undefined,
        expectedCallsPerRun: n.expected_calls_per_run ?? undefined,
      },
    }));

    const rfEdges: Edge[] = imported.edges.map((e) => ({
      id: e.id ?? `ie-${uuid()}`,
      source: e.source,
      target: e.target,
    }));

    if (mode === 'replace') {
      set({
        nodes: rfNodes,
        edges: rfEdges,
        estimation: null,
        currentScenarioId: null,
        ui: { ...get().ui, needsLayout: true },
      });
    } else {
      // mode === 'scenario' - handled by estimation slice
      const id = uuid();
      const now = new Date().toISOString();
      const name = (imported.metadata?.name as string) || `Imported (${imported.metadata?.source ?? 'external'})`;
      const scenario = {
        id,
        name,
        createdAt: now,
        updatedAt: now,
        graph: {
          nodes: imported.nodes,
          edges: imported.edges,
          recursionLimit: (imported.metadata?.recursion_limit as number) ?? 25,
        },
      };
      set((prev) => ({
        scenarios: { ...prev.scenarios, [id]: scenario },
      }));
    }
  },

  loadNeurovnWorkflow: (payload) => {
    const rfNodes: Node<WorkflowNodeData>[] = payload.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: Math.random() * 500, y: Math.random() * 500 },
      data: (n.data || {}) as WorkflowNodeData,
    }));

    const rfEdges: Edge[] = payload.edges.map((e) => ({
      ...e,
      id: e.id ?? `e-${uuid()}`,
    }));

    set({
      nodes: rfNodes,
      edges: rfEdges,
      estimation: null,
      currentScenarioId: null,
      ui: { ...get().ui, needsLayout: true },
    });
  },
});
