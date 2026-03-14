/**
 * Graph analysis utility for computing canvas metadata metrics.
 * Pure functions operating on React Flow Node[] and Edge[] arrays.
 *
 * Computes: node count, max depth, loop count, tool risk surface,
 * aggregate risk score, and BFS reachability from Start to Ideal State.
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
  maxDepth: number;                     // longest BFS path from startNode
  loopCount: number;                    // number of cycles detected via DFS
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

  // Build adjacency list from workflow nodes only
  const adjacencyList = buildAdjacencyList(workflowNodes, edges);

  // Compute depth via BFS from startNode
  const maxDepth = computeMaxDepth(workflowNodes, adjacencyList);

  // Detect cycles via DFS
  const loopCount = countCycles(workflowNodes, adjacencyList);

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
    maxDepth,
    loopCount,
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
 * Compute maximum depth from startNode via BFS
 * Returns 0 if no startNode or no edges
 */
function computeMaxDepth(
  nodes: Node<WorkflowNodeData>[],
  adjacencyList: Map<string, string[]>
): number {
  // Find start node
  const startNode = nodes.find((n) => n.data.type === "startNode");
  if (!startNode) return 0;

  // BFS with depth tracking
  const depths = new Map<string, number>();
  const queue: string[] = [startNode.id];
  depths.set(startNode.id, 0);

  let maxDepth = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current)!;

    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      if (!depths.has(neighbor)) {
        const neighborDepth = currentDepth + 1;
        depths.set(neighbor, neighborDepth);
        queue.push(neighbor);
        maxDepth = Math.max(maxDepth, neighborDepth);
      }
    }
  }

  return maxDepth;
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

