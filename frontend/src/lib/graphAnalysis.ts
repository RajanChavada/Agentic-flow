/**
 * Graph analysis utility for computing canvas metadata metrics.
 * Pure functions operating on React Flow Node[] and Edge[] arrays.
 *
 * Computes: node count, max depth, loop count, branches, complexity,
 * plus legacy risk metrics used by existing parts of the app.
 */

import type { Node, Edge } from "@xyflow/react";
import type { WorkflowNodeData } from "../types/workflow";

/**
 * Tool risk surface breakdown by category
 */
export interface ToolRiskSurface {
  read: number;      // retrieval tools
  write: number;     // database tools
  exec: number;      // code_execution tools
  network: number;   // api + mcp_server tools
  other: number;     // unknown/uncategorized tools
}

/**
 * Complete graph metrics analysis result
 */
export interface GraphMetrics {
  nodeCount: number;                    // total nodes including annotations
  workflowNodeCount: number;            // excludes blankBoxNode, textNode
  nonTerminalNodeCount: number;         // all non-startNode/non-finishNode canvas nodes
  maxDepth: number;                     // longest Start -> Finish path in hops
  loopCount: number;                    // number of cycles detected via DFS
  branchCount: number;                  // number of condition nodes
  hasParallelFork: boolean;             // true if any node has >1 outgoing edge
  complexityScore: number;              // additive complexity score
  complexityLevel: "Low" | "Medium" | "High" | "Very High";
  toolRiskSurface: ToolRiskSurface;     // tool category breakdown
  riskScore: number;                    // aggregate point score
  riskLevel: "Low" | "Medium" | "High"; // risk threshold classification
}

/**
 * Tool category to risk bucket mapping
 */
const RISK_CATEGORY_MAP: Record<string, keyof ToolRiskSurface> = {
  retrieval: "read",
  database: "write",
  code_execution: "exec",
  api: "network",
  mcp_server: "network",
};

/**
 * Main analysis function - computes all graph metrics
 */
export function analyzeGraph(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[]
): GraphMetrics {
  // Count all nodes
  const nodeCount = nodes.length;

  // Filter out annotation nodes (blankBoxNode, textNode) for workflow analysis
  const workflowNodes = nodes.filter(
    (n) => n.data.type !== "blankBoxNode" && n.data.type !== "textNode"
  );
  const workflowNodeCount = workflowNodes.length;
  const nonTerminalNodeCount = nodes.filter(
    (n) => n.data.type !== "startNode" && n.data.type !== "finishNode"
  ).length;

  // Build adjacency list from workflow nodes only
  const adjacencyList = buildAdjacencyList(workflowNodes, edges);

  // Compute depth as longest Start -> Finish path in hops
  const maxDepth = computeMaxDepth(workflowNodes, adjacencyList);

  // Detect cycles via DFS
  const loopCount = countCycles(workflowNodes, adjacencyList);
  const branchCount = countConditionNodes(nodes);
  const hasParallelFork = detectParallelFork(workflowNodes, adjacencyList);
  const { score: complexityScore, level: complexityLevel } = computeComplexity(
    nonTerminalNodeCount,
    maxDepth,
    loopCount,
    branchCount,
    hasParallelFork
  );

  // Compute tool risk surface
  const toolRiskSurface = computeToolRiskSurface(workflowNodes);

  // Compute aggregate risk score and level
  const { score: riskScore, level: riskLevel } = computeRiskScore(
    toolRiskSurface,
    maxDepth,
    loopCount,
    workflowNodeCount
  );

  return {
    nodeCount,
    workflowNodeCount,
    nonTerminalNodeCount,
    maxDepth,
    loopCount,
    branchCount,
    hasParallelFork,
    complexityScore,
    complexityLevel,
    toolRiskSurface,
    riskScore,
    riskLevel,
  };
}

/**
 * Build adjacency list representation from nodes and edges
 */
function buildAdjacencyList(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[]
): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  // Initialize with empty arrays for all nodes
  nodes.forEach((node) => {
    adj.set(node.id, []);
  });

  // Add edges
  edges.forEach((edge) => {
    const neighbors = adj.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    }
  });

  return adj;
}

/**
 * Compute longest Start -> Finish path length in hops.
 * Falls back to longest simple path in the current graph when there is no
 * reachable Start -> Finish path (useful while users are still wiring nodes).
 */
function computeMaxDepth(
  nodes: Node<WorkflowNodeData>[],
  adjacencyList: Map<string, string[]>
): number {
  const startNode = nodes.find((n) => n.data.type === "startNode");
  const finishIds = new Set(
    nodes.filter((n) => n.data.type === "finishNode").map((n) => n.id)
  );
  if (!startNode || finishIds.size === 0) {
    return computeLongestSimplePath(nodes, adjacencyList);
  }

  let maxDepth = -1;
  const pathVisited = new Set<string>();

  const dfs = (nodeId: string, depth: number): void => {
    if (finishIds.has(nodeId)) {
      maxDepth = Math.max(maxDepth, depth);
      return;
    }

    pathVisited.add(nodeId);
    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      // Prevent infinite recursion in cyclic graphs by exploring only simple paths.
      if (!pathVisited.has(neighbor)) {
        dfs(neighbor, depth + 1);
      }
    }
    pathVisited.delete(nodeId);
  };

  dfs(startNode.id, 0);
  if (maxDepth >= 0) {
    return maxDepth;
  }

  return computeLongestSimplePath(nodes, adjacencyList);
}

