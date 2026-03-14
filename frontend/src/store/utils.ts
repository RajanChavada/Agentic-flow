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
    condition_expression: (n.data.conditionExpression as string | undefined) ?? null,
    probability: (n.data.probability as number | undefined) ?? null,
  }));
}

/** Convert canvas edges to backend payload format. */
export function edgesToPayload(edges: Edge[]): EdgeConfigPayload[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    source_handle: e.sourceHandle ?? null,
  }));
}
