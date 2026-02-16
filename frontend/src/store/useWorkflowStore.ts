/**
 * Zustand store – single source of truth for workflow state.
 *
 * Slices: nodes, edges, selectedNode, estimation, scenarios, UI flags.
 * Selector hooks exported at the bottom for fine‑grained subscriptions.
 */

import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import type {
  WorkflowNodeData,
  WorkflowEstimation,
  WorkflowScenario,
  NodeConfigPayload,
  EdgeConfigPayload,
  BatchEstimateResult,
  ActualNodeStats,
  ImportedWorkflow,
} from "@/types/workflow";

// ── UI slice ──────────────────────────────────────────────────
interface UIState {
  isConfigModalOpen: boolean;
  isEstimatePanelOpen: boolean;
  isComparisonOpen: boolean;
  errorBanner?: string;
  theme: "light" | "dark";
}

// ── Scaling / what-if slice ──────────────────────────────────
interface ScalingParams {
  runsPerDay: number | null;
  loopIntensity: number;   // 0.1 – 5.0 (1.0 = baseline)
}

// ── Full store ────────────────────────────────────────────────
interface WorkflowStore {
  // Data
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  estimation: WorkflowEstimation | null;
  ui: UIState;
  scalingParams: ScalingParams;
  actualStats: ActualNodeStats[];

  // Scenarios
  scenarios: Record<string, WorkflowScenario>;
  currentScenarioId: string | null;
  selectedForComparison: string[];
  comparisonResults: BatchEstimateResult[];

  // Node / edge actions
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addNode: (node: Node<WorkflowNodeData>) => void;
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (id: string) => void;

  // Selection
  setSelectedNodeId: (id: string | null) => void;

  // Estimation
  setEstimation: (est: WorkflowEstimation) => void;
  clearEstimation: () => void;

  // Scenarios
  saveCurrentScenario: (name: string) => string;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => string;
  toggleComparisonSelection: (id: string) => void;
  setComparisonResults: (results: BatchEstimateResult[]) => void;
  clearComparisonResults: () => void;

  // Import
  importWorkflow: (imported: ImportedWorkflow, mode: "replace" | "scenario") => void;

  // UI
  openConfigModal: () => void;
  closeConfigModal: () => void;
  toggleEstimatePanel: () => void;
  toggleComparisonDrawer: () => void;
  setErrorBanner: (msg?: string) => void;
  toggleTheme: () => void;

  // Scaling / what-if
  setRunsPerDay: (rpd: number | null) => void;
  setLoopIntensity: (li: number) => void;

  // Observability
  setActualStats: (stats: ActualNodeStats[]) => void;
  clearActualStats: () => void;
}

/** Convert current canvas nodes to backend payload format. */
function nodesToPayload(nodes: Node<WorkflowNodeData>[]): NodeConfigPayload[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.data.type,
    label: n.data.label,
    model_provider: n.data.modelProvider,
    model_name: n.data.modelName,
    context: n.data.context,
    tool_id: n.data.toolId,
    tool_category: n.data.toolCategory,
    max_steps: (n.data.maxSteps as number | null | undefined) ?? null,
    task_type: (n.data.taskType as string | undefined) ?? null,
    expected_output_size: (n.data.expectedOutputSize as string | undefined) ?? null,
    expected_calls_per_run: (n.data.expectedCallsPerRun as number | null | undefined) ?? null,
  }));
}

