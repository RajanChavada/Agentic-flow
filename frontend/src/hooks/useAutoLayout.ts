/**
 * useAutoLayout – dagre-based auto-layout for the React Flow canvas.
 *
 * Returns a function that computes a top-to-bottom DAG layout and writes
 * new positions back to the store. Skips blankBoxNode and textNode
 * (annotations) so their positions are preserved.
 *
 * Usage:
 *   applyLayout()                     — layout current store state
 *   applyLayout(freshNodes, freshEdges) — layout explicit data (avoids stale closure)
 */

import { useCallback } from "react";
import { useReactFlow, type Node, type Edge } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import type { WorkflowNodeData } from "@/types/workflow";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

const DAGRE_CONFIG = {
  rankdir: "TB" as const,
  nodesep: 80,
  ranksep: 120,
  marginx: 40,
  marginy: 40,
};

const SKIP_TYPES = new Set(["blankBoxNode", "textNode"]);

export function useAutoLayout() {
  const { setNodes } = useWorkflowStore();
  const { fitView } = useReactFlow();

  return useCallback(
    (
      nodesToLayout?: Node<WorkflowNodeData>[],
      edgesToLayout?: Edge[],
    ) => {
      const storeState = useWorkflowStore.getState();
      const nodes = nodesToLayout ?? storeState.nodes;
      const edges = edgesToLayout ?? storeState.edges;

      if (nodes.length === 0) return;

      const g = new dagre.graphlib.Graph();
      g.setDefaultEdgeLabel(() => ({}));
      g.setGraph(DAGRE_CONFIG);

      for (const node of nodes) {
        if (SKIP_TYPES.has(node.type ?? "")) continue;
        g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
      }

      for (const edge of edges) {
        if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
          g.setEdge(edge.source, edge.target);
        }
      }

      dagre.layout(g);

      const laidOut: Node<WorkflowNodeData>[] = nodes.map((node) => {
        if (SKIP_TYPES.has(node.type ?? "")) return node;
        const pos = g.node(node.id);
        return {
          ...node,
          position: {
            x: pos.x - NODE_WIDTH / 2,
            y: pos.y - NODE_HEIGHT / 2,
          },
        };
      });

      setNodes(laidOut);

      requestAnimationFrame(() => {
        fitView({ padding: 0.15, duration: 300 });
      });
    },
    [setNodes, fitView],
  );
}
