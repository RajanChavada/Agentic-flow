/**
 * Comprehensive unit tests for graphAnalysis.ts
 * Covers all graph topologies: empty, linear, diamond, cyclic, disconnected, high-risk, condition branching, reachability
 */

import { describe, it, expect } from "vitest";
import { analyzeGraph } from "../graphAnalysis";
import {
  emptyGraph,
  singleStartNode,
  linearChain,
  diamondGraph,
  cyclicGraph,
  disconnectedCyclicGraph,
  highRiskGraph,
  conditionBranchGraph,
  withToolNodes,
  withIdealState,
  withAnnotations,
  selfLoopGraph,
} from "./fixtures/mockGraphs";

describe("graphAnalysis", () => {
  describe("Node Count (META-01)", () => {
    it("returns 0 for empty graph", () => {
      const { nodes, edges } = emptyGraph();
      const result = analyzeGraph(nodes, edges);

      expect(result.nodeCount).toBe(0);
      expect(result.workflowNodeCount).toBe(0);
    });

    it("counts total nodes including annotations", () => {
      const { nodes, edges } = withAnnotations();
      const result = analyzeGraph(nodes, edges);

      // 4 workflow nodes (start, agent1, agent2, finish) + 2 annotations (blank, text) = 6 total
      expect(result.nodeCount).toBe(6);
      expect(result.workflowNodeCount).toBe(4);
    });

    it("excludes blankBoxNode and textNode from workflowNodeCount", () => {
      const { nodes, edges } = withAnnotations();
      const result = analyzeGraph(nodes, edges);

      // Only workflow nodes: start, agent1, agent2, finish
      expect(result.workflowNodeCount).toBe(4);
    });
  });

  describe("Max Depth (META-01)", () => {
    it("returns 0 for empty graph", () => {
      const { nodes, edges } = emptyGraph();
      const result = analyzeGraph(nodes, edges);

      expect(result.maxDepth).toBe(0);
    });

    it("returns 0 for single startNode with no edges", () => {
      const { nodes, edges } = singleStartNode();
      const result = analyzeGraph(nodes, edges);

      expect(result.maxDepth).toBe(0);
    });

    it("computes depth for linear chain: start->agent->finish", () => {
      const { nodes, edges } = linearChain(3);
      const result = analyzeGraph(nodes, edges);

      // start(0) -> agent(1) -> finish(2)
      expect(result.maxDepth).toBe(2);
    });

    it("computes depth for diamond graph: start->(A,B)->finish", () => {
      const { nodes, edges } = diamondGraph();
      const result = analyzeGraph(nodes, edges);

      // start(0) -> A/B(1) -> finish(2)
      expect(result.maxDepth).toBe(2);
    });

    it("computes depth for deep chain (depth > 5)", () => {
      const { nodes, edges } = linearChain(8);
      const result = analyzeGraph(nodes, edges);

      // start + 6 intermediate nodes + finish = depth 7
      expect(result.maxDepth).toBe(7);
    });

    it("returns 0 when no startNode is present", () => {
      const { nodes, edges } = emptyGraph();
      // Add non-start nodes
      nodes.push({
        id: "agent",
        type: "agentNode",
        data: { label: "Agent", type: "agentNode" },
        position: { x: 0, y: 0 },
      });

      const result = analyzeGraph(nodes, edges);
      expect(result.maxDepth).toBe(0);
    });

    it("computes longest path for condition branching", () => {
      const { nodes, edges } = conditionBranchGraph();
      const result = analyzeGraph(nodes, edges);

      // start(0) -> condition(1) -> true/false_branch(2) -> finish(3)
      expect(result.maxDepth).toBe(3);
    });
  });

  describe("Cycle Detection (META-01)", () => {
    it("returns 0 loops for linear DAG", () => {
      const { nodes, edges } = linearChain(5);
      const result = analyzeGraph(nodes, edges);

      expect(result.loopCount).toBe(0);
    });

    it("detects cycle: A->B->A", () => {
      const { nodes, edges } = cyclicGraph();
      const result = analyzeGraph(nodes, edges);

      expect(result.loopCount).toBe(1);
    });

    it("detects cycle in disconnected subgraph", () => {
      const { nodes, edges } = disconnectedCyclicGraph();
      const result = analyzeGraph(nodes, edges);

      // Should find the X->Y->X cycle even though it's not connected to start
      expect(result.loopCount).toBe(1);
    });

    it("detects self-loop: A->A", () => {
      const { nodes, edges } = selfLoopGraph();
      const result = analyzeGraph(nodes, edges);

      expect(result.loopCount).toBe(1);
    });

    it("detects multiple independent cycles", () => {
      const { nodes, edges } = disconnectedCyclicGraph();

      // Add another cycle in the main graph
      edges.push({
        id: "e-finish-main",
        source: "finish",
        target: "main",
      });

      const result = analyzeGraph(nodes, edges);

      // Should detect 2 cycles: main<->finish and x<->y
      expect(result.loopCount).toBe(2);
    });
  });

  describe("Tool Risk Surface (META-02)", () => {
    it("returns zero surface for no tool nodes", () => {
      const { nodes, edges } = linearChain(3);
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface).toEqual({
        read: 0,
        write: 0,
        exec: 0,
        network: 0,
        other: 0,
      });
    });

    it("maps retrieval -> read", () => {
      const { nodes, edges } = withToolNodes(["retrieval"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface.read).toBe(1);
    });

    it("maps database -> write", () => {
      const { nodes, edges } = withToolNodes(["database"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface.write).toBe(1);
    });

    it("maps code_execution -> exec", () => {
      const { nodes, edges } = withToolNodes(["code_execution"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface.exec).toBe(1);
    });

    it("maps api -> network", () => {
      const { nodes, edges } = withToolNodes(["api"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface.network).toBe(1);
    });

    it("maps mcp_server -> network", () => {
      const { nodes, edges } = withToolNodes(["mcp_server"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface.network).toBe(1);
    });

    it("maps unknown category -> other", () => {
      const { nodes, edges } = withToolNodes(["unknown_category"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface.other).toBe(1);
    });

    it("maps tool with no category -> other", () => {
      const { nodes, edges } = withToolNodes([""]);
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface.other).toBe(1);
    });

    it("correctly counts mixed tool categories", () => {
      const { nodes, edges } = withToolNodes([
        "retrieval",
        "retrieval",
        "code_execution",
        "api",
      ]);
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface).toEqual({
        read: 2,
        write: 0,
        exec: 1,
        network: 1,
        other: 0,
      });
    });
  });

  describe("Risk Score (META-03)", () => {
    it("returns score 0 and Low level for empty graph", () => {
      const { nodes, edges } = emptyGraph();
      const result = analyzeGraph(nodes, edges);

      expect(result.riskScore).toBe(0);
      expect(result.riskLevel).toBe("Low");
    });

    it("returns score 0 and Low level for minimal safe graph", () => {
      const { nodes, edges } = linearChain(3);
      const result = analyzeGraph(nodes, edges);

      expect(result.riskScore).toBe(0);
      expect(result.riskLevel).toBe("Low");
    });

    it("adds +2 for exec tool", () => {
      const { nodes, edges } = withToolNodes(["code_execution"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.riskScore).toBe(2);
      expect(result.riskLevel).toBe("Low"); // 0-3 is Low
    });

    it("adds +4 for two exec tools (threshold to Medium)", () => {
      const { nodes, edges } = withToolNodes(["code_execution", "code_execution"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.riskScore).toBe(4);
      expect(result.riskLevel).toBe("Medium"); // 4-7 is Medium
    });

    it("adds +1 for write tool", () => {
      const { nodes, edges } = withToolNodes(["database"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.riskScore).toBe(1);
      expect(result.riskLevel).toBe("Low");
    });

    it("adds +2 for network tool", () => {
      const { nodes, edges } = withToolNodes(["api"]);
      const result = analyzeGraph(nodes, edges);

      expect(result.riskScore).toBe(2);
      expect(result.riskLevel).toBe("Low");
    });

    it("reaches High level (8+) with exec + network tools", () => {
      const { nodes, edges } = withToolNodes([
        "code_execution",
        "code_execution",
        "api",
        "api",
      ]);
      const result = analyzeGraph(nodes, edges);

      // 2*exec(4) + 2*network(4) = 8
      expect(result.riskScore).toBe(8);
      expect(result.riskLevel).toBe("High");
    });

    it("adds +2 for depth > 5", () => {
      const { nodes, edges } = linearChain(8);
      const result = analyzeGraph(nodes, edges);

      // Depth is 7 (> 5) -> +2 points
      expect(result.riskScore).toBe(2);
      expect(result.riskLevel).toBe("Low");
    });

    it("adds +2 for any loops", () => {
      const { nodes, edges } = cyclicGraph();
      const result = analyzeGraph(nodes, edges);

      // 1 loop -> +2 points
      expect(result.riskScore).toBe(2);
      expect(result.riskLevel).toBe("Low");
    });

    it("adds +1 for total workflow nodes > 15", () => {
      const { nodes, edges } = highRiskGraph();
      const result = analyzeGraph(nodes, edges);

      // Has 17 workflow nodes -> +1 point (plus other factors)
      // Should be High risk overall
      expect(result.riskScore).toBeGreaterThanOrEqual(1);
      expect(result.riskLevel).toBe("High");
    });

    it("combines multiple risk factors correctly", () => {
      const { nodes, edges } = highRiskGraph();
      const result = analyzeGraph(nodes, edges);

      // High risk graph has:
      // - 2 exec tools (+4)
      // - 1 api tool (+2)
      // - 1 database tool (+1)
      // - depth > 5 (+2)
      // - loops (+2)
      // - nodes > 15 (+1)
      // Total = 12 -> High
      expect(result.riskScore).toBeGreaterThanOrEqual(8);
      expect(result.riskLevel).toBe("High");
    });

    it("applies correct thresholds: Low 0-3", () => {
      const { nodes, edges } = withToolNodes(["database"]); // +1
      const result = analyzeGraph(nodes, edges);

      expect(result.riskScore).toBe(1);
      expect(result.riskLevel).toBe("Low");
    });

    it("applies correct thresholds: Medium 4-7", () => {
      const { nodes, edges } = withToolNodes([
        "code_execution",
        "database",
        "database",
      ]); // 2+1+1 = 4
      const result = analyzeGraph(nodes, edges);

      expect(result.riskScore).toBe(4);
      expect(result.riskLevel).toBe("Medium");
    });

    it("applies correct thresholds: High 8+", () => {
      const { nodes, edges } = withToolNodes([
        "code_execution",
        "code_execution",
        "api",
        "api",
      ]); // 2+2+2+2 = 8
      const result = analyzeGraph(nodes, edges);

      expect(result.riskScore).toBe(8);
      expect(result.riskLevel).toBe("High");
    });
  });

  describe("Reachability (META-04, ESTM-04)", () => {
    it("returns null when no idealStateNode on canvas", () => {
      const { nodes, edges } = linearChain(3);
      const result = analyzeGraph(nodes, edges);

      expect(result.idealStateReachable).toBeNull();
    });

    it("returns false when no startNode but idealStateNode present", () => {
      const { nodes, edges } = emptyGraph();

      // Add only ideal state node (no start)
      nodes.push({
        id: "idealState",
        type: "finishNode",
        data: { label: "Ideal State", type: "finishNode" },
        position: { x: 0, y: 0 },
      });

      const result = analyzeGraph(nodes, edges);
      expect(result.idealStateReachable).toBe(false);
    });

    it("returns true when idealState is reachable from start", () => {
      const { nodes, edges } = withIdealState(true);
      const result = analyzeGraph(nodes, edges);

      expect(result.idealStateReachable).toBe(true);
    });

    it("returns false when idealState is disconnected", () => {
      const { nodes, edges } = withIdealState(false);
      const result = analyzeGraph(nodes, edges);

      expect(result.idealStateReachable).toBe(false);
    });

    it("returns true when reachable through condition branch", () => {
      const { nodes, edges } = conditionBranchGraph();

      // Rename finish to idealState
      const finishNode = nodes.find((n) => n.id === "finish");
      if (finishNode) {
        finishNode.id = "idealState";
        finishNode.data.label = "Ideal State";
      }

      // Update edge targets
      edges.forEach((e) => {
        if (e.target === "finish") e.target = "idealState";
      });

      const result = analyzeGraph(nodes, edges);
      expect(result.idealStateReachable).toBe(true);
    });

    it("returns true when reachable through multiple hops", () => {
      const { nodes, edges } = linearChain(6);

      // Rename finish to idealState
      const finishNode = nodes.find((n) => n.id === "finish");
      if (finishNode) {
        finishNode.id = "idealState";
        finishNode.data.label = "Ideal State";
      }

      // Update edge targets
      edges.forEach((e) => {
        if (e.target === "finish") e.target = "idealState";
      });

      const result = analyzeGraph(nodes, edges);
      expect(result.idealStateReachable).toBe(true);
    });

    it("returns false when both start and idealState exist but no edges", () => {
      const { nodes } = emptyGraph();

      nodes.push(
        {
          id: "start",
          type: "startNode",
          data: { label: "Start", type: "startNode" },
          position: { x: 0, y: 0 },
        },
        {
          id: "idealState",
          type: "finishNode",
          data: { label: "Ideal State", type: "finishNode" },
          position: { x: 100, y: 0 },
        }
      );

      const result = analyzeGraph(nodes, []);
      expect(result.idealStateReachable).toBe(false);
    });
  });

  describe("GraphMetrics interface", () => {
    it("returns all required fields in correct shape", () => {
      const { nodes, edges } = linearChain(3);
      const result = analyzeGraph(nodes, edges);

      expect(result).toHaveProperty("nodeCount");
      expect(result).toHaveProperty("workflowNodeCount");
      expect(result).toHaveProperty("maxDepth");
      expect(result).toHaveProperty("loopCount");
      expect(result).toHaveProperty("toolRiskSurface");
      expect(result).toHaveProperty("riskScore");
      expect(result).toHaveProperty("riskLevel");
      expect(result).toHaveProperty("idealStateReachable");

      expect(typeof result.nodeCount).toBe("number");
      expect(typeof result.workflowNodeCount).toBe("number");
      expect(typeof result.maxDepth).toBe("number");
      expect(typeof result.loopCount).toBe("number");
      expect(typeof result.toolRiskSurface).toBe("object");
      expect(typeof result.riskScore).toBe("number");
      expect(["Low", "Medium", "High"]).toContain(result.riskLevel);
      expect([true, false, null]).toContain(result.idealStateReachable);
    });

    it("toolRiskSurface has correct structure", () => {
      const { nodes, edges } = emptyGraph();
      const result = analyzeGraph(nodes, edges);

      expect(result.toolRiskSurface).toHaveProperty("read");
      expect(result.toolRiskSurface).toHaveProperty("write");
      expect(result.toolRiskSurface).toHaveProperty("exec");
      expect(result.toolRiskSurface).toHaveProperty("network");
      expect(result.toolRiskSurface).toHaveProperty("other");

      expect(typeof result.toolRiskSurface.read).toBe("number");
      expect(typeof result.toolRiskSurface.write).toBe("number");
      expect(typeof result.toolRiskSurface.exec).toBe("number");
      expect(typeof result.toolRiskSurface.network).toBe("number");
      expect(typeof result.toolRiskSurface.other).toBe("number");
    });
  });
});
