import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";
import { nodesToPayload, workflowNodeDataFromPayload } from "../utils";

describe("workflow payload helpers", () => {
  it("preserves the new agent fields in node payloads", () => {
    const nodes: Node<WorkflowNodeData>[] = [
      {
        id: "agent-1",
        type: "agentNode",
        position: { x: 0, y: 0 },
        data: {
          label: "Planner",
          type: "agentNode",
          modelProvider: "Anthropic",
          modelName: "Claude 3.5 Sonnet",
          maxOutputTokens: 1024,
          temperature: 1.2,
          retryBudget: 3,
          tools: [
            {
              id: "tool-1",
              displayName: "MCP Web Search",
              schemaTokens: 120,
              avgResponseTokens: 80,
              latencyMs: 90,
            },
          ],
          quickEstimateCostPerCall: 0.00431,
          quickEstimateLatencyMs: 180,
        },
      },
    ];

    const payload = nodesToPayload(nodes);

    expect(payload[0].max_output_tokens).toBe(1024);
    expect(payload[0].temperature).toBe(1.2);
    expect(payload[0].retry_budget).toBe(3);
    expect(payload[0].quick_estimate_cost_per_call).toBe(0.00431);
    expect(payload[0].quick_estimate_latency_ms).toBe(180);
    expect(payload[0].tools?.[0]).toEqual({
      id: "tool-1",
      display_name: "MCP Web Search",
      schema_tokens: 120,
      avg_response_tokens: 80,
      latency_ms: 90,
    });
  });

  it("round-trips payload agent fields back to node data", () => {
    const data = workflowNodeDataFromPayload({
      id: "agent-1",
      type: "agentNode",
      label: "Planner",
      model_provider: "Anthropic",
      model_name: "Claude 3.5 Sonnet",
      max_output_tokens: 1024,
      temperature: 1.2,
      retry_budget: 3,
      tools: [
        {
          id: "tool-1",
          display_name: "MCP Web Search",
          schema_tokens: 120,
          avg_response_tokens: 80,
          latency_ms: 90,
        },
      ],
      quick_estimate_cost_per_call: 0.00431,
      quick_estimate_latency_ms: 180,
    });

    expect(data.maxOutputTokens).toBe(1024);
    expect(data.temperature).toBe(1.2);
    expect(data.retryBudget).toBe(3);
    expect(data.quickEstimateCostPerCall).toBe(0.00431);
    expect(data.quickEstimateLatencyMs).toBe(180);
    expect(data.tools?.[0]).toEqual({
      id: "tool-1",
      displayName: "MCP Web Search",
      schemaTokens: 120,
      avgResponseTokens: 80,
      latencyMs: 90,
    });
  });
});
