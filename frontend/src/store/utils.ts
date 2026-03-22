/**
 * Shared utility functions for store slices.
 * Extracted from useWorkflowStore.ts lines 174-198.
 */
import type { Node, Edge } from '@xyflow/react';
import type {
  WorkflowNodeData,
  NodeConfigPayload,
  EdgeConfigPayload,
  WorkflowToolBinding,
  NodeToolBindingPayload,
} from '@/types/workflow';

function toolsToPayload(tools?: WorkflowToolBinding[] | null): NodeToolBindingPayload[] | null {
  if (!tools) return null;
  return tools.map((tool) => ({
    id: tool.id,
    display_name: tool.displayName || tool.id,
    schema_tokens: tool.schemaTokens,
    avg_response_tokens: tool.avgResponseTokens,
    latency_ms: tool.latencyMs,
  }));
}

export function workflowNodeDataFromPayload(payload: NodeConfigPayload): WorkflowNodeData {
  return {
    label: payload.label ?? payload.type,
    type: payload.type,
    modelProvider: payload.model_provider,
    modelName: payload.model_name,
    context: payload.context,
    toolId: payload.tool_id,
    toolCategory: payload.tool_category,
    maxSteps: payload.max_steps ?? null,
    maxOutputTokens: payload.max_output_tokens ?? null,
    temperature: payload.temperature ?? null,
    retryBudget: payload.retry_budget ?? null,
    tools: payload.tools?.map((tool) => ({
      id: tool.id,
      displayName: tool.display_name || tool.id,
      schemaTokens: tool.schema_tokens,
      avgResponseTokens: tool.avg_response_tokens,
      latencyMs: tool.latency_ms,
    })),
    quickEstimateCostPerCall: payload.quick_estimate_cost_per_call ?? null,
    quickEstimateLatencyMs: payload.quick_estimate_latency_ms ?? null,
    taskType: payload.task_type ?? undefined,
    expectedOutputSize: payload.expected_output_size ?? undefined,
    expectedCallsPerRun: payload.expected_calls_per_run ?? undefined,
    conditionExpression: payload.condition_expression ?? undefined,
    probability: payload.probability ?? undefined,
  };
}

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
    max_output_tokens: (n.data.maxOutputTokens as number | null | undefined) ?? null,
    temperature: (n.data.temperature as number | null | undefined) ?? null,
    retry_budget: (n.data.retryBudget as number | null | undefined) ?? null,
    tools: toolsToPayload(n.data.tools as WorkflowToolBinding[] | null | undefined),
    quick_estimate_cost_per_call: (n.data.quickEstimateCostPerCall as number | null | undefined) ?? null,
    quick_estimate_latency_ms: (n.data.quickEstimateLatencyMs as number | null | undefined) ?? null,
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
