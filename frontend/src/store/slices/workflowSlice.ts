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
import { workflowNodeDataFromPayload } from '../utils';

// Import other slice types for combined state
import type { EstimationSlice } from './estimationSlice';
import type { UISlice } from './uiSlice';
import type { PersistenceSlice } from './persistenceSlice';

const HISTORY_LIMIT = 50;

type CombinedState = WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice;

type WorkflowCommand = {
  kind:
  | 'add-node'
  | 'delete-node'
  | 'add-edge'
  | 'delete-edge'
  | 'move-node'
  | 'update-node-data';
  do: (state: CombinedState) => Partial<CombinedState>;
  undo: (state: CombinedState) => Partial<CombinedState>;
};

const deepClone = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  if (value === undefined || value === null || typeof value !== 'object') {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const edgeKey = (edge: Edge): string =>
  edge.id ?? `${edge.source}->${edge.target}:${edge.sourceHandle ?? ''}`;

const pushHistory = (history: WorkflowCommand[], command: WorkflowCommand): WorkflowCommand[] => {
  const next = [...history, command];
  if (next.length <= HISTORY_LIMIT) return next;
  return next.slice(next.length - HISTORY_LIMIT);
};

const mergeUniqueNodes = (
  existing: Node<WorkflowNodeData>[],
  incoming: Node<WorkflowNodeData>[],
): Node<WorkflowNodeData>[] => {
  const seen = new Set(existing.map((n) => n.id));
  const additions = incoming.filter((n) => !seen.has(n.id));
  return [...existing, ...additions];
};

const mergeUniqueEdges = (existing: Edge[], incoming: Edge[]): Edge[] => {
  const seen = new Set(existing.map(edgeKey));
  const additions = incoming.filter((e) => !seen.has(edgeKey(e)));
  return [...existing, ...additions];
};

const createAddNodeCommand = (node: Node<WorkflowNodeData>): WorkflowCommand => {
  const savedNode = deepClone(node);
  return {
    kind: 'add-node',
    do: (state) => {
      if (state.nodes.some((n) => n.id === savedNode.id)) return {};
      return {
        nodes: [...state.nodes, deepClone(savedNode)],
        isDirty: true,
      };
    },
    undo: (state) => {
      const nextNodes = state.nodes.filter((n) => n.id !== savedNode.id);
      const nextEdges = state.edges.filter((e) => e.source !== savedNode.id && e.target !== savedNode.id);
      return {
        nodes: nextNodes,
        edges: nextEdges,
        selectedNodeId: state.selectedNodeId === savedNode.id ? null : state.selectedNodeId,
        isDirty: true,
      };
    },
  };
};

const createDeleteNodeCommand = (
  node: Node<WorkflowNodeData>,
  edges: Edge[],
): WorkflowCommand => {
  const savedNode = deepClone(node);
  const savedEdges = deepClone(edges);
  return {
    kind: 'delete-node',
    do: (state) => {
      const nextNodes = state.nodes.filter((n) => n.id !== savedNode.id);
      const nextEdges = state.edges.filter((e) => e.source !== savedNode.id && e.target !== savedNode.id);
      return {
        nodes: nextNodes,
        edges: nextEdges,
        selectedNodeId: state.selectedNodeId === savedNode.id ? null : state.selectedNodeId,
        isDirty: true,
      };
    },
    undo: (state) => ({
      nodes: mergeUniqueNodes(state.nodes, [deepClone(savedNode)]),
      edges: mergeUniqueEdges(state.edges, deepClone(savedEdges)),
      isDirty: true,
    }),
  };
};

const createAddEdgeCommand = (edge: Edge): WorkflowCommand => {
  const savedEdge = deepClone(edge);
  return {
    kind: 'add-edge',
    do: (state) => {
      if (state.edges.some((e) => edgeKey(e) === edgeKey(savedEdge))) return {};
      return {
        edges: [...state.edges, deepClone(savedEdge)],
        isDirty: true,
      };
    },
    undo: (state) => ({
      edges: state.edges.filter((e) => edgeKey(e) !== edgeKey(savedEdge)),
      isDirty: true,
    }),
  };
};

const createDeleteEdgeCommand = (edge: Edge): WorkflowCommand => {
  const savedEdge = deepClone(edge);
  return {
    kind: 'delete-edge',
    do: (state) => ({
      edges: state.edges.filter((e) => edgeKey(e) !== edgeKey(savedEdge)),
      isDirty: true,
    }),
    undo: (state) => ({
      edges: mergeUniqueEdges(state.edges, [deepClone(savedEdge)]),
      isDirty: true,
    }),
  };
};

const createMoveNodeCommand = (
  nodeId: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
): WorkflowCommand => {
  const fromPos = deepClone(from);
  const toPos = deepClone(to);
  return {
    kind: 'move-node',
    do: (state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, position: deepClone(toPos) } : n
      ),
      isDirty: true,
    }),
    undo: (state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, position: deepClone(fromPos) } : n
      ),
      isDirty: true,
    }),
  };
};

const createUpdateNodeDataCommand = (
  nodeId: string,
  before: Partial<WorkflowNodeData>,
  after: Partial<WorkflowNodeData>,
): WorkflowCommand => {
  const beforePatch = deepClone(before);
  const afterPatch = deepClone(after);
  return {
    kind: 'update-node-data',
    do: (state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...deepClone(afterPatch) } } : n
      ),
      isDirty: true,
    }),
    undo: (state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...deepClone(beforePatch) } } : n
      ),
      isDirty: true,
    }),
  };
};

