/**
 * Zustand store -- single source of truth for workflow state.
 *
 * Composed from four domain slices:
 *   workflowSlice   - nodes, edges, graph operations
 *   estimationSlice  - estimation, scenarios, scaling, comparison
 *   uiSlice          - modals, panels, theme, layout state
 *   persistenceSlice - Supabase CRUD, guest storage, API cache
 *
 * Selector hooks exported at the bottom for fine-grained subscriptions.
 */

import { create } from 'zustand';
import { createWorkflowSlice, type WorkflowSlice } from './slices/workflowSlice';
import { createEstimationSlice, type EstimationSlice } from './slices/estimationSlice';
import { createUISlice, type UISlice } from './slices/uiSlice';
import { createPersistenceSlice, type PersistenceSlice } from './slices/persistenceSlice';

export type WorkflowStore = WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice;

export const useWorkflowStore = create<WorkflowStore>()((...a) => ({
  ...createWorkflowSlice(...a),
  ...createEstimationSlice(...a),
  ...createUISlice(...a),
  ...createPersistenceSlice(...a),
}));

// ── Selector hooks (fine-grained subscriptions) ──────────────
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
export const useSidebarOpen = () => useWorkflowStore((s) => s.ui.isSidebarOpen);
export const useHasSeenOverlay = () => useWorkflowStore((s) => s.ui.hasSeenBlankOverlay);
export const useIsRefineBarOpen = () => useWorkflowStore((s) => s.ui.isRefineBarOpen);
