"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  type NodeProps,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Brain,
  Wrench,
  Flag,
  BarChart3,
  Zap,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Mini workflow node — simplified version for the landing page
   ═══════════════════════════════════════════════════════════ */

const NODE_STYLE: Record<
  string,
  { bg: string; border: string; icon: React.FC<{ className?: string }>; accent: string }
> = {
  startNode: { bg: "bg-green-50", border: "border-green-400", icon: Play, accent: "text-green-600" },
  agentNode: { bg: "bg-blue-50", border: "border-blue-400", icon: Brain, accent: "text-blue-600" },
  toolNode: { bg: "bg-orange-50", border: "border-orange-400", icon: Wrench, accent: "text-amber-600" },
  finishNode: { bg: "bg-red-50", border: "border-red-400", icon: Flag, accent: "text-red-500" },
};

function MiniNode({ data }: NodeProps) {
  const d = data as { label: string; type: string; model?: string };
  const style = NODE_STYLE[d.type] ?? NODE_STYLE.agentNode;
  const Icon = style.icon;

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-2! h-2! bg-gray-300! border-gray-400!" />
      <div
        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 shadow-sm ${style.bg} ${style.border} min-w-30`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${style.accent}`} />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-800 leading-tight">{d.label}</span>
          {d.model && (
            <span className="text-[10px] text-gray-500 leading-tight">{d.model}</span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2! h-2! bg-gray-300! border-gray-400!" />
    </>
  );
}

const miniNodeTypes = {
  startNode: MiniNode,
  agentNode: MiniNode,
  toolNode: MiniNode,
  finishNode: MiniNode,
};

/* ═══════════════════════════════════════════════════════════
   Hardcoded demo workflow
   ═══════════════════════════════════════════════════════════ */

const DEMO_NODES: Node[] = [
  {
    id: "start",
    type: "startNode",
    position: { x: 30, y: 140 },
    data: { label: "Start", type: "startNode" },
  },
  {
    id: "research",
    type: "agentNode",
    position: { x: 220, y: 50 },
    data: { label: "Research Agent", type: "agentNode", model: "GPT-4o" },
  },
  {
    id: "search",
    type: "toolNode",
    position: { x: 430, y: 50 },
    data: { label: "Web Search", type: "toolNode" },
  },
  {
    id: "writer",
    type: "agentNode",
    position: { x: 220, y: 230 },
    data: { label: "Writer Agent", type: "agentNode", model: "Claude 3.5" },
  },
  {
    id: "summarise",
    type: "agentNode",
    position: { x: 430, y: 230 },
    data: { label: "Summariser", type: "agentNode", model: "GPT-4o-mini" },
  },
  {
    id: "finish",
    type: "finishNode",
    position: { x: 640, y: 140 },
    data: { label: "Finish", type: "finishNode" },
  },
];

const DEMO_EDGES: Edge[] = [
  { id: "e1", source: "start", target: "research", animated: true },
  { id: "e2", source: "start", target: "writer", animated: true },
  { id: "e3", source: "research", target: "search", animated: true },
  { id: "e4", source: "search", target: "summarise" },
  { id: "e5", source: "writer", target: "summarise", animated: true },
  { id: "e6", source: "summarise", target: "finish", animated: true },
];

/* ═══════════════════════════════════════════════════════════
   Mock estimation report
   ═══════════════════════════════════════════════════════════ */

const MOCK_REPORT = {
  total_tokens: 14_830,
  total_cost: 0.0247,
  total_latency: 3.42,
  graph_type: "DAG" as const,
  breakdown: [
    { label: "Research Agent", tokens: 4200, cost: 0.0126, latency: 1.1, type: "agentNode" },
    { label: "Writer Agent", tokens: 5100, cost: 0.0089, latency: 0.95, type: "agentNode" },
    { label: "Web Search", tokens: 800, cost: 0.0, latency: 0.42, type: "toolNode" },
    { label: "Summariser", tokens: 4730, cost: 0.0032, latency: 0.65, type: "agentNode" },
  ],
};

const BAR_COLOURS: Record<string, string> = {
  agentNode: "#3b82f6",
  toolNode: "#f59e0b",
  startNode: "#22c55e",
  finishNode: "#ef4444",
};