function edgesToPayload(edges: Edge[]): EdgeConfigPayload[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────
  nodes: [],
  edges: [],
  selectedNodeId: null,
  estimation: null,
  ui: {
    isConfigModalOpen: false,
    isEstimatePanelOpen: false,
    isComparisonOpen: false,
    theme: "light",
  },

  // Scenarios
  scenarios: {},
  currentScenarioId: null,
  selectedForComparison: [],
  comparisonResults: [],

  // Scaling
  scalingParams: { runsPerDay: null, loopIntensity: 1.0 },

  // Observability
  actualStats: [],

  // ── Node / edge actions ────────────────────────────────────
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<WorkflowNodeData>[] }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  updateNodeData: (id, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  // ── Selection ──────────────────────────────────────────────
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  // ── Estimation ─────────────────────────────────────────────
  setEstimation: (estimation) =>
    set({ estimation, ui: { ...get().ui, isEstimatePanelOpen: true } }),
  clearEstimation: () => set({ estimation: null }),

  // ── Scenarios ──────────────────────────────────────────────
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

    const rfEdges: Edge[] = scenario.graph.edges.map((e) => ({
      id: e.id ?? `e-${uuid()}`,
      source: e.source,
      target: e.target,
    }));

    set({
      nodes: rfNodes,
      edges: rfEdges,
      estimation: scenario.estimate ?? null,
      currentScenarioId: id,
    });
  },

  deleteScenario: (id: string) =>
    set((s) => {
      const { [id]: _, ...rest } = s.scenarios;
      return {
        scenarios: rest,
        selectedForComparison: s.selectedForComparison.filter((sid) => sid !== id),
        currentScenarioId: s.currentScenarioId === id ? null : s.currentScenarioId,
      };
    }),

  duplicateScenario: (id: string) => {
    const original = get().scenarios[id];
    if (!original) return "";
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

  // ── Import ─────────────────────────────────────────────────
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

    if (mode === "replace") {
      set({
        nodes: rfNodes,
        edges: rfEdges,
        estimation: null,
        currentScenarioId: null,
      });
    } else {
      // mode === "scenario" — save as a comparison scenario
      const id = uuid();
      const now = new Date().toISOString();
      const name = (imported.metadata?.name as string) || `Imported (${imported.metadata?.source ?? "external"})`;
      const scenario: WorkflowScenario = {
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

  // ── UI ─────────────────────────────────────────────────────
  openConfigModal: () =>
    set((s) => ({ ui: { ...s.ui, isConfigModalOpen: true } })),
  closeConfigModal: () =>
    set((s) => ({ ui: { ...s.ui, isConfigModalOpen: false } })),
  toggleEstimatePanel: () =>
    set((s) => ({
      ui: { ...s.ui, isEstimatePanelOpen: !s.ui.isEstimatePanelOpen },
    })),
  toggleComparisonDrawer: () =>
    set((s) => ({
      ui: { ...s.ui, isComparisonOpen: !s.ui.isComparisonOpen },
    })),
  setErrorBanner: (msg) =>
    set((s) => ({ ui: { ...s.ui, errorBanner: msg } })),
  toggleTheme: () =>
    set((s) => {
      const next = s.ui.theme === "light" ? "dark" : "light";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      return { ui: { ...s.ui, theme: next } };
    }),

  // ── Scaling / what-if ──────────────────────────────────────
  setRunsPerDay: (rpd) =>
    set((s) => ({ scalingParams: { ...s.scalingParams, runsPerDay: rpd } })),
  setLoopIntensity: (li) =>
    set((s) => ({ scalingParams: { ...s.scalingParams, loopIntensity: li } })),

  // ── Observability ──────────────────────────────────────────
  setActualStats: (stats) => set({ actualStats: stats }),
  clearActualStats: () => set({ actualStats: [] }),
}));

// ── Selector hooks (fine‑grained subscriptions) ──────────────
export const useWorkflowNodes = () => useWorkflowStore((s) => s.nodes);
export const useWorkflowEdges = () => useWorkflowStore((s) => s.edges);
export const useSelectedNodeId = () => useWorkflowStore((s) => s.selectedNodeId);
export const useEstimation = () => useWorkflowStore((s) => s.estimation);
export const useUIState = () => useWorkflowStore((s) => s.ui);
export const useScalingParams = () => useWorkflowStore((s) => s.scalingParams);
export const useActualStats = () => useWorkflowStore((s) => s.actualStats);
export const useScenarios = () => useWorkflowStore((s) => s.scenarios);
export const useSelectedForComparison = () => useWorkflowStore((s) => s.selectedForComparison);
export const useComparisonResults = () => useWorkflowStore((s) => s.comparisonResults);
