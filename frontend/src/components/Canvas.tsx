"use client";
"use no memo";

import React, { useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  MarkerType,
  addEdge,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuid } from "uuid";

import WorkflowNode from "@/components/nodes/WorkflowNode";
import BlankBoxNode from "@/components/nodes/BlankBoxNode";
import TextNode from "@/components/nodes/TextNode";
import AnnotationEdge from "@/components/edges/AnnotationEdge";
import {
  useWorkflowStore,
  useWorkflowNodes,
  useWorkflowEdges,
  useUIState,
  useEstimation,
} from "@/store/useWorkflowStore";
import type { WorkflowNodeData, WorkflowNodeType } from "@/types/workflow";

/** Register all custom node types once. */
const nodeTypes = {
  startNode: WorkflowNode,
  agentNode: WorkflowNode,
  toolNode: WorkflowNode,
  finishNode: WorkflowNode,
  blankBoxNode: BlankBoxNode,
  textNode: TextNode,
};

/** Register custom edge types once. */
const edgeTypes = {
  annotationEdge: AnnotationEdge,
};

/** Default edge options — animated with arrow marker, uses AnnotationEdge */
const defaultEdgeOptions = {
  type: "annotationEdge" as const,
  animated: true,
  style: { strokeWidth: 2, stroke: "#6b7280" },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: "#6b7280",
  },
};

