"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";
import { useEstimation } from "@/store/useWorkflowStore";
import {
  Wrench,
  Flame,
  Zap,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

/* ── style map per node type (no emojis — uses CSS shapes) ── */
const STYLE: Record<
  string,
  {
    bg: string;
    border: string;
    darkBg: string;
    darkBorder: string;
    shapeColour: string;
    shape: "circle" | "rectangle" | "diamond" | "octagon";
  }
> = {
  startNode: {
    bg: "bg-green-50",
    border: "border-green-500",
    darkBg: "bg-green-900/30",
    darkBorder: "border-green-400",
    shapeColour: "bg-green-500",
    shape: "circle",
  },
  agentNode: {
    bg: "bg-blue-50",
    border: "border-blue-500",
    darkBg: "bg-blue-900/30",
    darkBorder: "border-blue-400",
    shapeColour: "bg-blue-500",
    shape: "rectangle",
  },
  toolNode: {
    bg: "bg-orange-50",
    border: "border-orange-500",
    darkBg: "bg-orange-900/30",
    darkBorder: "border-orange-400",
    shapeColour: "bg-orange-500",
    shape: "diamond",
  },
  finishNode: {
    bg: "bg-red-50",
    border: "border-red-500",
    darkBg: "bg-red-900/30",
    darkBorder: "border-red-400",
    shapeColour: "bg-red-500",
    shape: "octagon",
  },
};

/* ── Heatmap severity → border/glow styles ── */
const HEATMAP_STYLES: Record<string, { border: string; darkBorder: string; glow: string }> = {
  high: {
    border: "border-red-500",
    darkBorder: "border-red-400",
    glow: "shadow-red-300/60 shadow-lg",
  },
  medium: {
    border: "border-yellow-500",
    darkBorder: "border-yellow-400",
    glow: "shadow-yellow-200/40 shadow-md",
  },
};

function NodeShape({ shape, color }: { shape: string; color: string }) {
  switch (shape) {
    case "circle":
      return <span className={`inline-block w-3.5 h-3.5 rounded-full ${color}`} />;
    case "rectangle":
      return <span className={`inline-block w-3.5 h-3.5 rounded-sm ${color}`} />;
    case "diamond":
      return <span className={`inline-block w-3 h-3 rotate-45 rounded-[2px] ${color}`} />;
    case "octagon":
      return (
        <span
          className={`inline-block w-3.5 h-3.5 rounded-[2px] ${color}`}
          style={{ clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" }}
        />
      );
    default:
      return <span className={`inline-block w-3.5 h-3.5 rounded ${color}`} />;
  }
}

function WorkflowNode({ id, data, selected }: NodeProps & { data: WorkflowNodeData }) {
  const s = STYLE[data.type] ?? STYLE.agentNode;
  const estimation = useEstimation();

  // Detect dark mode via html class
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  // Look up bottleneck info for this node from the estimation breakdown
  const nodeEstimation = estimation?.breakdown?.find((b) => b.node_id === id);
  const severity = nodeEstimation?.bottleneck_severity ?? null;
  const costShare = nodeEstimation?.cost_share ?? 0;
  const latencyShare = nodeEstimation?.latency_share ?? 0;
  const inCycle = nodeEstimation?.in_cycle ?? false;

  // Find which cycle this node belongs to (for risk badge display)
  const nodeCycle = inCycle
    ? estimation?.detected_cycles?.find((c) => c.node_ids.includes(id))
    : null;

  // Determine heatmap overrides
  const heatmap = severity && severity !== "low" ? HEATMAP_STYLES[severity] : null;

  // Cycle ring: purple border/glow for loop nodes (when no heatmap override)
  const cycleRing = !heatmap && inCycle;

  const borderClass = heatmap
    ? (isDark ? heatmap.darkBorder : heatmap.border)
    : cycleRing
    ? (isDark ? "border-purple-400" : "border-purple-500")
    : (isDark ? s.darkBorder : s.border);
  const glowClass = heatmap?.glow ?? (cycleRing ? (isDark ? "shadow-purple-400/30 shadow-md" : "shadow-purple-300/40 shadow-md") : "");

  // Has meaningful metrics to show?
  const hasMetrics = nodeEstimation && (nodeEstimation.tokens > 0 || nodeEstimation.latency > 0 || nodeEstimation.cost > 0);

  return (
    <div
      className={`
        rounded-lg border-2 min-w-[170px] max-w-[220px] text-center transition-all duration-300
        ${hasMetrics ? "px-3 py-2.5" : "px-4 py-3"}
        ${isDark ? s.darkBg : s.bg} ${borderClass} ${glowClass}
        ${selected ? "ring-2 ring-offset-2 ring-blue-400" : ""}
      `}
    >
      {/* Incoming handle */}
      {data.type !== "startNode" && (
        <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2.5 !h-2.5" />
      )}

      <div className="flex items-center justify-center gap-2">
        <NodeShape shape={s.shape} color={s.shapeColour} />
        <span className={`font-semibold text-sm truncate max-w-[120px] ${isDark ? "text-slate-100" : "text-gray-800"}`}>
          {data.label}
        </span>
      </div>

      {data.type === "agentNode" && data.modelProvider && (
        <p className={`text-[10px] mt-1 truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          {data.modelProvider} / {data.modelName}
        </p>
      )}

      {/* Context-aware task summary line */}
      {data.type === "agentNode" && (data.taskType || data.expectedOutputSize) && (
        <p className={`text-[9px] mt-0.5 truncate italic ${isDark ? "text-indigo-400/70" : "text-indigo-500/80"}`}>
          {data.taskType ? data.taskType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : ""}
          {data.taskType && data.expectedOutputSize ? " · " : ""}
          {data.expectedOutputSize ? data.expectedOutputSize.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : ""}
          {(data.expectedCallsPerRun as number) > 1 ? ` · ×${data.expectedCallsPerRun} calls` : ""}
        </p>
      )}

      {data.type === "toolNode" && data.toolId && (
        <p className={`text-[10px] mt-1 truncate ${isDark ? "text-amber-400/70" : "text-orange-500"}`}>
          <Wrench className="inline w-3 h-3 mr-0.5" /> {data.toolId}
        </p>
      )}

      {(data.type === "agentNode" || data.type === "toolNode") && !data.modelProvider && !data.toolId && (
        <p className={`text-[9px] mt-1 italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>
          double-click to configure
        </p>
      )}

      {/* ── Inline metrics (visible when estimation exists) ── */}
      {hasMetrics && (
        <div className={`mt-2 pt-2 border-t text-[10px] space-y-1 ${isDark ? "border-slate-600/50" : "border-gray-200/80"}`}>
          {/* Tokens row */}
          {nodeEstimation.tokens > 0 && (
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-slate-500" : "text-gray-400"}>Tokens</span>
              <span className={`font-mono font-semibold ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                {nodeEstimation.tokens >= 1000
                  ? `${(nodeEstimation.tokens / 1000).toFixed(1)}k`
                  : nodeEstimation.tokens.toLocaleString()}
              </span>
            </div>
          )}
          {/* Cost row */}
          {nodeEstimation.cost > 0 && (
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-slate-500" : "text-gray-400"}>Cost</span>
              <span className={`font-mono font-semibold ${isDark ? "text-green-400" : "text-green-700"}`}>
                ${nodeEstimation.cost < 0.01 ? nodeEstimation.cost.toFixed(6) : nodeEstimation.cost.toFixed(4)}
              </span>
            </div>
          )}
          {/* Latency row */}
          {nodeEstimation.latency > 0 && (
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-slate-500" : "text-gray-400"}>Latency</span>
              <span className={`font-mono font-semibold ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                {(nodeEstimation.latency * 1000).toFixed(0)} ms
              </span>
            </div>
          )}
          {/* Tool latency sub-row for agents with tool connections */}
          {data.type === "agentNode" && nodeEstimation.tool_latency > 0 && (
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-amber-500/60" : "text-amber-500"}><Wrench className="inline w-3 h-3 mr-0.5" /> Tool</span>
              <span className={`font-mono font-semibold ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                +{(nodeEstimation.tool_latency * 1000).toFixed(0)} ms
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Bottleneck badge (visible when estimation exists and node has cost/latency) ── */}
      {severity && severity !== "low" && (costShare > 0 || latencyShare > 0) && (
        <div className="flex items-center justify-center gap-1 mt-1.5">
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
              severity === "high"
                ? isDark
                  ? "bg-red-900/50 text-red-300"
                  : "bg-red-100 text-red-700"
                : isDark
                ? "bg-yellow-900/50 text-yellow-300"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {severity === "high" ? <Flame className="inline w-3 h-3" /> : <Zap className="inline w-3 h-3" />}{" "}
            {Math.round(Math.max(costShare, latencyShare) * 100)}%
          </span>
        </div>
      )}

      {/* ── Loop badge (visible for nodes inside a cycle) ── */}
      {inCycle && nodeCycle && (
        <div className="flex items-center justify-center gap-1 mt-1">
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
              nodeCycle.risk_level === "critical"
                ? isDark ? "bg-red-900/60 text-red-200" : "bg-red-100 text-red-800"
                : nodeCycle.risk_level === "high"
                ? isDark ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-700"
                : nodeCycle.risk_level === "medium"
                ? isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"
                : isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-600"
            }`}
          >
            <RefreshCw className="inline w-3 h-3 mr-0.5" /> Loop ×{nodeCycle.expected_iterations}
            {nodeCycle.risk_level && nodeCycle.risk_level !== "low" && (
              <span className="ml-0.5">
                {nodeCycle.risk_level === "critical" ? <ShieldAlert className="inline w-3 h-3" /> : nodeCycle.risk_level === "high" ? <AlertTriangle className="inline w-3 h-3" /> : ""}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Outgoing handle */}
      {data.type !== "finishNode" && (
        <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2.5 !h-2.5" />
      )}
    </div>
  );
}

export default memo(WorkflowNode);
