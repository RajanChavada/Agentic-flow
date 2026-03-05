# Plan: Zustand Store Splitting

**Phase:** 0 - Foundation
**Requirement(s):** FNDX-01
**Depends on:** 00-1-PLAN.md (need test framework to verify refactor)

## Goal

Split the monolithic 967-line `useWorkflowStore.ts` into 4 domain-specific slices (workflow, estimation, ui, persistence) while preserving all 16 existing selector hooks and ensuring zero changes in consuming components.

## Tasks

### Task 1: Create Slice Directory Structure and Utility Files

**Files:**
- `frontend/src/store/slices/` (create directory)
- `frontend/src/store/utils.ts` (create)
- `frontend/src/store/types.ts` (create)

**Action:**

1. Create the slices directory:

```bash
mkdir -p frontend/src/store/slices
```

2. Create `frontend/src/store/types.ts` with shared type definitions:

```typescript
/**
 * Shared types for store slices.
 * Extracted from useWorkflowStore.ts to avoid circular dependencies.
 */
import type { Node, Edge } from '@xyflow/react';
import type {
  WorkflowNodeData,
  WorkflowEstimation,
  WorkflowScenario,
  BatchEstimateResult,
  ActualNodeStats,
  ProviderDetailed,
  ToolCategoryDetailed,
} from '@/types/workflow';

// Forward exports for slice use
export type { WorkflowNodeData, WorkflowEstimation, WorkflowScenario };

// UI state shape (matches existing)
export interface UIState {
  isConfigModalOpen: boolean;
  isEstimatePanelOpen: boolean;
  isComparisonOpen: boolean;
  errorBanner?: string;
  successMessage?: string;
  theme: 'light' | 'dark';
  needsLayout: boolean;
}

// Scaling params for what-if analysis
export interface ScalingParams {
  runsPerDay: number | null;
  loopIntensity: number;
}

// Re-export workflow types
export type WorkflowNode = Node<WorkflowNodeData>;
export type { BatchEstimateResult, ActualNodeStats, ProviderDetailed, ToolCategoryDetailed };
```

3. Create `frontend/src/store/utils.ts` with helper functions:

```typescript
/**
 * Shared utility functions for store slices.
 * Extracted from useWorkflowStore.ts lines 174-198.
 */
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData, NodeConfigPayload, EdgeConfigPayload } from '@/types/workflow';

/** Convert canvas nodes to backend payload format. */
export function nodesToPayload(nodes: Node<WorkflowNodeData>[]): NodeConfigPayload[] {
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

/** Convert canvas edges to backend payload format. */
export function edgesToPayload(edges: Edge[]): EdgeConfigPayload[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
}
```

**Verification:**
- [ ] `ls frontend/src/store/slices` shows empty directory
- [ ] `npx tsc --noEmit` passes (types file compiles)

---

### Task 2: Create the Four Slices

**Files:**
- `frontend/src/store/slices/workflowSlice.ts` (create)
- `frontend/src/store/slices/estimationSlice.ts` (create)
- `frontend/src/store/slices/uiSlice.ts` (create)
- `frontend/src/store/slices/persistenceSlice.ts` (create)

**Action:**

Extract slices from the current monolith. Each slice follows the `StateCreator<CombinedState, [], [], ThisSlice>` pattern.

**workflowSlice.ts** - Nodes, edges, selection, graph operations:

```typescript
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
```

**estimationSlice.ts** - Estimation, scenarios, scaling, comparison (similar pattern - extract from original lines 59-70, 100-111, 311-417, 527-535):

The estimation slice should contain:
- `estimation`, `scalingParams`, `actualStats`
- `scenarios`, `currentScenarioId`, `selectedForComparison`, `comparisonResults`
- All scenario management actions (saveCurrentScenario, loadScenario, deleteScenario, duplicateScenario, toggleComparisonSelection)
- Estimation/stats actions (setEstimation, clearEstimation, setRunsPerDay, setLoopIntensity, setActualStats, clearActualStats)

**uiSlice.ts** - UI state (extract from lines 35-45, 499-525):

The UI slice should contain:
- `ui` object with modal/panel state, theme, needsLayout
- All UI toggle actions (openConfigModal, closeConfigModal, toggleEstimatePanel, toggleComparisonDrawer, setErrorBanner, setSuccessMessage, toggleTheme, setNeedsLayout)

