/**
 * Test fixtures for graph analysis tests
 * Factory functions that return { nodes: Node[], edges: Edge[] } for various graph shapes
 */

import type { Node, Edge } from "@xyflow/react";
import type { WorkflowNodeData } from "../../../types/workflow";

type MockNode = Node<WorkflowNodeData>;
type MockEdge = Edge;

/** Empty graph - no nodes, no edges */
export function emptyGraph(): { nodes: MockNode[]; edges: MockEdge[] } {
  return { nodes: [], edges: [] };
}

/** Single start node with no edges */
export function singleStartNode(): { nodes: MockNode[]; edges: MockEdge[] } {
  return {
    nodes: [
      {
        id: "start-1",
        type: "startNode",
        data: { label: "Start", type: "startNode" },
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
  };
}

/** Linear chain: start -> n1 -> ... -> finish (length = total number of nodes) */
export function linearChain(length: number): { nodes: MockNode[]; edges: MockEdge[] } {
  const nodes: MockNode[] = [
    {
      id: "start",
      type: "startNode",
      data: { label: "Start", type: "startNode" },
      position: { x: 0, y: 0 },
    },
  ];

  const edges: MockEdge[] = [];

  // Create intermediate nodes (length - 2, since we have start and finish)
  for (let i = 1; i < length - 1; i++) {
    const prevId = i === 1 ? "start" : `node-${i - 1}`;
    const nodeId = `node-${i}`;
    nodes.push({
      id: nodeId,
      type: "agentNode",
      data: { label: `Agent ${i}`, type: "agentNode" },
      position: { x: i * 100, y: 0 },
    });
    edges.push({
      id: `e-${prevId}-${nodeId}`,
      source: prevId,
      target: nodeId,
    });
  }

  // Add finish node
  const lastNodeId = length === 2 ? "start" : `node-${length - 2}`;
  nodes.push({
    id: "finish",
    type: "finishNode",
    data: { label: "Finish", type: "finishNode" },
    position: { x: (length - 1) * 100, y: 0 },
  });
  edges.push({
    id: `e-${lastNodeId}-finish`,
    source: lastNodeId,
    target: "finish",
  });

  return { nodes, edges };
}

/** Diamond graph: start -> (A, B) -> finish */
export function diamondGraph(): { nodes: MockNode[]; edges: MockEdge[] } {
  return {
    nodes: [
      {
        id: "start",
        type: "startNode",
        data: { label: "Start", type: "startNode" },
        position: { x: 100, y: 0 },
      },
      {
        id: "a",
        type: "agentNode",
        data: { label: "Agent A", type: "agentNode" },
        position: { x: 0, y: 100 },
      },
      {
        id: "b",
        type: "agentNode",
        data: { label: "Agent B", type: "agentNode" },
        position: { x: 200, y: 100 },
      },
      {
        id: "finish",
        type: "finishNode",
        data: { label: "Finish", type: "finishNode" },
        position: { x: 100, y: 200 },
      },
    ],
    edges: [
      { id: "e-start-a", source: "start", target: "a" },
      { id: "e-start-b", source: "start", target: "b" },
      { id: "e-a-finish", source: "a", target: "finish" },
      { id: "e-b-finish", source: "b", target: "finish" },
    ],
  };
}

/** Graph with a cycle: A -> B -> A */
export function cyclicGraph(): { nodes: MockNode[]; edges: MockEdge[] } {
  return {
    nodes: [
      {
        id: "start",
        type: "startNode",
        data: { label: "Start", type: "startNode" },
        position: { x: 0, y: 0 },
      },
      {
        id: "a",
        type: "agentNode",
        data: { label: "Agent A", type: "agentNode" },
        position: { x: 100, y: 0 },
      },
      {
        id: "b",
        type: "agentNode",
        data: { label: "Agent B", type: "agentNode" },
        position: { x: 200, y: 0 },
      },
      {
        id: "finish",
        type: "finishNode",
        data: { label: "Finish", type: "finishNode" },
        position: { x: 300, y: 0 },
      },
    ],
    edges: [
      { id: "e-start-a", source: "start", target: "a" },
      { id: "e-a-b", source: "a", target: "b" },
      { id: "e-b-a", source: "b", target: "a" }, // Back edge creating cycle
      { id: "e-b-finish", source: "b", target: "finish" },
    ],
  };
}

/** Graph with disconnected cycle subgraph (not connected to start) */
export function disconnectedCyclicGraph(): { nodes: MockNode[]; edges: MockEdge[] } {
  return {
    nodes: [
      {
        id: "start",
        type: "startNode",
        data: { label: "Start", type: "startNode" },
        position: { x: 0, y: 0 },
      },
      {
        id: "main",
        type: "agentNode",
        data: { label: "Main Agent", type: "agentNode" },
        position: { x: 100, y: 0 },
      },
      {
        id: "finish",
        type: "finishNode",
        data: { label: "Finish", type: "finishNode" },
        position: { x: 200, y: 0 },
      },
      // Disconnected cycle
      {
        id: "x",
        type: "agentNode",
        data: { label: "Agent X", type: "agentNode" },
        position: { x: 0, y: 200 },
      },
      {
        id: "y",
        type: "agentNode",
        data: { label: "Agent Y", type: "agentNode" },
        position: { x: 100, y: 200 },
      },
    ],
    edges: [
      { id: "e-start-main", source: "start", target: "main" },
      { id: "e-main-finish", source: "main", target: "finish" },
      // Disconnected cycle
      { id: "e-x-y", source: "x", target: "y" },
      { id: "e-y-x", source: "y", target: "x" },
    ],
  };
}

/** High-risk graph: 16+ nodes, exec tools, network tools, loops, depth > 5 */
export function highRiskGraph(): { nodes: MockNode[]; edges: MockEdge[] } {
  const nodes: MockNode[] = [
    {
      id: "start",
      type: "startNode",
      data: { label: "Start", type: "startNode" },
      position: { x: 0, y: 0 },
    },
  ];

  const edges: MockEdge[] = [];

  // Create a deep chain (depth 7) with various tools
  for (let i = 1; i <= 7; i++) {
    const prevId = i === 1 ? "start" : `node-${i - 1}`;
    const nodeId = `node-${i}`;

    // Add tools with various categories
    let toolCategory: string | undefined;
    if (i === 2) toolCategory = "code_execution"; // exec
    if (i === 3) toolCategory = "api"; // network
    if (i === 4) toolCategory = "database"; // write
    if (i === 5) toolCategory = "code_execution"; // exec again

    nodes.push({
      id: nodeId,
      type: toolCategory ? "toolNode" : "agentNode",
      data: {
        label: `Node ${i}`,
        type: toolCategory ? "toolNode" : "agentNode",
        toolCategory,
      },
      position: { x: i * 100, y: 0 },
    });

    edges.push({
      id: `e-${prevId}-${nodeId}`,
      source: prevId,
      target: nodeId,
    });
  }

  // Add 9 more nodes to exceed 15 (start + 7 + 9 = 17 nodes)
  for (let i = 8; i <= 16; i++) {
    const nodeId = `node-${i}`;
    nodes.push({
      id: nodeId,
      type: "agentNode",
      data: { label: `Agent ${i}`, type: "agentNode" },
      position: { x: 700, y: (i - 7) * 50 },
    });

    // Connect to node-7 to keep them in the graph
    if (i === 8) {
      edges.push({
        id: `e-node-7-${nodeId}`,
        source: "node-7",
        target: nodeId,
      });
    } else {
      edges.push({
        id: `e-node-${i-1}-${nodeId}`,
        source: `node-${i - 1}`,
        target: nodeId,
      });
    }
  }

  // Add a cycle between node-15 and node-16
  edges.push({
    id: "e-node-16-node-15",
    source: "node-16",
    target: "node-15",
  });

  // Add finish node
  nodes.push({
    id: "finish",
    type: "finishNode",
    data: { label: "Finish", type: "finishNode" },
    position: { x: 800, y: 0 },
  });
  edges.push({
    id: "e-node-16-finish",
    source: "node-16",
    target: "finish",
  });

  return { nodes, edges };
}

/** Condition node branching: start -> condition -> (true_path, false_path) -> finish */
export function conditionBranchGraph(): { nodes: MockNode[]; edges: MockEdge[] } {
  return {
    nodes: [
      {
        id: "start",
        type: "startNode",
        data: { label: "Start", type: "startNode" },
        position: { x: 0, y: 100 },
      },
      {
        id: "condition",
        type: "conditionNode",
        data: { label: "Condition", type: "conditionNode" },
        position: { x: 100, y: 100 },
      },
      {
        id: "true-branch",
        type: "agentNode",
        data: { label: "True Branch", type: "agentNode" },
        position: { x: 200, y: 50 },
      },
      {
        id: "false-branch",
        type: "agentNode",
        data: { label: "False Branch", type: "agentNode" },
        position: { x: 200, y: 150 },
      },
      {
        id: "finish",
        type: "finishNode",
        data: { label: "Finish", type: "finishNode" },
        position: { x: 300, y: 100 },
      },
    ],
    edges: [
      { id: "e-start-condition", source: "start", target: "condition" },
      { id: "e-condition-true", source: "condition", target: "true-branch" },
      { id: "e-condition-false", source: "condition", target: "false-branch" },
      { id: "e-true-finish", source: "true-branch", target: "finish" },
      { id: "e-false-finish", source: "false-branch", target: "finish" },
    ],
  };
}

/** Add tool nodes with specified categories */
export function withToolNodes(
  categories: string[]
): { nodes: MockNode[]; edges: MockEdge[] } {
  const nodes: MockNode[] = [
    {
      id: "start",
      type: "startNode",
      data: { label: "Start", type: "startNode" },
      position: { x: 0, y: 0 },
    },
  ];

  const edges: MockEdge[] = [];

  categories.forEach((category, idx) => {
    const toolId = `tool-${idx + 1}`;
    nodes.push({
      id: toolId,
      type: "toolNode",
      data: {
        label: `Tool ${idx + 1}`,
        type: "toolNode",
        toolCategory: category,
      },
      position: { x: (idx + 1) * 100, y: 0 },
    });

    const prevId = idx === 0 ? "start" : `tool-${idx}`;
    edges.push({
      id: `e-${prevId}-${toolId}`,
      source: prevId,
      target: toolId,
    });
  });

  return { nodes, edges };
}

/** Add ideal state node, optionally connected */
export function withIdealState(
  connected: boolean
): { nodes: MockNode[]; edges: MockEdge[] } {
  const nodes: MockNode[] = [
    {
      id: "start",
      type: "startNode",
      data: { label: "Start", type: "startNode" },
      position: { x: 0, y: 0 },
    },
    {
      id: "agent",
      type: "agentNode",
      data: { label: "Agent", type: "agentNode" },
      position: { x: 100, y: 0 },
    },
    {
      id: "idealState",
      type: "finishNode",
      data: { label: "Ideal State", type: "finishNode" },
      position: { x: 200, y: 0 },
    },
  ];

  const edges: MockEdge[] = [
    { id: "e-start-agent", source: "start", target: "agent" },
  ];

  if (connected) {
    edges.push({
      id: "e-agent-ideal",
      source: "agent",
      target: "idealState",
    });
  }

  return { nodes, edges };
}

/** Graph with annotation nodes (blankBoxNode, textNode) */
export function withAnnotations(): { nodes: MockNode[]; edges: MockEdge[] } {
  return {
    nodes: [
      {
        id: "start",
        type: "startNode",
        data: { label: "Start", type: "startNode" },
        position: { x: 0, y: 0 },
      },
      {
        id: "agent1",
        type: "agentNode",
        data: { label: "Agent 1", type: "agentNode" },
        position: { x: 100, y: 0 },
      },
      {
        id: "agent2",
        type: "agentNode",
        data: { label: "Agent 2", type: "agentNode" },
        position: { x: 200, y: 0 },
      },
      {
        id: "blank1",
        type: "blankBoxNode",
        data: { label: "Annotation Box", type: "blankBoxNode" },
        position: { x: 100, y: 100 },
      },
      {
        id: "text1",
        type: "textNode",
        data: { label: "Text Note", type: "textNode" },
        position: { x: 200, y: 100 },
      },
      {
        id: "finish",
        type: "finishNode",
        data: { label: "Finish", type: "finishNode" },
        position: { x: 300, y: 0 },
      },
    ],
    edges: [
      { id: "e-start-agent1", source: "start", target: "agent1" },
      { id: "e-agent1-agent2", source: "agent1", target: "agent2" },
      { id: "e-agent2-finish", source: "agent2", target: "finish" },
    ],
  };
}

/** Self-loop: node A -> A */
export function selfLoopGraph(): { nodes: MockNode[]; edges: MockEdge[] } {
  return {
    nodes: [
      {
        id: "start",
        type: "startNode",
        data: { label: "Start", type: "startNode" },
        position: { x: 0, y: 0 },
      },
      {
        id: "a",
        type: "agentNode",
        data: { label: "Agent A", type: "agentNode" },
        position: { x: 100, y: 0 },
      },
    ],
    edges: [
      { id: "e-start-a", source: "start", target: "a" },
      { id: "e-a-a", source: "a", target: "a" }, // Self-loop
    ],
  };
}