/* ═══════════════════════════════════════════════════════════
   PlaygroundPreview — the full component
   ═══════════════════════════════════════════════════════════ */

export default function PlaygroundPreview() {
  const [nodes, , onNodesChange] = useNodesState(DEMO_NODES);
  const [edges] = useEdgesState(DEMO_EDGES);
  const [showReport, setShowReport] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(true);

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { strokeWidth: 2, stroke: "#9ca3af" },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#9ca3af" },
    }),
    [],
  );

  const handleRunEstimate = useCallback(() => {
    setIsRunning(true);
    setShowReport(false);
    setTimeout(() => {
      setIsRunning(false);
      setShowReport(true);
      setReportExpanded(true);
    }, 1400);
  }, []);

  /* Max bar width for the horizontal bars */
  const maxTokens = Math.max(...MOCK_REPORT.breakdown.map((b) => b.tokens));

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-border/80 bg-card shadow-xl">
      {/* ── Fake title bar ─────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/60 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-xs font-medium text-muted-foreground">
            playground — Agentic Flow
          </span>
        </div>

        <button
          onClick={handleRunEstimate}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-60"
        >
          {isRunning ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
              >
                <Zap className="h-3 w-3" />
              </motion.div>
              Estimating…
            </>
          ) : (
            <>
              <BarChart3 className="h-3 w-3" />
              Run Estimate
            </>
          )}
        </button>
      </div>

      {/* ── Canvas area ────────────────────────────────── */}
      <div className="relative h-85 sm:h-95">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={miniNodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          minZoom={0.7}
          maxZoom={1.3}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d6d3d1" />
          <Controls showInteractive={false} position="bottom-left" className="shadow-sm!" />
        </ReactFlow>

        {/* Running overlay shimmer */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex items-center gap-2 rounded-full bg-card px-5 py-2.5 shadow-lg border border-border"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                >
                  <Zap className="h-4 w-4 text-amber-500" />
                </motion.div>
                <span className="text-sm font-medium">Analysing workflow…</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Slide-up mock report ─────────────────────── */}
        <AnimatePresence>
          {showReport && (
            <motion.div
              className="absolute inset-x-0 bottom-0 z-30 max-h-[75%] overflow-y-auto rounded-t-xl border-t border-border bg-card/95 backdrop-blur-md shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              {/* Report header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-card px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-foreground" />
                  <span className="text-sm font-semibold">Estimation Report</span>
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                    {MOCK_REPORT.graph_type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setReportExpanded((p) => !p)}
                    className="rounded p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    {reportExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => setShowReport(false)}
                    className="rounded p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {reportExpanded && (
                <div className="p-4 space-y-4">
                  {/* KPI row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Zap, label: "Tokens", value: MOCK_REPORT.total_tokens.toLocaleString(), color: "text-blue-600" },
                      { icon: DollarSign, label: "Cost", value: `$${MOCK_REPORT.total_cost.toFixed(4)}`, color: "text-green-600" },
                      { icon: Clock, label: "Latency", value: `${MOCK_REPORT.total_latency.toFixed(2)}s`, color: "text-amber-600" },
                    ].map((kpi) => (
                      <div
                        key={kpi.label}
                        className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-3 py-2"
                      >
                        <kpi.icon className={`h-4 w-4 shrink-0 ${kpi.color}`} />
                        <div>
                          <p className="text-xs text-muted-foreground">{kpi.label}</p>
                          <p className="text-sm font-semibold">{kpi.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Per-node horizontal bar chart (pure CSS — no recharts dep needed in playground) */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Per-Node Token Breakdown
                    </p>
                    {MOCK_REPORT.breakdown.map((b) => (
                      <div key={b.label} className="flex items-center gap-2">
                        <span className="w-28 truncate text-xs font-medium">{b.label}</span>
                        <div className="relative h-4 flex-1 rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{ backgroundColor: BAR_COLOURS[b.type] ?? "#6b7280" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(b.tokens / maxTokens) * 100}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                        <span className="w-12 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                          {b.tokens.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