**persistenceSlice.ts** - Supabase persistence (extract from lines 71-72, 141-172, 577-948):

The persistence slice should contain:
- `currentWorkflowId`, `currentWorkflowName`, `isDirty`, `activeCanvasId`
- `supabaseLoading`, `isSaving`, `lastSavedAt`, `thumbnailCaptureRequested`
- `providerData`, `toolCategoryData`, `isLoadingProviders`, `isLoadingTools`
- `showNameWorkflowModal`
- All persistence actions (setCurrentWorkflow, clearCurrentWorkflow, markDirty, saveWorkflowToSupabase, loadWorkflowsFromSupabase, etc.)
- API cache actions (fetchProviders, fetchTools)
- Guest persistence (snapshotToLocalStorage, restoreFromLocalStorage)
- Marketplace (loadTemplateOntoCanvas)

**Implementation note:** Due to length, create each slice file following the exact pattern shown for workflowSlice. Extract the relevant state and actions from the original file, update the `StateCreator` type signature, and ensure cross-slice access uses `get()`.

**Verification:**
- [ ] All 4 slice files exist in `frontend/src/store/slices/`
- [ ] `npx tsc --noEmit` passes (all slices compile)

---

### Task 3: Update Main Store to Combine Slices and Re-Export Hooks

**Files:**
- `frontend/src/store/useWorkflowStore.ts` (rewrite)
- `frontend/src/store/__tests__/useWorkflowStore.test.ts` (update if needed)

**Action:**

Replace the monolithic store with a slim combiner file:

```typescript
/**
 * Zustand store - single source of truth for workflow state.
 *
 * Combines domain-specific slices and re-exports selector hooks.
 * NO component changes required - all existing hooks work unchanged.
 */
import { create } from 'zustand';

// Import slice creators
import { createWorkflowSlice, WorkflowSlice } from './slices/workflowSlice';
import { createEstimationSlice, EstimationSlice } from './slices/estimationSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createPersistenceSlice, PersistenceSlice } from './slices/persistenceSlice';

// Combined store type
export type WorkflowStore = WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice;

// Create store by spreading slice creators
export const useWorkflowStore = create<WorkflowStore>()((...a) => ({
  ...createWorkflowSlice(...a),
  ...createEstimationSlice(...a),
  ...createUISlice(...a),
  ...createPersistenceSlice(...a),
}));

// ── Selector hooks (fine-grained subscriptions) ──────────────
// CRITICAL: These MUST match the current exports exactly for backward compatibility

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
export const useProviderData = () => useWorkflowStore((s) => s.providerData);
export const useToolCategoryData = () => useWorkflowStore((s) => s.toolCategoryData);
export const useCurrentWorkflowId = () => useWorkflowStore((s) => s.currentWorkflowId);
export const useCurrentWorkflowName = () => useWorkflowStore((s) => s.currentWorkflowName);
export const useIsDirty = () => useWorkflowStore((s) => s.isDirty);
export const useActiveCanvasId = () => useWorkflowStore((s) => s.activeCanvasId);
```

**Verification:**
- [ ] `npx tsc --noEmit` passes (no type errors in components)
- [ ] `cd frontend && npm run test:run` passes (smoke tests still work)
- [ ] `cd frontend && npm run dev` starts without errors

---

## Verification Checklist

- [ ] `ls frontend/src/store/slices/` shows 4 slice files: `workflowSlice.ts`, `estimationSlice.ts`, `uiSlice.ts`, `persistenceSlice.ts`
- [ ] `frontend/src/store/utils.ts` exists with `nodesToPayload` and `edgesToPayload`
- [ ] `frontend/src/store/useWorkflowStore.ts` is under 100 lines (combiner only)
- [ ] `cd frontend && npx tsc --noEmit` passes
- [ ] `cd frontend && npm run test:run` passes
- [ ] `cd frontend && npm run dev` starts and app renders without console errors
- [ ] All 16 selector hooks are still exported from `useWorkflowStore.ts`

## Success Criteria

- Store is split into 4 domain-specific slices in `src/store/slices/`
- Main store file combines slices and exports all 16 existing selector hooks
- Zero changes required in consuming components (EstimatePanel, Canvas, etc.)
- User can add/remove nodes without visible UI lag
- All existing smoke tests pass
