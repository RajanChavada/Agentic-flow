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
  hasSeenBlankOverlay: boolean;
}

// Scaling params for what-if analysis
export interface ScalingParams {
  runsPerDay: number | null;
  loopIntensity: number;
}

// Re-export workflow types
export type WorkflowNode = Node<WorkflowNodeData>;
export type { BatchEstimateResult, ActualNodeStats, ProviderDetailed, ToolCategoryDetailed };

// ── Subscription / Paywall Types ─────────────────────────────────────────────

export type TierId = "free" | "starter" | "pro";

export type TierFeatures = {
  canvas_limit: number;          // -1 = unlimited
  dashboard_level: "basic" | "full";
  share_links: boolean;
  scaling_analysis: boolean;
  export_pdf: boolean;
  export_csv: boolean;
  export_markdown: boolean;
  export_code: boolean;
  scenario_comparison: boolean;
  marketplace_publish: boolean;
};

export const FREE_FEATURES: TierFeatures = {
  canvas_limit: 3,
  dashboard_level: "basic",
  share_links: false,
  scaling_analysis: false,
  export_pdf: false,
  export_csv: false,
  export_markdown: false,
  export_code: false,
  scenario_comparison: false,
  marketplace_publish: false,
};

export const STARTER_FEATURES: TierFeatures = {
  canvas_limit: 10,
  dashboard_level: "full",
  share_links: true,
  scaling_analysis: false,
  export_pdf: true,
  export_csv: true,
  export_markdown: true,
  export_code: false,
  scenario_comparison: false,
  marketplace_publish: false,
};

export const PRO_FEATURES: TierFeatures = {
  canvas_limit: 50,
  dashboard_level: "full",
  share_links: true,
  scaling_analysis: true,
  export_pdf: true,
  export_csv: true,
  export_markdown: true,
  export_code: true,
  scenario_comparison: true,
  marketplace_publish: true,
};
