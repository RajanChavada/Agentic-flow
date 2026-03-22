import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkflowNode from "../WorkflowNode";

const updateNodeData = vi.fn();

vi.mock("@/store/useWorkflowStore", () => ({
  useWorkflowStore: (selector: any) => {
    const state = { updateNodeData };
    return typeof selector === "function" ? selector(state) : state;
  },
  useEstimation: () => null,
  useWorkflowEdges: () => [],
}));

vi.mock("@xyflow/react", () => ({
  Handle: () => <div data-testid="handle" />,
  Position: {
    Top: "top",
    Right: "right",
    Bottom: "bottom",
    Left: "left",
  },
}));

describe("WorkflowNode agent card", () => {
  it("shows quick preview and bound tool chips for configured agent nodes", () => {
    render(
      <WorkflowNode
        {...({
          id: "agent-1",
          selected: false,
          data: {
            label: "Planner",
            type: "agentNode",
            modelProvider: "Anthropic",
            modelName: "Claude 3.5 Sonnet",
            taskType: "research",
            expectedOutputSize: "medium",
            quickEstimateCostPerCall: 0.00431,
            tools: [
              {
                id: "tool-1",
                displayName: "MCP Web Search",
                schemaTokens: 120,
                avgResponseTokens: 80,
                latencyMs: 90,
              },
              {
                id: "tool-2",
                displayName: "Supabase Query",
                schemaTokens: 140,
                avgResponseTokens: 70,
                latencyMs: 110,
              },
              {
                id: "tool-3",
                displayName: "Email Sender",
                schemaTokens: 100,
                avgResponseTokens: 60,
                latencyMs: 100,
              },
              {
                id: "tool-4",
                displayName: "Calendar Writer",
                schemaTokens: 90,
                avgResponseTokens: 55,
                latencyMs: 95,
              },
            ],
          },
        } as any)}
      />
    );

    expect(screen.getByText("Anthropic / Claude 3.5 Sonnet")).toBeInTheDocument();
    expect(screen.getByText("~$0.00431 / call")).toBeInTheDocument();
    expect(screen.getByText("🔧 MCP Web Search")).toBeInTheDocument();
    expect(screen.getByText("🔧 Supabase Query")).toBeInTheDocument();
    expect(screen.getByText("🔧 Email Sender")).toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("shows the placeholder when an agent has not been configured", () => {
    render(
      <WorkflowNode
        {...({
          id: "agent-2",
          selected: false,
          data: {
            label: "Agent",
            type: "agentNode",
          },
        } as any)}
      />
    );

    expect(screen.getByText("configure to estimate")).toBeInTheDocument();
  });
});