/**
 * Compute longest simple path in the graph regardless of node types.
 * Used as fallback when Start -> Finish path does not exist yet.
 */
function computeLongestSimplePath(
  nodes: Node<WorkflowNodeData>[],
  adjacencyList: Map<string, string[]>
): number {
  let longest = 0;

  for (const node of nodes) {
    const pathVisited = new Set<string>();

    const dfs = (nodeId: string, depth: number): void => {
      longest = Math.max(longest, depth);
      pathVisited.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!pathVisited.has(neighbor)) {
          dfs(neighbor, depth + 1);
        }
      }

      pathVisited.delete(nodeId);
    };

    dfs(node.id, 0);
  }

  return longest;
}

/**
 * Count cycles in the graph using DFS with recursion stack
 * Detects cycles in both connected and disconnected components
 */
function countCycles(
  nodes: Node<WorkflowNodeData>[],
  adjacencyList: Map<string, string[]>
): number {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  let cycleCount = 0;

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          cycleCount++;
        }
      } else if (recStack.has(neighbor)) {
        // Back edge found - cycle detected
        cycleCount++;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  // Visit all nodes (handles disconnected components)
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return cycleCount;
}

/**
 * Count condition nodes (branching points)
 */
function countConditionNodes(nodes: Node<WorkflowNodeData>[]): number {
  return nodes.filter((node) => node.data.type === "conditionNode").length;
}

/**
 * Detect whether graph has any parallel fork:
 * one non-condition source node has 2+ outgoing targets.
 */
function detectParallelFork(
  nodes: Node<WorkflowNodeData>[],
  adjacencyList: Map<string, string[]>
): boolean {
  const nodeTypeById = new Map(nodes.map((n) => [n.id, n.data.type]));

  for (const [sourceId, neighbors] of adjacencyList.entries()) {
    const sourceType = nodeTypeById.get(sourceId);
    if (sourceType === "conditionNode") {
      continue;
    }
    if (new Set(neighbors).size > 1) {
      return true;
    }
  }
  return false;
}

/**
 * Compute additive complexity score/label for canvas stats bar.
 *
 * Scoring:
 * - nodes > 5: +1
 * - nodes > 10: +1
 * - depth > 4: +1
 * - loops >= 1: +1
 * - loops > 3: +1
 * - branches >= 2: +1
 * - parallel fork detected: +1
 *
 * Thresholds:
 * - 0-1: Low
 * - 2-3: Medium
 * - 4-5: High
 * - 6+: Very High
 */
function computeComplexity(
  nodeCount: number,
  depth: number,
  loops: number,
  branches: number,
  hasParallelFork: boolean
): { score: number; level: "Low" | "Medium" | "High" | "Very High" } {
  let score = 0;

  if (nodeCount > 5) score += 1;
  if (nodeCount > 10) score += 1;
  if (depth > 4) score += 1;
  if (loops >= 1) score += 1;
  if (loops > 3) score += 1;
  if (branches >= 2) score += 1;
  if (hasParallelFork) score += 1;

  if (score >= 6) return { score, level: "Very High" };
  if (score >= 4) return { score, level: "High" };
  if (score >= 2) return { score, level: "Medium" };
  return { score, level: "Low" };
}

/**
 * Compute tool risk surface by category mapping
 */
function computeToolRiskSurface(
  nodes: Node<WorkflowNodeData>[]
): ToolRiskSurface {
  const surface: ToolRiskSurface = {
    read: 0,
    write: 0,
    exec: 0,
    network: 0,
    other: 0,
  };

  nodes.forEach((node) => {
    if (node.data.type === "toolNode" && node.data.toolCategory) {
      const category = node.data.toolCategory;
      const bucket = RISK_CATEGORY_MAP[category] || "other";
      surface[bucket]++;
    } else if (node.data.type === "toolNode" && !node.data.toolCategory) {
      // Tool with no category -> other
      surface.other++;
    }
  });

  return surface;
}

/**
 * Compute aggregate risk score and level
 *
 * Point weights:
 * - exec tools: +2 per tool
 * - network tools: +2 per tool
 * - write tools: +1 per tool
 * - depth > 5: +2
 * - any loops: +2
 * - nodes > 15: +1
 *
 * Thresholds:
 * - Low: 0-3
 * - Medium: 4-7
 * - High: 8+
 */
function computeRiskScore(
  surface: ToolRiskSurface,
  depth: number,
  loops: number,
  nodeCount: number
): { score: number; level: "Low" | "Medium" | "High" } {
  let score = 0;

  // Tool surface points
  score += surface.exec * 2;
  score += surface.network * 2;
  score += surface.write * 1;

  // Depth factor
  if (depth > 5) {
    score += 2;
  }

  // Loop factor
  if (loops > 0) {
    score += 2;
  }

  // Node count factor
  if (nodeCount > 15) {
    score += 1;
  }

  // Determine level
  let level: "Low" | "Medium" | "High";
  if (score >= 8) {
    level = "High";
  } else if (score >= 4) {
    level = "Medium";
  } else {
    level = "Low";
  }

  return { score, level };
}
