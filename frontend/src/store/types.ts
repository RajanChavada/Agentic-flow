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
  isSidebarOpen: boolean;
}

// Scaling params for what-if analysis
export interface ScalingParams {
  runsPerDay: number | null;
  loopIntensity: number;
}

// Re-export workflow types
export type WorkflowNode = Node<WorkflowNodeData>;
export type { BatchEstimateResult, ActualNodeStats, ProviderDetailed, ToolCategoryDetailed };
