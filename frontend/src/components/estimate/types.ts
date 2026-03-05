/**
 * Shared types for EstimatePanel sub-components.
 */
import type { WorkflowEstimation, NodeEstimation } from '@/types/workflow';

// Extended breakdown with node type info
export interface BreakdownWithType extends NodeEstimation {
  nodeType: string;
}

// Props passed to sub-components from parent EstimatePanel
export interface EstimatePanelContext {
  estimation: WorkflowEstimation;
  isDark: boolean;
  isFullscreen: boolean;
  heroTextClass: string;
}

// Section collapse state
export type SectionCollapseState = Record<
  'health' | 'breakdown' | 'cycles' | 'scaling' | 'observability',
  boolean
>;

// Colour maps (shared constants)
export const NODE_COLOURS: Record<string, string> = {
  agentNode: '#3b82f6',
  toolNode: '#f59e0b',
  startNode: '#22c55e',
  finishNode: '#ef4444',
};

export const DOT_COLOURS: Record<string, string> = {
  agentNode: 'bg-blue-500',
  toolNode: 'bg-amber-500',
  startNode: 'bg-green-500',
  finishNode: 'bg-red-500',
};