export interface WorkflowSlice {
  // State
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  historyStack: WorkflowCommand[];
  redoStack: WorkflowCommand[];

  // Actions
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addNode: (node: Node<WorkflowNodeData>) => void;
  addEdge: (edge: Edge) => void;
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (id: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  importWorkflow: (imported: ImportedWorkflow, mode: 'replace' | 'scenario') => void;
  loadNeurovnWorkflow: (payload: {
    schema_version?: string;
    nodes: { id: string; type: WorkflowNodeType; position?: { x: number; y: number }; data?: Record<string, unknown> }[];
    edges: Edge[];
  }) => void;
}

export const createWorkflowSlice: StateCreator<CombinedState, [], [], WorkflowSlice> = (set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  historyStack: [],
  redoStack: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  undo: () =>
    set((state) => {
      const command = state.historyStack[state.historyStack.length - 1];
      if (!command) return {};
      const patch = command.undo(state);
      return {
        ...patch,
        historyStack: state.historyStack.slice(0, -1),
        redoStack: [...state.redoStack, command],
        isDirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      const command = state.redoStack[state.redoStack.length - 1];
      if (!command) return {};
      const patch = command.do(state);
      return {
        ...patch,
        historyStack: pushHistory(state.historyStack, command),
        redoStack: state.redoStack.slice(0, -1),
        isDirty: true,
      };
    }),

  onNodesChange: (changes) => {
    set((state) => {
      const moveCommands: WorkflowCommand[] = [];
      for (const change of changes) {
        if (change.type !== 'position' || !change.position || change.dragging !== false) {
          continue;
        }
        const prev = state.nodes.find((n) => n.id === change.id);
        if (!prev) continue;
        if (prev.position.x === change.position.x && prev.position.y === change.position.y) {
          continue;
        }
        moveCommands.push(
          createMoveNodeCommand(
            change.id,
            { x: prev.position.x, y: prev.position.y },
            { x: change.position.x, y: change.position.y },
          )
        );
      }

      const updated = applyNodeChanges(changes, state.nodes) as Node<WorkflowNodeData>[];
      const normalizedNodes = updated.map((n) =>
        n.type === 'blankBoxNode' && n.zIndex !== -1 ? { ...n, zIndex: -1 } : n
      );

      let nextHistory = state.historyStack;
      for (const command of moveCommands) {
        nextHistory = pushHistory(nextHistory, command);
      }

      const meaningful = changes.some((c) => c.type !== 'select');
      return {
        nodes: normalizedNodes,
        ...(meaningful ? { isDirty: true } : {}),
        ...(moveCommands.length > 0
          ? { historyStack: nextHistory, redoStack: [] }
          : {}),
      };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const deleteCommands: WorkflowCommand[] = [];
      for (const change of changes) {
        if (change.type !== 'remove') continue;
        const edge = state.edges.find((e) => e.id === change.id);
        if (!edge) continue;
        deleteCommands.push(createDeleteEdgeCommand(edge));
      }

      let nextHistory = state.historyStack;
      for (const command of deleteCommands) {
        nextHistory = pushHistory(nextHistory, command);
      }

      const meaningful = changes.some((c) => c.type !== 'select');
      return {
        edges: applyEdgeChanges(changes, state.edges),
        ...(meaningful ? { isDirty: true } : {}),
        ...(deleteCommands.length > 0
          ? { historyStack: nextHistory, redoStack: [] }
          : {}),
      };
    });
  },

  addNode: (node) => {
    const command = createAddNodeCommand(node);
    set((state) => ({
      ...command.do(state),
      historyStack: pushHistory(state.historyStack, command),
      redoStack: [],
      isDirty: true,
    }));
  },

  addEdge: (edge) => {
    const command = createAddEdgeCommand(edge);
    set((state) => ({
      ...command.do(state),
      historyStack: pushHistory(state.historyStack, command),
      redoStack: [],
      isDirty: true,
    }));
  },

  updateNodeData: (id, data) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;

    const before: Partial<WorkflowNodeData> = {};
    let hasChange = false;
    for (const [key, nextValue] of Object.entries(data)) {
      const prevValue = node.data[key];
      if (!Object.is(prevValue, nextValue)) {
        hasChange = true;
      }
      before[key as keyof WorkflowNodeData] = deepClone(prevValue as WorkflowNodeData[keyof WorkflowNodeData]);
    }
    if (!hasChange) return;

    const command = createUpdateNodeDataCommand(id, before, deepClone(data));
    set((state) => ({
      ...command.do(state),
      historyStack: pushHistory(state.historyStack, command),
      redoStack: [],
      isDirty: true,
    }));
  },

  deleteNode: (id) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === id);
    if (!node) return;
    const relatedEdges = state.edges.filter((e) => e.source === id || e.target === id);
    const command = createDeleteNodeCommand(node, relatedEdges);
    set((s) => ({
      ...command.do(s),
      historyStack: pushHistory(s.historyStack, command),
      redoStack: [],
      isDirty: true,
    }));
  },

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
      data: workflowNodeDataFromPayload(n),
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
        historyStack: [],
        redoStack: [],
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
      historyStack: [],
      redoStack: [],
      estimation: null,
      currentScenarioId: null,
      ui: { ...get().ui, needsLayout: true },
    });
  },
});
