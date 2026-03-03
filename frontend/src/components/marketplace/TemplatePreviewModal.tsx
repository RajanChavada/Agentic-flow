"use client";

import React, { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Copy, Sparkles, Trash2 } from "lucide-react";
import { ReactFlowProvider, ReactFlow, Background, BackgroundVariant, useReactFlow, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import type { WorkflowTemplate } from "@/types/workflow";
import type { Node, Edge } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";
import WorkflowNode from "@/components/nodes/WorkflowNode";
import BlankBoxNode from "@/components/nodes/BlankBoxNode";
import TextNode from "@/components/nodes/TextNode";
import AnnotationEdge from "@/components/edges/AnnotationEdge";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  rag: "RAG",
  research: "Research",
  orchestration: "Orchestration",
  custom: "Custom",
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;
const SKIP_TYPES = new Set(["blankBoxNode", "textNode"]);

const nodeTypes = {
  startNode: WorkflowNode,
  agentNode: WorkflowNode,
  toolNode: WorkflowNode,
  finishNode: WorkflowNode,
  blankBoxNode: BlankBoxNode,
  textNode: TextNode,
};

const edgeTypes = {
  annotationEdge: AnnotationEdge,
};

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

function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const flowNodes = nodes.filter((n) => !SKIP_TYPES.has(n.type ?? ""));
  if (flowNodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  for (const n of flowNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }
  dagre.layout(g);

  return nodes.map((node) => {
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
}

interface Props {
  template: WorkflowTemplate | null;
  onClose: () => void;
  onUseTemplate: (id: string) => void;
  onDeleteTemplate?: (id: string) => void;
  isOwnedByCurrentUser?: boolean;
  isDark: boolean;
  isUsing?: boolean;
}

function FitViewEffect() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
  }, [fitView]);
  return null;
}

export default function TemplatePreviewModal({
  template,
  onClose,
  onUseTemplate,
  onDeleteTemplate,
  isOwnedByCurrentUser,
  isDark,
  isUsing,
}: Props) {
  const { nodes, edges } = useMemo(() => {
    if (!template?.graph) return { nodes: [], edges: [] };

    const rawNodes: Node<WorkflowNodeData>[] = template.graph.nodes.map((n, i) => ({
      id: n.id,
      type: n.type,
      position: { x: 200 + (i % 3) * 220, y: 100 + Math.floor(i / 3) * 160 },
      data: {
        label: n.label ?? n.type,
        type: n.type,
        modelProvider: n.model_provider,
        modelName: n.model_name,
        context: n.context,
        toolId: n.tool_id,
        toolCategory: n.tool_category,
        maxSteps: n.max_steps,
        taskType: n.task_type ?? undefined,
        expectedOutputSize: n.expected_output_size ?? undefined,
        expectedCallsPerRun: n.expected_calls_per_run ?? undefined,
      },
    }));

    const rawEdges: Edge[] = (template.graph.edges ?? []).map((e) => ({
      id: e.id ?? `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "annotationEdge",
    }));

    const laidOutNodes = layoutNodes(rawNodes, rawEdges);
    return { nodes: laidOutNodes, edges: rawEdges };
  }, [template]);

  if (!template) return null;

  const categoryLabel = CATEGORY_LABELS[template.category] ?? template.category;

  const handleUse = () => {
    onUseTemplate(template.id);
    onClose();
  };

  const handleDelete = () => {
    if (onDeleteTemplate) {
      onDeleteTemplate(template.id);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl",
          isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{template.name}</h2>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium",
                isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
              )}
            >
              {categoryLabel}
            </span>
            {template.is_curated && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
                  isDark ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-800"
                )}
              >
                <Sparkles className="h-3 w-3" />
                Curated
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className={cn(
              "rounded p-1.5 transition-colors",
              isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {template.description && (
            <div
              className={cn(
                "border-b px-5 py-4",
                isDark ? "border-gray-800" : "border-gray-200"
              )}
            >
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  isDark ? "text-gray-300" : "text-gray-600"
                )}
              >
                {template.description}
              </p>
            </div>
          )}

          <div
            className="min-h-[280px] shrink-0"
            style={{ height: 320 }}
          >
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={true}
                zoomOnScroll={true}
                zoomOnPinch={true}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={1}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <FitViewEffect />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-2 border-t px-5 py-4",
            isDark ? "border-gray-800" : "border-gray-200"
          )}
        >
          <div>
            {isOwnedByCurrentUser && onDeleteTemplate && (
              <button
                onClick={handleDelete}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  isDark
                    ? "text-red-400 hover:bg-red-950/30 hover:text-red-300"
                    : "text-red-600 hover:bg-red-50 hover:text-red-700"
                )}
              >
                <Trash2 className="h-4 w-4" />
                Delete from marketplace
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                isDark ? "text-gray-300 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-100"
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleUse}
              disabled={isUsing}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70 disabled:cursor-wait"
            >
              <Copy className="h-4 w-4" />
              Use template
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