export default function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useWorkflowNodes();
  const edges = useWorkflowEdges();
  const { theme } = useUIState();
  const estimation = useEstimation();
  const {
    onNodesChange,
    onEdgesChange,
    setEdges,
    addNode,
    setSelectedNodeId,
    openConfigModal,
    restoreFromLocalStorage,
  } = useWorkflowStore();

  // ── Restore local storage guest snapshot on mount ───────────
  useEffect(() => {
    restoreFromLocalStorage();
  }, [restoreFromLocalStorage]);

  // ── Derive critical path edge set for highlighting ───────────
  const criticalPathEdgeSet = React.useMemo(() => {
    const cp = estimation?.critical_path ?? [];
    const set = new Set<string>();
    for (let i = 0; i < cp.length - 1; i++) {
      set.add(`${cp[i]}->${cp[i + 1]}`);
    }
    return set;
  }, [estimation?.critical_path]);

  // ── Apply critical path styling + latency labels to edges ──
  const styledEdges = React.useMemo(() => {
    const breakdown = estimation?.breakdown;
    return edges.map((edge) => {
      const key = `${edge.source}->${edge.target}`;
      const isCritical = criticalPathEdgeSet.has(key);

      // Find latency of the target node to display on the edge
      const targetEst = breakdown?.find((b) => b.node_id === edge.target);
      const sourceEst = breakdown?.find((b) => b.node_id === edge.source);
      const latMs = targetEst && targetEst.latency > 0
        ? (targetEst.latency * 1000).toFixed(0)
        : null;
      const costLabel = targetEst && targetEst.cost > 0
        ? `$${targetEst.cost < 0.01 ? targetEst.cost.toFixed(5) : targetEst.cost.toFixed(3)}`
        : null;
      // Tool connection: show tool latency specifically
      const isToolEdge = sourceEst?.tool_id != null || targetEst?.tool_id != null;
      const toolLatMs = isToolEdge && targetEst && targetEst.tool_latency > 0
        ? (targetEst.tool_latency * 1000).toFixed(0)
        : null;

      // Build a compact label: "120ms · $0.003" or just "120ms"
      let edgeLabel: string | undefined;
      if (breakdown && breakdown.length > 0) {
        const parts: string[] = [];
        if (toolLatMs) {
          parts.push(`Tool ${toolLatMs}ms`);
        } else if (latMs) {
          parts.push(`${latMs}ms`);
        }
        if (costLabel) parts.push(costLabel);
        if (parts.length > 0) edgeLabel = parts.join(" · ");
      }

      if (isCritical) {
        return {
          ...edge,
          style: { ...edge.style, strokeWidth: 3, stroke: "#3b82f6" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: "#3b82f6",
          },
          label: edgeLabel ?? "critical path",
          labelStyle: { fontSize: 9, fontWeight: 600, fill: "#3b82f6", fontFamily: "monospace" },
          labelBgStyle: { fill: theme === "dark" ? "#1e293b" : "#eff6ff", fillOpacity: 0.9, rx: 4, ry: 4 },
          labelBgPadding: [4, 6] as [number, number],
        };
      }

      if (edgeLabel) {
        return {
          ...edge,
          label: edgeLabel,
          labelStyle: {
            fontSize: 9,
            fontWeight: 500,
            fill: theme === "dark" ? "#94a3b8" : "#6b7280",
            fontFamily: "monospace",
          },
          labelBgStyle: {
            fill: theme === "dark" ? "#1e293b" : "#f9fafb",
            fillOpacity: 0.85,
            rx: 4,
            ry: 4,
          },
          labelBgPadding: [3, 5] as [number, number],
        };
      }

      return edge;
    });
  }, [edges, criticalPathEdgeSet, estimation?.breakdown, theme]);

  // ── Connect two nodes (with validation + edge styling) ───────
  const onConnect = useCallback(
    (connection: Connection) => {
      const currentNodes = useWorkflowStore.getState().nodes;
      const currentEdges = useWorkflowStore.getState().edges;

      const sourceNode = currentNodes.find((n) => n.id === connection.source);
      const targetNode = currentNodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      // Rule 1: Nothing can point TO a Start node
      if (targetNode.type === "startNode") return;

      // Rule 2: Nothing can point FROM a Finish node
      if (sourceNode.type === "finishNode") return;

      // Rule 3: Tool → Agent edges get no arrow (data-flow style)
      const isToolToAgent =
        sourceNode.type === "toolNode" && targetNode.type === "agentNode";

      const newEdge: Edge = isToolToAgent
        ? {
          ...connection,
          id: `e-${uuid()}`,
          source: connection.source,
          target: connection.target,
          animated: true,
          style: { strokeWidth: 2, stroke: "#f59e0b", strokeDasharray: "6 3" },
        }
        : {
          ...connection,
          id: `e-${uuid()}`,
          source: connection.source,
          target: connection.target,
        };

      setEdges(addEdge(newEdge, currentEdges));
    },
    [setEdges]
  );

  // ── Drop a new node from the sidebar ─────────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow-type") as WorkflowNodeType;
      const label = event.dataTransfer.getData("application/reactflow-label") || type;

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const baseData: WorkflowNodeData = { label, type };

      if (type === "blankBoxNode") {
        baseData.blankBoxStyle = {
          label: "Group",
          labelPosition: "top-left",
          labelColor: "#3b82f6",
          labelBackground: "none",
          borderStyle: "dashed",
          borderColor: "#3b82f6",
          borderWidth: 2,
          backgroundColor: "#eff6ff",
          backgroundOpacity: 40,
          connectable: true,
        };
      }

      if (type === "textNode") {
        baseData.textNodeStyle = {
          content: "Text",
          fontSize: "md",
          color: "#374151",
          background: "none",
        };
      }

      const newNode: Parameters<typeof addNode>[0] = {
        id: uuid(),
        type,
        position,
        data: baseData,
        ...(type === "blankBoxNode" && {
          style: { width: 320, height: 220 },
        }),
      };

      addNode(newNode);
    },
    [addNode, screenToFlowPosition]
  );

  // ── Double‑click to open config modal (agent & tool nodes) ──
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: { id: string; type?: string }) => {
      setSelectedNodeId(node.id);
      if (
        node.type === "agentNode" ||
        node.type === "toolNode" ||
        node.type === "blankBoxNode" ||
        node.type === "textNode"
      ) {
        openConfigModal();
      }
    },
    [setSelectedNodeId, openConfigModal]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        className={theme === "dark" ? "bg-slate-800" : "bg-gray-50"}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={2}
          color={theme === "dark" ? "#475569" : "#94a3b8"}
        />
        <Controls className={theme === "dark" ? "react-flow__controls--dark" : ""} />
        <MiniMap
          pannable
          zoomable
          className={theme === "dark" ? "bg-slate-700!" : "bg-white!"}
          nodeColor={(n) => {
            switch (n.type) {
              case "startNode": return "#22c55e";
              case "agentNode": return "#3b82f6";
              case "toolNode": return "#f97316";
              case "finishNode": return "#ef4444";
              case "blankBoxNode": return "#94a3b8";
              case "textNode": return "#8b5cf6";
              default: return "#6b7280";
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
