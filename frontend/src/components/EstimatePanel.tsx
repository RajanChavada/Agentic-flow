"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  BarChart3,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  OctagonAlert,
  BrainCircuit,
  Crosshair,
  Rocket,
  Route,
  Zap,
  Flame,
  Info,
  Radio,
} from "lucide-react";
import {
  useEstimation,
  useUIState,
  useWorkflowStore,
  useScalingParams,
  useActualStats,
} from "@/store/useWorkflowStore";
import type { NodeEstimation } from "@/types/workflow";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from "recharts";

/* ── Colour palette for per-node bars ─────────────────────── */
const NODE_COLOURS: Record<string, string> = {
  agentNode: "#3b82f6",
  toolNode: "#f59e0b",
  startNode: "#22c55e",
  finishNode: "#ef4444",
};

const DOT_COLOURS: Record<string, string> = {
  agentNode: "bg-blue-500",
  toolNode: "bg-amber-500",
  startNode: "bg-green-500",
  finishNode: "bg-red-500",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function EstimatePanel() {
  const estimation = useEstimation();
  const { isEstimatePanelOpen, theme } = useUIState();
  const toggleEstimatePanel = useWorkflowStore((s) => s.toggleEstimatePanel);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const setEstimation = useWorkflowStore((s) => s.setEstimation);
  const scalingParams = useScalingParams();
  const setRunsPerDay = useWorkflowStore((s) => s.setRunsPerDay);
  const setLoopIntensity = useWorkflowStore((s) => s.setLoopIntensity);
  const actualStats = useActualStats();
  const setActualStats = useWorkflowStore((s) => s.setActualStats);
  const clearActualStats = useWorkflowStore((s) => s.clearActualStats);
  const isDark = theme === "dark";

  /* ── Fullscreen (expanded dashboard) mode ──────────────── */
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* ── Observability paste state ──────────────────────────── */
  const [showActualPaste, setShowActualPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  /* ── What-If live re-estimation ─────────────────────────── */
  const [scalingLoading, setScalingLoading] = useState(false);
  const scalingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced re-fetch when scaling params change
  useEffect(() => {
    // Only fire when we have an existing estimation and the panel is open
    if (!estimation || !isEstimatePanelOpen) return;
    // Need at least some nodes to re-estimate
    if (nodes.length === 0) return;

    if (scalingTimerRef.current) clearTimeout(scalingTimerRef.current);

    scalingTimerRef.current = setTimeout(async () => {
      setScalingLoading(true);
      try {
        const payload = {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.data.type,
            label: n.data.label,
            model_provider: n.data.modelProvider,
            model_name: n.data.modelName,
            context: n.data.context,
            tool_id: n.data.toolId,
            tool_category: n.data.toolCategory,
            max_steps: n.data.maxSteps ?? null,
            task_type: n.data.taskType ?? null,
            expected_output_size: n.data.expectedOutputSize ?? null,
            expected_calls_per_run: n.data.expectedCallsPerRun ?? null,
          })),
          edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
          recursion_limit: 25,
          runs_per_day: scalingParams.runsPerDay,
          loop_intensity: scalingParams.loopIntensity !== 1.0 ? scalingParams.loopIntensity : null,
        };
        const res = await fetch(`${API_BASE}/api/estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setEstimation(data);
        }
      } catch {
        // silently ignore — user still sees last good estimate
      } finally {
        setScalingLoading(false);
      }
    }, 600); // 600ms debounce

    return () => {
      if (scalingTimerRef.current) clearTimeout(scalingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scalingParams.runsPerDay, scalingParams.loopIntensity]);

  /* ── Resizable width state ──────────────────────────────── */
  const [width, setWidth] = useState(420);
  const isResizing = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;

    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX - ev.clientX; // dragging left → wider
      setWidth(Math.max(320, Math.min(700, startWidth + delta)));
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [width]);

  /* ── Derived data ───────────────────────────────────────── */
  const breakdownWithType = (estimation?.breakdown ?? []).map((b) => {
    const matchedNode = nodes.find((n) => n.id === b.node_id);
    return { ...b, nodeType: matchedNode?.type ?? "agentNode" };
  });

  const activeBreakdown = breakdownWithType.filter((b) => b.tokens > 0);

  const toolBreakdown = breakdownWithType.filter(
    (b) => b.nodeType === "toolNode" && b.tool_latency > 0
  );

  const chartData = activeBreakdown.map((b) => ({
    name: b.node_name,
    tokens: b.tokens,
    cost: Number(b.cost.toFixed(6)),
    latency: Number((b.latency * 1000).toFixed(1)), // ms
  }));

  const latencyData = activeBreakdown.map((b, i) => ({
    name: b.node_name,
    latency: Number((b.latency * 1000).toFixed(1)),
    idx: i,
  }));

  /* ── Don't render if closed or no data ──────────────────── */
  if (!estimation) return null;

  return (
    <>
      {/* Backdrop overlay (subtle) */}
      {isEstimatePanelOpen && (
        <div
          className={`fixed inset-0 z-40 transition-opacity ${isFullscreen ? "bg-black/40" : "bg-black/10"}`}
          onClick={isFullscreen ? undefined : toggleEstimatePanel}
        />
      )}

      {/* Sliding drawer / fullscreen overlay */}
      <div
        className={`
          fixed z-50 flex transition-all duration-300 ease-in-out
          ${isFullscreen
            ? "inset-0"
            : `top-0 right-0 h-full ${isEstimatePanelOpen ? "translate-x-0" : "translate-x-full"}`
          }
        `}
        style={isFullscreen ? undefined : { width }}
      >
        {/* Resize handle (only in sidebar mode) */}
        {!isFullscreen && (
          <div
            onMouseDown={onMouseDown}
            className={`
              w-1.5 cursor-col-resize shrink-0 transition-colors
              hover:bg-blue-400
              ${isDark ? "bg-slate-700" : "bg-gray-300"}
            `}
          />
        )}

        {/* Panel content */}
        <div
          className={`
            flex-1 flex flex-col overflow-hidden shadow-2xl
            ${isDark ? "bg-slate-900 text-slate-100" : "bg-white text-gray-900"}
            ${isFullscreen ? "rounded-none" : ""}
          `}
        >
          {/* ── Header ────────────────────────────────────── */}
          <div
            className={`
              flex items-center justify-between px-5 py-4 border-b shrink-0
              ${isDark ? "border-slate-700" : "border-gray-200"}
            `}
          >
            <div>
              <h2 className={`font-bold ${isFullscreen ? "text-lg" : "text-base"}`}>
                {isFullscreen ? <><BarChart3 className="inline w-4 h-4 mr-1.5 -mt-0.5" /> Workflow Dashboard</> : "Estimate Report"}
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                Graph type: <span className="font-semibold">{estimation.graph_type}</span>
                {isFullscreen && estimation.health && (
                  <span className="ml-2">
                    · Health: <span className="font-semibold">{estimation.health.grade}</span> ({estimation.health.score}/100)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Fullscreen toggle */}
              <button
                onClick={() => setIsFullscreen((v) => !v)}
                className={`
                  rounded-md p-1.5 transition-colors
                  ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-400"}
                `}
                title={isFullscreen ? "Exit fullscreen" : "Expand to dashboard"}
              >
                {isFullscreen ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 2v4H2M10 14v-4h4M10 2v4h4M6 14v-4H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 6V2h4M14 10v4h-4M14 6V2h-4M2 10v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              {/* Close */}
              <button
                onClick={() => { setIsFullscreen(false); toggleEstimatePanel(); }}
                className={`
                  rounded-md p-1.5 transition-colors
                  ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-400"}
                `}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Scrollable body ───────────────────────────── */}
          <div
            id="estimate-dashboard-capture"
            className={`flex-1 overflow-y-auto px-5 py-5 ${isFullscreen ? "max-w-7xl mx-auto w-full" : ""}`}
          >
           <div className={isFullscreen ? "grid grid-cols-2 gap-6" : "space-y-6"}>
            {/* ── LEFT COLUMN (in fullscreen) / sequential (in sidebar) ── */}
            <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Token + Cost card */}
              <div
                className={`
                  rounded-xl border p-4
                  ${isDark ? "bg-slate-800/60 border-slate-700" : "bg-blue-50/60 border-blue-100"}
                `}
              >
                <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Estimated Token Usage
                </p>
                {estimation.token_range ? (
                  <>
                    <p className="text-2xl font-bold mt-1">
                      {estimation.token_range.avg.toLocaleString()}
                      <span className="text-sm font-normal ml-1">Tokens</span>
                      <span className={`text-xs font-normal ml-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>(avg)</span>
                    </p>
                    <div className={`text-[10px] mt-1 flex gap-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      <span>Min: {estimation.token_range.min.toLocaleString()}</span>
                      <span>Max: {estimation.token_range.max.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-2xl font-bold mt-1">
                    {estimation.total_tokens.toLocaleString()}
                    <span className="text-sm font-normal ml-1">Tokens</span>
                  </p>
                )}
                <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Cost:{" "}
                  {estimation.cost_range ? (
                    <span className="font-semibold">
                      ${estimation.cost_range.min.toFixed(4)} – ${estimation.cost_range.max.toFixed(4)}
                    </span>
                  ) : (
                    <span className="font-semibold">${estimation.total_cost.toFixed(4)}</span>
                  )}
                </p>

                {/* Mini per-node colour bars */}
                <div className="flex items-center gap-3 mt-3">
                  {activeBreakdown.map((b) => (
                    <div key={b.node_id} className="flex items-center gap-1">
                      <span
                        className={`inline-block w-3 h-3 rounded-sm ${DOT_COLOURS[b.nodeType] ?? "bg-blue-500"}`}
                      />
                      <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {b.node_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latency card */}
              <div
                className={`
                  rounded-xl border p-4
                  ${isDark ? "bg-slate-800/60 border-slate-700" : "bg-green-50/60 border-green-100"}
                `}
              >
                <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Estimated Latency
                </p>
                {estimation.latency_range ? (
                  <>
                    <p className="text-2xl font-bold mt-1">
                      {estimation.latency_range.avg.toFixed(2)}
                      <span className="text-sm font-normal ml-1">Seconds</span>
                      <span className={`text-xs font-normal ml-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>(avg)</span>
                    </p>
                    <div className={`text-[10px] mt-1 flex gap-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      <span>Min: {estimation.latency_range.min.toFixed(2)}s</span>
                      <span>Max: {estimation.latency_range.max.toFixed(2)}s</span>
                    </div>
                  </>
                ) : (
                  <p className="text-2xl font-bold mt-1">
                    {estimation.total_latency.toFixed(2)}
                    <span className="text-sm font-normal ml-1">Seconds</span>
                  </p>
                )}
                {estimation.total_tool_latency > 0 && (
                  <p className={`text-xs mt-1 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                    <Wrench className="inline w-3 h-3 mr-0.5" /> Tool latency: {(estimation.total_tool_latency * 1000).toFixed(0)} ms
                  </p>
                )}
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  P95 Latency Estimate
                </p>

                {/* Sparkline */}
                {latencyData.length > 1 && (
                  <div className="mt-2 h-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={latencyData}>
                        <Line
                          type="monotone"
                          dataKey="latency"
                          stroke={isDark ? "#60a5fa" : "#3b82f6"}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* ── Health Score Badge ───────────────────────── */}
            {estimation.health && (
              <div className={`rounded-lg border p-4 ${isDark ? "border-slate-700 bg-slate-800/50" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-3">
                  {/* Grade circle */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-xl font-black
                    ${estimation.health.grade === "A" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                      estimation.health.grade === "B" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" :
                      estimation.health.grade === "C" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" :
                      estimation.health.grade === "D" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}
                  `}>
                    {estimation.health.grade}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                        Workflow Health
                      </span>
                      <span className={`text-xs font-mono ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {estimation.health.score}/100
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          estimation.health.score >= 85 ? "bg-green-500" :
                          estimation.health.score >= 70 ? "bg-blue-500" :
                          estimation.health.score >= 55 ? "bg-yellow-500" :
                          estimation.health.score >= 40 ? "bg-orange-500" :
                          "bg-red-500"
                        }`}
                        style={{ width: `${estimation.health.score}%` }}
                      />
                    </div>
                    {/* Badges */}
                    {estimation.health.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {estimation.health.badges.map((badge) => {
                          const isGood = ["Cost-efficient", "Loop-free", "Budget-friendly"].includes(badge);
                          return (
                            <span
                              key={badge}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isGood
                                  ? isDark ? "bg-green-900/40 text-green-300 border border-green-700" : "bg-green-100 text-green-700 border border-green-200"
                                  : isDark ? "bg-red-900/40 text-red-300 border border-red-700" : "bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {isGood ? <CheckCircle2 className="inline w-3 h-3 mr-0.5" /> : <AlertTriangle className="inline w-3 h-3 mr-0.5" />} {badge}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {/* Factor breakdown (collapsible feel — always show) */}
                <div className={`grid grid-cols-4 gap-1.5 mt-3 text-center`}>
                  {(["cost_concentration", "loop_risk", "premium_models", "latency_balance"] as const).map((factor) => {
                    const d = estimation.health!.details[factor];
                    if (!d) return null;
                    const labels: Record<string, string> = {
                      cost_concentration: "Cost",
                      loop_risk: "Loops",
                      premium_models: "Models",
                      latency_balance: "Latency",
                    };
                    const s = d.score as number;
                    return (
                      <div
                        key={factor}
                        className={`rounded-md py-1.5 px-1 ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}
                      >
                        <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {labels[factor]}
                        </div>
                        <div className={`text-xs font-bold ${
                          s >= 20 ? (isDark ? "text-green-300" : "text-green-600") :
                          s >= 15 ? (isDark ? "text-blue-300" : "text-blue-600") :
                          s >= 10 ? (isDark ? "text-yellow-300" : "text-yellow-600") :
                          (isDark ? "text-red-300" : "text-red-600")
                        }`}>
                          {s}/25
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Top Bottlenecks ──────────────────────────── */}
            {(() => {
              const bottlenecks = breakdownWithType
                .filter((b) => b.bottleneck_severity === "high" || b.bottleneck_severity === "medium")
                .sort((a, b) => Math.max(b.cost_share ?? 0, b.latency_share ?? 0) - Math.max(a.cost_share ?? 0, a.latency_share ?? 0))
                .slice(0, 5);

              if (bottlenecks.length === 0) return null;

              return (
                <div
                  className={`
                    rounded-xl border p-4
                    ${isDark ? "bg-red-900/10 border-red-900/40" : "bg-red-50/60 border-red-100"}
                  `}
                >
                  <h3 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${isDark ? "text-red-300" : "text-red-700"}`}>
                    <Flame className="w-4 h-4" /> Top Bottlenecks
                  </h3>
                  <div className="space-y-2">
                    {bottlenecks.map((b, rank) => {
                      const costPct = Math.round((b.cost_share ?? 0) * 100);
                      const latencyPct = Math.round((b.latency_share ?? 0) * 100);
                      const isHigh = b.bottleneck_severity === "high";
                      return (
                        <div
                          key={b.node_id}
                          className={`
                            flex items-center gap-3 rounded-lg border p-2.5
                            ${isHigh
                              ? isDark ? "bg-red-900/20 border-red-800/50" : "bg-red-50 border-red-200"
                              : isDark ? "bg-yellow-900/20 border-yellow-800/50" : "bg-yellow-50 border-yellow-200"
                            }
                          `}
                        >
                          <span className={`text-xs font-bold w-5 text-center ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            #{rank + 1}
                          </span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              DOT_COLOURS[b.nodeType] ?? "bg-blue-500"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium truncate ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                              {b.node_name}
                            </div>
                            <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {b.model_provider && `${b.model_provider} / ${b.model_name}`}
                              {b.nodeType === "toolNode" && b.tool_id && `Tool: ${b.tool_id}`}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="text-center">
                                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>Cost</div>
                                <div className={`text-xs font-bold tabular-nums ${
                                  costPct >= 40
                                    ? isDark ? "text-red-400" : "text-red-600"
                                    : costPct >= 20
                                    ? isDark ? "text-yellow-400" : "text-yellow-600"
                                    : isDark ? "text-slate-300" : "text-gray-600"
                                }`}>
                                  {costPct}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>Latency</div>
                                <div className={`text-xs font-bold tabular-nums ${
                                  latencyPct >= 40
                                    ? isDark ? "text-red-400" : "text-red-600"
                                    : latencyPct >= 20
                                    ? isDark ? "text-yellow-400" : "text-yellow-600"
                                    : isDark ? "text-slate-300" : "text-gray-600"
                                }`}>
                                  {latencyPct}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Detected Cycles Banner ──────────────────── */}
            {estimation.detected_cycles && estimation.detected_cycles.length > 0 && (
              <div
                className={`
                  rounded-xl border p-4
                  ${isDark ? "bg-purple-900/20 border-purple-800" : "bg-purple-50 border-purple-200"}
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base"><RefreshCw className="w-4 h-4" /></span>
                  <h3 className={`text-sm font-semibold ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                    {estimation.detected_cycles.length} Cycle{estimation.detected_cycles.length > 1 ? "s" : ""} Detected
                  </h3>
                  <span className={`text-[10px] ml-auto ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Recursion limit: {estimation.recursion_limit}
                  </span>
                </div>
                {estimation.detected_cycles.map((cycle) => {
                  const costPct = Math.round((cycle.cost_contribution ?? 0) * 100);
                  const latencyPct = Math.round((cycle.latency_contribution ?? 0) * 100);
                  const risk = cycle.risk_level;
                  const riskColour =
                    risk === "critical"
                      ? isDark ? "bg-red-900/60 text-red-200 border-red-700" : "bg-red-100 text-red-800 border-red-300"
                      : risk === "high"
                      ? isDark ? "bg-orange-900/50 text-orange-300 border-orange-700" : "bg-orange-100 text-orange-700 border-orange-300"
                      : risk === "medium"
                      ? isDark ? "bg-yellow-900/40 text-yellow-300 border-yellow-700" : "bg-yellow-100 text-yellow-700 border-yellow-300"
                      : isDark ? "bg-slate-800 text-slate-400 border-slate-600" : "bg-gray-100 text-gray-600 border-gray-300";
                  const riskIcon = risk === "critical" ? <ShieldAlert className="inline w-3.5 h-3.5" /> : risk === "high" ? <AlertTriangle className="inline w-3.5 h-3.5" /> : risk === "medium" ? <OctagonAlert className="inline w-3.5 h-3.5" /> : <CheckCircle2 className="inline w-3.5 h-3.5" />;

                  return (
                    <div
                      key={cycle.cycle_id}
                      className={`
                        rounded-lg border p-3 mb-2 last:mb-0
                        ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-purple-100"}
                      `}
                    >
                      {/* Loop header: name + risk badge */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                            Loop #{cycle.cycle_id + 1}
                          </span>
                          {/* Risk badge */}
                          {risk && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${riskColour}`}
                              title={cycle.risk_reason ?? ""}
                            >
                              {riskIcon} {risk.charAt(0).toUpperCase() + risk.slice(1)} risk
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          <span className="font-medium">{cycle.expected_iterations}</span> avg ·{" "}
                          <span className="font-medium">{cycle.max_iterations}</span> max iterations
                        </div>
                      </div>

                      {/* Cycle node chain */}
                      <div className="flex flex-wrap items-center gap-1 mb-2">
                        {cycle.node_labels.map((label, i) => (
                          <React.Fragment key={i}>
                            <span
                              className={`
                                text-[10px] px-1.5 py-0.5 rounded font-medium
                                ${isDark ? "bg-purple-900/40 text-purple-300" : "bg-purple-100 text-purple-700"}
                              `}
                            >
                              {label}
                            </span>
                            {i < cycle.node_labels.length - 1 && (
                              <span className={`text-[10px] ${isDark ? "text-slate-600" : "text-gray-300"}`}>→</span>
                            )}
                          </React.Fragment>
                        ))}
                        <span className={`text-[10px] ${isDark ? "text-slate-600" : "text-gray-300"}`}>↩</span>
                      </div>

                      {/* Per-lap metrics + contribution */}
                      <div className={`
                        grid grid-cols-2 gap-2 rounded-md border p-2
                        ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-gray-50 border-gray-100"}
                      `}>
                        {/* Per-lap cost info */}
                        <div>
                          <div className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            Per Lap
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                            {(cycle.tokens_per_lap ?? 0).toLocaleString()} tokens
                          </div>
                          <div className={`text-[10px] ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                            ${(cycle.cost_per_lap ?? 0).toFixed(6)} · {((cycle.latency_per_lap ?? 0) * 1000).toFixed(1)} ms
                          </div>
                        </div>

                        {/* Contribution to total */}
                        <div>
                          <div className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            % of Total (avg-case)
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="text-center">
                              <div className={`text-[9px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>Cost</div>
                              <div className={`text-xs font-bold tabular-nums ${
                                costPct >= 50
                                  ? isDark ? "text-red-400" : "text-red-600"
                                  : costPct >= 25
                                  ? isDark ? "text-yellow-400" : "text-yellow-600"
                                  : isDark ? "text-slate-300" : "text-gray-600"
                              }`}>
                                {costPct}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className={`text-[9px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>Latency</div>
                              <div className={`text-xs font-bold tabular-nums ${
                                latencyPct >= 50
                                  ? isDark ? "text-red-400" : "text-red-600"
                                  : latencyPct >= 25
                                  ? isDark ? "text-yellow-400" : "text-yellow-600"
                                  : isDark ? "text-slate-300" : "text-gray-600"
                              }`}>
                                {latencyPct}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Risk reason (tooltip-like) */}
                      {cycle.risk_reason && (
                        <div className={`text-[9px] mt-1.5 italic flex items-center gap-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          <Info className="w-3 h-3 shrink-0" />
                          {cycle.risk_reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Model & Tool Mix Analysis ─────────────── */}
            {(() => {
              // Aggregate cost and latency by model
              const modelMap = new Map<string, { cost: number; latency: number; tokens: number; count: number }>();
              for (const b of breakdownWithType) {
                if (b.model_provider && b.model_name && (b.cost > 0 || b.latency > 0)) {
                  const key = `${b.model_provider} / ${b.model_name}`;
                  const prev = modelMap.get(key) ?? { cost: 0, latency: 0, tokens: 0, count: 0 };
                  modelMap.set(key, {
                    cost: prev.cost + b.cost,
                    latency: prev.latency + b.latency,
                    tokens: prev.tokens + b.tokens,
                    count: prev.count + 1,
                  });
                }
              }
              const modelData = Array.from(modelMap.entries())
                .map(([name, v]) => ({ name, ...v }))
                .sort((a, b) => b.cost - a.cost);

              const totalCost = estimation.total_cost || 1;
              const totalLatency = estimation.total_latency || 1;

              // Aggregate tool impact (from tool_impacts on agent nodes + direct tool nodes)
              const toolMap = new Map<string, { latency: number; schemaTokens: number; responseTokens: number; count: number }>();
              for (const b of breakdownWithType) {
                if (b.tool_impacts) {
                  for (const ti of b.tool_impacts) {
                    const key = ti.tool_name;
                    const prev = toolMap.get(key) ?? { latency: 0, schemaTokens: 0, responseTokens: 0, count: 0 };
                    toolMap.set(key, {
                      latency: prev.latency + ti.execution_latency,
                      schemaTokens: prev.schemaTokens + ti.schema_tokens,
                      responseTokens: prev.responseTokens + ti.response_tokens,
                      count: prev.count + 1,
                    });
                  }
                }
                // Also count direct tool nodes
                if (b.nodeType === "toolNode" && b.tool_latency > 0) {
                  const key = b.node_name;
                  const prev = toolMap.get(key) ?? { latency: 0, schemaTokens: 0, responseTokens: 0, count: 0 };
                  toolMap.set(key, {
                    latency: prev.latency + b.tool_latency,
                    schemaTokens: prev.schemaTokens + b.tool_schema_tokens,
                    responseTokens: prev.responseTokens + b.tool_response_tokens,
                    count: prev.count + 1,
                  });
                }
              }
              const toolData = Array.from(toolMap.entries())
                .map(([name, v]) => ({
                  name,
                  ...v,
                  latencyPct: Math.round((v.latency / totalLatency) * 100),
                }))
                .sort((a, b) => b.latency - a.latency);

              if (modelData.length === 0 && toolData.length === 0) return null;

              // Colour palette for pie slices
              const PIE_COLOURS = ["#3b82f6", "#f59e0b", "#ef4444", "#22c55e", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

              return (
                <div className="space-y-4">
                  {/* Model cost mix */}
                  {modelData.length > 0 && (
                    <div>
                      <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                        <BrainCircuit className="inline w-4 h-4 mr-1 -mt-0.5" /> Model Mix — Cost
                      </h3>
                      <div className="flex items-start gap-4">
                        {/* Pie chart */}
                        <div className="h-32 w-32 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={modelData.map((m) => ({ name: m.name, value: Number(m.cost.toFixed(6)) }))}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={55}
                                innerRadius={30}
                                strokeWidth={1}
                                stroke={isDark ? "#1e293b" : "#ffffff"}
                              >
                                {modelData.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                                  borderColor: isDark ? "#475569" : "#e5e7eb",
                                  color: isDark ? "#e2e8f0" : "#1f2937",
                                  borderRadius: 8,
                                  fontSize: 11,
                                }}
                                formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(6)}`, "Cost"]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Legend + metrics */}
                        <div className="flex-1 space-y-1.5">
                          {modelData.map((m, i) => {
                            const costPct = Math.round((m.cost / totalCost) * 100);
                            const latencyPct = Math.round((m.latency / totalLatency) * 100);
                            return (
                              <div key={m.name} className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                                  style={{ backgroundColor: PIE_COLOURS[i % PIE_COLOURS.length] }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-medium truncate ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                                    {m.name}
                                    <span className={`ml-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                      ({m.count} node{m.count > 1 ? "s" : ""})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <div className={`text-[9px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>Cost</div>
                                    <div className={`text-[10px] font-bold tabular-nums ${
                                      costPct >= 60 ? (isDark ? "text-red-400" : "text-red-600") :
                                      costPct >= 30 ? (isDark ? "text-yellow-400" : "text-yellow-600") :
                                      (isDark ? "text-slate-300" : "text-gray-600")
                                    }`}>
                                      {costPct}%
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-[9px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>Latency</div>
                                    <div className={`text-[10px] font-bold tabular-nums ${
                                      latencyPct >= 60 ? (isDark ? "text-red-400" : "text-red-600") :
                                      latencyPct >= 30 ? (isDark ? "text-yellow-400" : "text-yellow-600") :
                                      (isDark ? "text-slate-300" : "text-gray-600")
                                    }`}>
                                      {latencyPct}%
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tool impact ranking */}
                  {toolData.length > 0 && (
                    <div>
                      <h3 className={`text-sm font-semibold mb-2 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                        <Wrench className="inline w-4 h-4 mr-1 -mt-0.5" /> Tool Impact
                      </h3>
                      <div className="space-y-1.5">
                        {toolData.map((t) => (
                          <div
                            key={t.name}
                            className={`
                              flex items-center gap-2 rounded-lg border px-3 py-2
                              ${isDark ? "bg-amber-900/10 border-amber-900/30" : "bg-amber-50/60 border-amber-100"}
                            `}
                          >
                            <span className={`text-[10px] ${isDark ? "text-amber-400" : "text-amber-600"}`}><Wrench className="w-3 h-3" /></span>
                            <div className="flex-1 min-w-0">
                              <div className={`text-[10px] font-medium truncate ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                                {t.name}
                              </div>
                              <div className={`text-[9px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                +{t.schemaTokens} schema · +{t.responseTokens} response tokens
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className={`text-[10px] font-bold tabular-nums ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                                {(t.latency * 1000).toFixed(0)} ms
                              </div>
                              <div className={`text-[9px] tabular-nums ${
                                t.latencyPct >= 30 ? (isDark ? "text-red-400" : "text-red-600") :
                                t.latencyPct >= 15 ? (isDark ? "text-yellow-400" : "text-yellow-600") :
                                (isDark ? "text-slate-500" : "text-gray-400")
                              }`}>
                                {t.latencyPct}% of latency
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── What-If Scaling ──────────────────────── */}
            <div className={`rounded-lg border p-4 ${isDark ? "border-slate-700 bg-slate-800/50" : "border-purple-200 bg-purple-50/30"}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                  <BarChart3 className="inline w-4 h-4 mr-1 -mt-0.5" /> What-If Scaling
                </h3>
                {scalingLoading && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full animate-pulse ${isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-600"}`}>
                    Updating…
                  </span>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-3 mb-4">
                {/* Runs per day slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                      Runs / day
                    </label>
                    <span className={`text-xs font-mono font-bold ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                      {scalingParams.runsPerDay ?? "—"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={100}
                    value={scalingParams.runsPerDay ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRunsPerDay(v > 0 ? v : null);
                    }}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-purple-500"
                    style={{ background: isDark ? "#334155" : "#e2e8f0" }}
                  />
                  <div className={`flex justify-between text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    <span>Off</span>
                    <span>10k</span>
                  </div>
                </div>

                {/* Loop intensity slider (only when cycles detected) */}
                {estimation.detected_cycles.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                        Loop intensity
                      </label>
                      <span className={`text-xs font-mono font-bold ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                        {scalingParams.loopIntensity.toFixed(1)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={5.0}
                      step={0.1}
                      value={scalingParams.loopIntensity}
                      onChange={(e) => setLoopIntensity(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-purple-500"
                      style={{ background: isDark ? "#334155" : "#e2e8f0" }}
                    />
                    <div className={`flex justify-between text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      <span>0.1×</span>
                      <span>1× (baseline)</span>
                      <span>5×</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sensitivity readout (always shown) */}
              {estimation.sensitivity && (
                <div className={`rounded-md border p-3 mb-3 ${isDark ? "border-slate-600 bg-slate-800" : "border-gray-200 bg-white"}`}>
                  <div className={`text-xs font-semibold mb-2 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                    <Crosshair className="inline w-3.5 h-3.5 mr-1" /> Sensitivity (min → avg → max)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Cost range</div>
                      <div className={`text-xs font-mono ${isDark ? "text-green-300" : "text-green-700"}`}>
                        ${estimation.sensitivity.cost_min.toFixed(4)} → <span className="font-bold">${estimation.sensitivity.cost_avg.toFixed(4)}</span> → ${estimation.sensitivity.cost_max.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Latency range</div>
                      <div className={`text-xs font-mono ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                        {estimation.sensitivity.latency_min.toFixed(2)}s → <span className="font-bold">{estimation.sensitivity.latency_avg.toFixed(2)}s</span> → {estimation.sensitivity.latency_max.toFixed(2)}s
                      </div>
                    </div>
                  </div>
                  {/* Spread indicator */}
                  {estimation.sensitivity.cost_max > 0 && estimation.sensitivity.cost_min > 0 && (
                    <div className={`mt-2 text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Cost spread: <span className="font-bold">
                        {(estimation.sensitivity.cost_max / estimation.sensitivity.cost_min).toFixed(1)}×
                      </span>
                      {" · "}Latency spread: <span className="font-bold">
                        {(estimation.sensitivity.latency_max / Math.max(0.001, estimation.sensitivity.latency_min)).toFixed(1)}×
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Scaling projection cards (when runs_per_day set) */}
              {estimation.scaling_projection && (
                <div className={`rounded-md border p-3 ${isDark ? "border-slate-600 bg-slate-800" : "border-gray-200 bg-white"}`}>
                  <div className={`text-xs font-semibold mb-2 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                    <Rocket className="inline w-3.5 h-3.5 mr-1" /> Monthly Projection ({estimation.scaling_projection.runs_per_day.toLocaleString()} runs/day)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-md p-2 text-center ${isDark ? "bg-green-900/30 border border-green-800" : "bg-green-50 border border-green-200"}`}>
                      <div className={`text-[10px] uppercase ${isDark ? "text-green-400" : "text-green-600"}`}>Monthly cost</div>
                      <div className={`text-sm font-bold font-mono ${isDark ? "text-green-300" : "text-green-700"}`}>
                        ${estimation.scaling_projection.monthly_cost < 1
                          ? estimation.scaling_projection.monthly_cost.toFixed(4)
                          : estimation.scaling_projection.monthly_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className={`rounded-md p-2 text-center ${isDark ? "bg-blue-900/30 border border-blue-800" : "bg-blue-50 border border-blue-200"}`}>
                      <div className={`text-[10px] uppercase ${isDark ? "text-blue-400" : "text-blue-600"}`}>Monthly tokens</div>
                      <div className={`text-sm font-bold font-mono ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                        {(estimation.scaling_projection.monthly_tokens / 1_000_000).toFixed(1)}M
                      </div>
                    </div>
                    <div className={`rounded-md p-2 text-center ${isDark ? "bg-amber-900/30 border border-amber-800" : "bg-amber-50 border border-amber-200"}`}>
                      <div className={`text-[10px] uppercase ${isDark ? "text-amber-400" : "text-amber-600"}`}>Compute time</div>
                      <div className={`text-sm font-bold font-mono ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                        {estimation.scaling_projection.monthly_compute_seconds < 3600
                          ? `${(estimation.scaling_projection.monthly_compute_seconds / 60).toFixed(0)} min`
                          : `${(estimation.scaling_projection.monthly_compute_seconds / 3600).toFixed(1)} hrs`}
                      </div>
                    </div>
                    <div className={`rounded-md p-2 text-center ${isDark ? "bg-purple-900/30 border border-purple-800" : "bg-purple-50 border border-purple-200"}`}>
                      <div className={`text-[10px] uppercase ${isDark ? "text-purple-400" : "text-purple-600"}`}>Per 1K runs</div>
                      <div className={`text-sm font-bold font-mono ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                        ${estimation.scaling_projection.cost_per_1k_runs < 1
                          ? estimation.scaling_projection.cost_per_1k_runs.toFixed(4)
                          : estimation.scaling_projection.cost_per_1k_runs.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hint to set runs_per_day */}
              {!estimation.scaling_projection && (
                <div className={`text-[10px] text-center py-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  Drag the <strong>Runs / day</strong> slider above to see monthly projections
                </div>
              )}
            </div>

            </div>{/* end left column */}

            {/* ── RIGHT COLUMN (in fullscreen) / continues sequentially (in sidebar) ── */}
            <div className="space-y-6">

            {/* ── Actual vs Estimated (Observability) ──────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                  <Radio className="inline w-4 h-4 mr-1 -mt-0.5" /> Actual vs Estimated
                </h3>
                {actualStats.length > 0 ? (
                  <button
                    onClick={() => { clearActualStats(); setPasteValue(""); setPasteError(null); setShowActualPaste(false); }}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    onClick={() => setShowActualPaste((v) => !v)}
                    className={`text-[10px] px-2 py-0.5 rounded transition ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                  >
                    {showActualPaste ? "Cancel" : "Paste JSON"}
                  </button>
                )}
              </div>

              {showActualPaste && actualStats.length === 0 && (
                <div className="mb-3">
                  <textarea
                    value={pasteValue}
                    onChange={(e) => { setPasteValue(e.target.value); setPasteError(null); }}
                    placeholder={`[\n  { "node_id": "2", "actual_tokens": 500, "actual_latency": 1.2, "actual_cost": 0.003 }\n]`}
                    rows={5}
                    className={`w-full rounded-md border p-2 text-xs font-mono resize-y ${isDark ? "bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500" : "bg-white border-gray-300 text-gray-800 placeholder-gray-400"}`}
                  />
                  {pasteError && <div className="text-[10px] text-red-400 mt-1">{pasteError}</div>}
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(pasteValue);
                        if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
                        for (const item of parsed) {
                          if (typeof item.node_id !== "string") throw new Error(`Each entry needs a string "node_id"`);
                        }
                        setActualStats(parsed);
                        setShowActualPaste(false);
                        setPasteError(null);
                      } catch (err: unknown) {
                        setPasteError(err instanceof Error ? err.message : "Invalid JSON");
                      }
                    }}
                    disabled={!pasteValue.trim()}
                    className={`mt-2 w-full text-xs font-semibold py-1.5 rounded-md transition ${pasteValue.trim() ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
                  >
                    Load Actual Stats
                  </button>
                </div>
              )}

              {actualStats.length > 0 && estimation && (
                <div className={`rounded-md border overflow-hidden mb-3 ${isDark ? "border-slate-600" : "border-gray-200"}`}>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className={isDark ? "bg-slate-800" : "bg-gray-100"}>
                        <th className={`text-left px-2 py-1.5 font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>Node</th>
                        <th className={`text-right px-2 py-1.5 font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>Est. Tokens</th>
                        <th className={`text-right px-2 py-1.5 font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>Act. Tokens</th>
                        <th className={`text-right px-2 py-1.5 font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actualStats.map((actual) => {
                        const estNode = estimation.breakdown.find((n: NodeEstimation) => n.node_id === actual.node_id);
                        const estTokens = estNode?.tokens ?? 0;
                        const actTokens = actual.actual_tokens ?? 0;
                        const diff = estTokens > 0 ? ((actTokens - estTokens) / estTokens) * 100 : 0;
                        const diffColor = diff > 10 ? "text-red-400" : diff < -10 ? "text-green-400" : isDark ? "text-slate-400" : "text-gray-500";
                        return (
                          <tr key={actual.node_id} className={isDark ? "border-t border-slate-700" : "border-t border-gray-100"}>
                            <td className={`px-2 py-1.5 font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                              {estNode?.node_name ?? actual.node_id}
                            </td>
                            <td className={`text-right px-2 py-1.5 font-mono ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {estTokens.toLocaleString()}
                            </td>
                            <td className={`text-right px-2 py-1.5 font-mono ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                              {actTokens.toLocaleString()}
                            </td>
                            <td className={`text-right px-2 py-1.5 font-mono font-semibold ${diffColor}`}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {actualStats.length === 0 && !showActualPaste && (
                <div className={`text-[10px] text-center py-3 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  Paste actual run stats (JSON) to compare against estimates
                </div>
              )}
            </div>

            {/* ── Token distribution bar chart ────────────── */}
            {chartData.length > 0 && (
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                  Token Distribution
                </h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "#334155" : "#e5e7eb"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#1e293b" : "#ffffff",
                          borderColor: isDark ? "#475569" : "#e5e7eb",
                          color: isDark ? "#e2e8f0" : "#1f2937",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={NODE_COLOURS[activeBreakdown[i]?.nodeType] ?? "#3b82f6"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Detailed Breakdown Table ────────────────── */}
            <div>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                Detailed Breakdown
              </h3>
              <div
                className={`
                  rounded-lg border overflow-hidden
                  ${isDark ? "border-slate-700" : "border-gray-200"}
                `}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={isDark ? "bg-slate-800 text-slate-400" : "bg-gray-50 text-gray-500"}
                    >
                      <th className="text-left px-4 py-2.5 font-medium">Node</th>
                      <th className="text-right px-4 py-2.5 font-medium">In / Out</th>
                      <th className="text-right px-4 py-2.5 font-medium">Cost</th>
                      <th className="text-right px-4 py-2.5 font-medium">Latency</th>
                      <th className="text-right px-4 py-2.5 font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownWithType.map((b) => (
                      <React.Fragment key={b.node_id}>
                        <tr
                          className={`
                            border-t transition-colors
                            ${isDark
                              ? "border-slate-700 hover:bg-slate-800/50"
                              : "border-gray-100 hover:bg-gray-50"
                            }
                          `}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                  DOT_COLOURS[b.nodeType] ?? "bg-blue-500"
                                }`}
                              />
                              <div>
                                <div className="font-medium">{b.node_name}</div>
                                {b.model_provider && b.model_name && (
                                  <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                    {b.model_provider} / {b.model_name}
                                  </div>
                                )}
                                {b.nodeType === "toolNode" && b.tool_id && (
                                  <div className={`text-[10px] ${isDark ? "text-amber-500" : "text-amber-600"}`}>
                                    <Wrench className="inline w-3 h-3 mr-0.5" /> {b.tool_id}
                                  </div>
                                )}
                                {b.in_cycle && (
                                  <div className={`text-[10px] ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                                    <RefreshCw className="inline w-3 h-3 mr-0.5" /> in cycle
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-right px-4 py-2.5 tabular-nums">
                            {b.tokens > 0 ? (
                              <>
                                <div>{b.input_tokens.toLocaleString()} in</div>
                                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                  {b.output_tokens.toLocaleString()} out
                                </div>
                              </>
                            ) : b.nodeType === "toolNode" ? (
                              <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                ~{b.tool_response_tokens} resp
                              </div>
                            ) : (
                              <span className={isDark ? "text-slate-600" : "text-gray-300"}>—</span>
                            )}
                          </td>
                          <td className="text-right px-4 py-2.5 tabular-nums">
                            {b.cost > 0 ? (
                              <>
                                <div>${b.cost.toFixed(6)}</div>
                                {b.input_cost > 0 && (
                                  <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                    ${b.input_cost.toFixed(6)} + ${b.output_cost.toFixed(6)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className={isDark ? "text-slate-600" : "text-gray-300"}>—</span>
                            )}
                          </td>
                          <td className="text-right px-4 py-2.5 tabular-nums">
                            {b.latency > 0 ? (
                              <>
                                <div>{(b.latency * 1000).toFixed(1)} ms</div>
                                {b.tool_latency > 0 && b.nodeType === "agentNode" && (
                                  <div className={`text-[10px] ${isDark ? "text-amber-500" : "text-amber-600"}`}>
                                    <Wrench className="inline w-3 h-3 mr-0.5" /> {(b.tool_latency * 1000).toFixed(0)} ms
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className={isDark ? "text-slate-600" : "text-gray-300"}>—</span>
                            )}
                          </td>
                          <td className="text-right px-4 py-2.5 tabular-nums">
                            {(b.cost_share > 0 || b.latency_share > 0) ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                    b.bottleneck_severity === "high"
                                      ? isDark ? "bg-red-900/50 text-red-300" : "bg-red-100 text-red-600"
                                      : b.bottleneck_severity === "medium"
                                      ? isDark ? "bg-yellow-900/50 text-yellow-300" : "bg-yellow-100 text-yellow-600"
                                      : isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {Math.round(Math.max(b.cost_share, b.latency_share) * 100)}%
                                </span>
                              </div>
                            ) : (
                              <span className={isDark ? "text-slate-600" : "text-gray-300"}>—</span>
                            )}
                          </td>
                        </tr>
                        {/* Tool impact sub-rows for agent nodes */}
                        {b.tool_impacts && b.tool_impacts.length > 0 && (
                          <tr
                            className={isDark ? "bg-slate-800/30" : "bg-amber-50/30"}
                          >
                            <td colSpan={5} className="px-6 py-1.5">
                              <div className={`text-[10px] ${isDark ? "text-amber-400/80" : "text-amber-700"}`}>
                                {b.tool_impacts.map((ti) => (
                                  <div key={ti.tool_node_id} className="flex justify-between py-0.5">
                                    <span>↳ {ti.tool_name}</span>
                                    <span className="tabular-nums">
                                      +{ti.schema_tokens} schema · +{ti.response_tokens} resp · {(ti.execution_latency * 1000).toFixed(0)} ms
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr
                      className={`
                        border-t font-semibold
                        ${isDark ? "border-slate-600 bg-slate-800" : "border-gray-200 bg-gray-50"}
                      `}
                    >
                      <td className="px-4 py-2.5">Total</td>
                      <td className="text-right px-4 py-2.5 tabular-nums">
                        <div>{estimation.total_input_tokens.toLocaleString()} in</div>
                        <div className={`text-[10px] font-normal ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {estimation.total_output_tokens.toLocaleString()} out
                        </div>
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums">
                        ${estimation.total_cost.toFixed(6)}
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums">
                        {(estimation.total_latency * 1000).toFixed(1)} ms
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-[10px]">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── Critical Path & Parallelism ────────────── */}
            {estimation.critical_path.length > 0 && (
              <div className="space-y-4">
                {/* Critical path with latency */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                      <Route className="inline w-4 h-4 mr-1 -mt-0.5" /> Critical Path
                    </h3>
                    {estimation.critical_path_latency > 0 && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isDark ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700"
                      }`}>
                        {(estimation.critical_path_latency * 1000).toFixed(1)} ms total
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {estimation.critical_path.map((nodeId, i) => {
                      const node = nodes.find((n) => n.id === nodeId);
                      const label = node?.data?.label ?? nodeId;
                      const brkdown = estimation.breakdown?.find((b) => b.node_id === nodeId);
                      const latMs = brkdown ? (brkdown.latency * 1000).toFixed(0) : null;
                      return (
                        <React.Fragment key={nodeId}>
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`
                                text-xs px-2 py-1 rounded-md font-medium border
                                ${isDark ? "bg-blue-900/30 border-blue-700 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"}
                              `}
                            >
                              {label}
                            </span>
                            {latMs && latMs !== "0" && (
                              <span className={`text-[9px] tabular-nums ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                {latMs} ms
                              </span>
                            )}
                          </div>
                          {i < estimation.critical_path.length - 1 && (
                            <span className={`text-xs ${isDark ? "text-blue-600" : "text-blue-300"}`}>→</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Parallelism step chart */}
                {estimation.parallel_steps && estimation.parallel_steps.length > 1 && (
                  <div>
                    <h3 className={`text-sm font-semibold mb-2 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                      <Zap className="inline w-4 h-4 mr-1 -mt-0.5" /> Parallelism Overview
                    </h3>
                    <div className="space-y-1.5">
                      {estimation.parallel_steps.map((step) => (
                        <div
                          key={step.step}
                          className={`
                            rounded-lg border px-3 py-2
                            ${isDark ? "bg-slate-800/40 border-slate-700" : "bg-gray-50 border-gray-100"}
                          `}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                Step {step.step + 1}
                              </span>
                              {step.parallelism > 1 && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                  isDark ? "bg-green-900/40 text-green-300" : "bg-green-100 text-green-700"
                                }`}>
                                  {step.parallelism}× parallel
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] tabular-nums ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {step.total_latency > 0 && `${(step.total_latency * 1000).toFixed(1)} ms`}
                              {step.total_cost > 0 && ` · $${step.total_cost.toFixed(6)}`}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {step.node_labels.map((label, i) => {
                              const nid = step.node_ids[i];
                              const onCritical = estimation.critical_path.includes(nid);
                              return (
                                <span
                                  key={nid}
                                  className={`
                                    text-[10px] px-1.5 py-0.5 rounded font-medium
                                    ${onCritical
                                      ? isDark ? "bg-blue-900/40 text-blue-300 ring-1 ring-blue-500" : "bg-blue-100 text-blue-700 ring-1 ring-blue-400"
                                      : isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"
                                    }
                                  `}
                                >
                                  {label}
                                  {onCritical && <Route className="inline w-3 h-3 ml-1" />}
                                </span>
                              );
                            })}
                          </div>
                          {/* Parallelism bar */}
                          <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                step.parallelism >= 3
                                  ? "bg-green-500"
                                  : step.parallelism === 2
                                  ? "bg-blue-500"
                                  : "bg-gray-400"
                              }`}
                              style={{ width: `${Math.min(100, (step.parallelism / Math.max(...estimation.parallel_steps.map(s => s.parallelism))) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>{/* end right column */}
           </div>{/* end grid / space-y wrapper */}
          </div>{/* end scrollable body */}
        </div>
      </div>
    </>
  );
}
