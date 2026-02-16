/**
 * useAutoLayout – dagre-based auto-layout for the React Flow canvas.
 *
 * Reads nodes + edges from the Zustand store, computes a top-to-bottom
 * DAG layout using dagre, then writes the new positions back to the store.
 */

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { useWorkflowStore, useWorkflowNodes, useWorkflowEdges } from "@/store/useWorkflowStore";
import type { WorkflowNodeData } from "@/types/workflow";
import type { Node } from "@xyflow/react";

/** Default node size for layout calculation. */
const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

/** dagre layout options. */
const DAGRE_CONFIG = {
  rankdir: "TB" as const,   // top → bottom
  nodesep: 80,               // horizontal spacing between nodes
  ranksep: 120,              // vertical spacing between ranks
  marginx: 40,
  marginy: 40,
};

export function useAutoLayout() {
  const nodes = useWorkflowNodes();
  const edges = useWorkflowEdges();
  const { setNodes } = useWorkflowStore();
  const { fitView } = useReactFlow();

  const autoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph(DAGRE_CONFIG);

    // Add nodes
    for (const node of nodes) {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }

    // Add edges
    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    // Map dagre positions back to React Flow nodes
    const layoutedNodes: Node<WorkflowNodeData>[] = nodes.map((node) => {
      const pos = g.node(node.id);
      return {
        ...node,
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
        },
      };
    });

    setNodes(layoutedNodes);

    // Fit the view to show all nodes after layout
    requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 300 });
    });
  }, [nodes, edges, setNodes, fitView]);

  return autoLayout;
}
