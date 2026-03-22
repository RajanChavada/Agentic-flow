import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CanvasMetadataOverlay } from "../CanvasMetadataOverlay";
import type { GraphMetrics } from "@/lib/graphAnalysis";
import * as graphAnalysis from "@/lib/graphAnalysis";
import * as store from "@/store/useWorkflowStore";

// Mock dependencies
vi.mock("@/lib/graphAnalysis", () => ({
  analyzeGraph: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  CheckCircle2: () => <span data-testid="check-circle-icon" />,
  XCircle: () => <span data-testid="x-circle-icon" />,
  Minus: () => <span data-testid="minus-icon" />,
}));

vi.mock("@/store/useWorkflowStore", () => ({
  useWorkflowStore: vi.fn(),
  useEstimation: vi.fn(),
}));

describe("CanvasMetadataOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("memoizes graph analysis", () => {
    const mockNodes = [{ id: "1", type: "startNode", data: { type: "startNode", label: "Start" }, position: { x: 0, y: 0 } }];
    const mockEdges = [{ id: "e1", source: "1", target: "2" }];

    // Mock store to return nodes and edges
    vi.mocked(store.useWorkflowStore).mockImplementation((selector: any) => {
      const state = { nodes: mockNodes, edges: mockEdges };
      return selector(state);
    });

    // Mock analyzeGraph return value
    const mockMetrics: GraphMetrics = {
      nodeCount: 1,
      workflowNodeCount: 1,
      nonTerminalNodeCount: 0,
      maxDepth: 0,
      loopCount: 0,
      branchCount: 0,
      hasParallelFork: false,
      complexityScore: 0,
      complexityLevel: "Low",
      toolRiskSurface: { read: 0, write: 0, exec: 0, network: 0, other: 0 },
      riskScore: 0,
      riskLevel: "Low",
    };
    vi.mocked(graphAnalysis.analyzeGraph).mockReturnValue(mockMetrics);

    // First render
    const { rerender } = render(<CanvasMetadataOverlay />);
    expect(graphAnalysis.analyzeGraph).toHaveBeenCalledTimes(1);
    expect(graphAnalysis.analyzeGraph).toHaveBeenCalledWith(mockNodes, mockEdges);

    // Rerender with same node/edge references (useMemo should cache)
    rerender(<CanvasMetadataOverlay />);
    expect(graphAnalysis.analyzeGraph).toHaveBeenCalledTimes(1); // Still 1 - memoized!

    // Update nodes reference - should trigger recomputation
    const newNodes = [{ id: "2", type: "agentNode", data: { type: "agentNode", label: "Agent" }, position: { x: 100, y: 0 } }];
    vi.mocked(store.useWorkflowStore).mockImplementation((selector: any) => {
      const state = { nodes: newNodes, edges: mockEdges };
      return selector(state);
    });

    rerender(<CanvasMetadataOverlay />);
    expect(graphAnalysis.analyzeGraph).toHaveBeenCalledTimes(2); // Now 2 - nodes changed!
    expect(graphAnalysis.analyzeGraph).toHaveBeenLastCalledWith(newNodes, mockEdges);
  });

  it("renders metric values from analyzeGraph", () => {
    const mockNodes = [{ id: "1", type: "startNode", data: { type: "startNode", label: "Start" }, position: { x: 0, y: 0 } }];
    const mockEdges = [{ id: "e1", source: "1", target: "2" }];

    // Mock store
    vi.mocked(store.useWorkflowStore).mockImplementation((selector: any) => {
      const state = { nodes: mockNodes, edges: mockEdges };
      return selector(state);
    });
    vi.mocked(store.useEstimation).mockReturnValue(null as any);

    // Mock analyzeGraph with specific metrics
    const mockMetrics: GraphMetrics = {
      nodeCount: 7,
      workflowNodeCount: 5,
      nonTerminalNodeCount: 5,
      maxDepth: 3,
      loopCount: 1,
      branchCount: 2,
      hasParallelFork: true,
      complexityScore: 3,
      complexityLevel: "Medium",
      toolRiskSurface: { read: 1, write: 2, exec: 1, network: 1, other: 0 },
      riskScore: 6,
      riskLevel: "Medium",
    };
    vi.mocked(graphAnalysis.analyzeGraph).mockReturnValue(mockMetrics);
    vi.mocked(store.useEstimation).mockReturnValue({
      complexity_score: 3,
      complexity_label: "Medium",
    } as any);

    render(<CanvasMetadataOverlay />);

    // Verify rendered metrics
    expect(screen.getByText("nodes: 5")).toBeDefined();
    expect(screen.getByText("depth: 3")).toBeDefined();
    expect(screen.getByText("loops: 1")).toBeDefined();
    expect(screen.getByText("branches: 2")).toBeDefined();
    expect(screen.getByText("complexity:")).toBeDefined();
    expect(screen.getByText("Medium")).toBeDefined();
  });


});
