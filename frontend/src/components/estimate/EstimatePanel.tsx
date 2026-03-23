"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Zap,
  Clock,
  LayoutDashboard,
  BrainCircuit,
  Wrench,
  Info,
  X
} from "lucide-react";
import type { WorkflowEstimation } from "@/types/workflow";
import {
  useEstimation,
  useUIState,
  useWorkflowStore,
  useScalingParams,
  useActualStats,
} from "@/store/useWorkflowStore";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from "./OverviewTab";
import HealthSection from "./HealthSection";
import CyclesSection from "./CyclesSection";
import { BreakdownTab } from "./BreakdownTab";
import { ScalingTab } from "./ScalingTab";
import ObservabilitySection from "./ObservabilitySection";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STORAGE_KEY = "estimate-panel-sections";

/** Minimum panel width (narrowest user can resize to) -- keeps hero text legible. */
const PANEL_MIN_WIDTH = 380;
/** Maximum panel width in sidebar mode. */
const PANEL_MAX_WIDTH = 700;

/** Hero number text size class based on panel width. Clamps to avoid cut-off in narrow sidebar. */
function getHeroTextClass(width: number, isFullscreen: boolean): string {
  if (isFullscreen) return "text-3xl";
  if (width < 380) return "text-base";
  if (width < 440) return "text-lg";
  if (width < 520) return "text-xl";
  if (width < 600) return "text-2xl";
  return "text-3xl";
}

type SectionId = "health" | "breakdown" | "cycles" | "scaling" | "observability";

function loadSectionState(): Record<SectionId, boolean> {
  if (typeof window === "undefined") {
    return { health: true, breakdown: false, cycles: false, scaling: false, observability: false };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return {
        health: parsed.health ?? true,
        breakdown: parsed.breakdown ?? false,
        cycles: parsed.cycles ?? false,
        scaling: parsed.scaling ?? false,
        observability: parsed.observability ?? false,
      };
    }
  } catch {
    // ignore
  }
  return { health: true, breakdown: false, cycles: false, scaling: false, observability: false };
}

function saveSectionState(state: Record<SectionId, boolean>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export default function EstimatePanel({ 
  estimation: propEstimation, 
  readOnly = false 
}: { 
  estimation?: WorkflowEstimation | null;
  readOnly?: boolean;
}) {
  const storeEstimation = useEstimation();
  const estimation = propEstimation ?? storeEstimation;
  
  const { isEstimatePanelOpen: storeIsEstimatePanelOpen, theme } = useUIState();
  const isEstimatePanelOpen = readOnly ? true : storeIsEstimatePanelOpen;

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

  /* ── Fullscreen/Tab State ─────────────────────────────── */
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  /* ── Collapsible section state (persisted in sessionStorage) ── */
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<SectionId, boolean>>(() =>
    typeof window !== "undefined" ? loadSectionState() : { health: true, breakdown: false, cycles: false, scaling: false, observability: false }
  );

  useEffect(() => {
    setSectionCollapsed(loadSectionState());
  }, []);

  const toggleSection = useCallback((id: SectionId) => {
    setSectionCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveSectionState(next);
      return next;
    });
  }, []);

  /* ── Educational Modals ─────────────────────────────── */
  const [infoModal, setInfoModal] = useState<{ title: string; content: React.ReactNode } | null>(null);

  const scrollToSection = useCallback((id: string, tabValue?: string) => {
    if (tabValue) setActiveTab(tabValue);

    // Small timeout to allow tab switch or section expansion
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // Flash animation for attention
        el.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
        setTimeout(() => el.classList.remove("ring-2", "ring-blue-500", "ring-offset-2"), 2000);
      }
    }, 100);
  }, []);

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
            condition_expression: n.data.conditionExpression ?? null,
            probability: n.data.probability ?? null,
          })),
          edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, source_handle: e.sourceHandle ?? null })),
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
        // silently ignore -- user still sees last good estimate
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
  const [width, setWidth] = useState(readOnly ? PANEL_MAX_WIDTH : Math.max(PANEL_MIN_WIDTH, 420));
  const isResizing = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;

    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX - ev.clientX; // dragging left -> wider
      setWidth(Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, startWidth + delta)));
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
  const breakdownWithType = (estimation?.breakdown ?? []).map((b: any) => {
    const matchedNode = nodes.find((n) => n.id === b.node_id);
    return { ...b, nodeType: matchedNode?.type ?? "agentNode" };
  });

  const activeBreakdown = breakdownWithType.filter((b: any) => b.tokens > 0);

  const chartData = activeBreakdown.map((b: any) => ({
    name: b.node_name,
    tokens: b.tokens,
    cost: Number(b.cost.toFixed(6)),
    latency: Number((b.latency * 1000).toFixed(1)), // ms
  }));

  /* ── Hero text size (scales with panel width) ───────────── */
  const heroTextClass = getHeroTextClass(width, isFullscreen);

  /* ── Don't render if closed or no data ──────────────────── */
  if (!estimation) return null;

  return (
    <>
      {/* Backdrop overlay (subtle) */}
      {isEstimatePanelOpen && !readOnly && (
        <div
          className={`fixed inset-0 z-40 transition-opacity ${isFullscreen ? "bg-black/40" : "bg-black/10"}`}
          onClick={isFullscreen ? undefined : toggleEstimatePanel}
        />
      )}

      {/* Sliding drawer / fullscreen overlay (Drawer) OR Static Block (Shared View) */}
      <div
        className={
          readOnly 
            ? `relative w-full h-full border rounded-2xl shadow-sm ${isDark ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-white"}` 
            : `fixed z-50 flex transition-all duration-300 ease-in-out ${isFullscreen ? "inset-0" : `top-0 right-0 h-full ${isEstimatePanelOpen ? "translate-x-0" : "translate-x-full"}`}`
        }
        style={(!isFullscreen && !readOnly) ? { width } : undefined}
      >
        {/* Resize handle (only in sidebar mode) */}
        {!isFullscreen && !readOnly && (
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
            flex-1 flex flex-col overflow-hidden
            ${!readOnly ? "shadow-2xl" : ""}
            ${isDark ? "bg-slate-900 text-slate-100" : "bg-white text-gray-900"}
            ${(isFullscreen || readOnly) ? "rounded-none" : "rounded-l-2xl"}
          `}
        >
          {/* ── Header ────────────────────────────────────── */}
          <div
            className={`
              flex items-center justify-between px-5 py-4 border-b shrink-0
              ${isDark ? "border-slate-700" : "border-gray-200"}
            `}
          >
            <div className="flex items-center gap-4">
              {/* Health Avatar */}
              {estimation.health && (
                <div
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm
                    ${estimation.health.grade === 'A' || estimation.health.grade === 'B' ? "bg-emerald-500" :
                      estimation.health.grade === 'C' ? "bg-amber-500" : "bg-rose-500"}
                    text-white
                  `}
                >
                  <span className="text-2xl font-black">{estimation.health.grade}</span>
                </div>
              )}

              <div className="min-w-0">
                <h2 className={`font-bold flex items-center gap-2 ${isFullscreen ? "text-xl" : "text-base"}`}>
                  {isFullscreen ? "Workflow Analytics Dashboard" : "Estimate Report"}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${isDark ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                    V1.1
                  </span>
                </h2>

                {/* Metric Ribbon */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <div className={`flex items-center gap-1 text-[10px] sm:text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    <LayoutDashboard className="w-3 h-3" />
                    <span>{estimation.graph_type}</span>
                  </div>

                  {breakdownWithType.filter((b: any) => b.bottleneck_severity === "high").length > 0 && (
                    <button
                      onClick={() => scrollToSection("health", "overview")}
                      className="flex items-center gap-1 text-[10px] sm:text-xs text-rose-500 font-semibold hover:bg-rose-50 px-1 rounded transition-colors"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span className="underline decoration-dotted underline-offset-2">
                        {breakdownWithType.filter((b: any) => b.bottleneck_severity === "high").length} Bottlenecks
                      </span>
                    </button>
                  )}

                  {estimation.detected_cycles && estimation.detected_cycles.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-purple-500 font-medium">
                      <RefreshCw className="w-3 h-3" />
                      <span>{estimation.detected_cycles.length} Loops</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-500 font-medium">
                    <Zap className="w-3 h-3" />
                    <span>{(estimation.critical_path_latency * 1000).toFixed(0)}ms Critical Path</span>
                    <button
                      onClick={() => setInfoModal({
                        title: "Critical Path Latency",
                        content: (
                          <div className="space-y-3 text-sm">
                            <p>The <strong className="text-blue-500">Critical Path</strong> is the longest sequence of dependent tasks in your workflow. It represents the minimum possible time your workflow will take to execute, assuming infinite parallel processing capacity.</p>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                              <p className="font-semibold text-blue-700 dark:text-blue-300">Why it matters:</p>
                              <p className="mt-1">Even if you add more workers, your workflow cannot run faster than the Critical Path. To reduce latency, you must optimize the nodes on this specific path.</p>
                            </div>
                          </div>
                        )
                      })}
                      className="ml-0.5 hover:text-blue-700 transition-colors"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-fuchsia-500 font-medium">
                    <span>Complexity</span>
                    <span className="font-semibold">
                      {estimation.complexity_label} ({estimation.complexity_score})
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Fullscreen toggle (only in editor mode) */}
              {!readOnly && (
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
              )}
              {/* Close (only in editor mode) */}
              {!readOnly && (
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
              )}
            </div>
          </div>

          {/* ── Scrollable body ───────────────────────────── */}
          <div
            id="estimate-dashboard-capture"
            className={`flex-1 overflow-y-auto px-5 py-5 ${isFullscreen ? "max-w-7xl mx-auto w-full" : ""}`}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto -webkit-overflow-scrolling-touch mb-6 pb-1">
                <TabsList className={`flex min-w-[400px] w-full justify-start p-1.5 rounded-xl border ${isDark ? "bg-slate-900 border-slate-700" : "bg-[#f5eeea] border-gray-200"}`}>
                  <TabsTrigger value="overview" className="text-xs sm:text-sm h-full flex-1">Overview</TabsTrigger>
                  <TabsTrigger value="breakdown" className="text-xs sm:text-sm h-full flex-1">Detailed Breakdown</TabsTrigger>
                  <TabsTrigger value="scaling" className="text-xs sm:text-sm h-full flex-1">Scaling & Sensitivity</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-6 outline-none focus:outline-none focus:ring-0">
                <OverviewTab
                  estimation={estimation}
                  breakdownWithType={breakdownWithType}
                  isDark={isDark}
                  isFullscreen={isFullscreen}
                  heroTextClass={heroTextClass}
                  onShowInfo={setInfoModal}
                />
                <HealthSection
                  estimation={estimation}
                  breakdownWithType={breakdownWithType}
                  nodes={nodes}
                  isDark={isDark}
                  collapsed={sectionCollapsed.health}
                  onToggle={() => toggleSection("health")}
                  onShowInfo={setInfoModal}
                />
                {estimation.detected_cycles && estimation.detected_cycles.length > 0 && (
                  <CyclesSection
                    estimation={estimation}
                    isDark={isDark}
                    collapsed={sectionCollapsed.cycles}
                    onToggle={() => toggleSection("cycles")}
                  />
                )}
                <ObservabilitySection
                  estimation={estimation}
                  actualStats={actualStats}
                  setActualStats={setActualStats}
                  clearActualStats={clearActualStats}
                  chartData={chartData}
                  activeBreakdown={activeBreakdown}
                  isDark={isDark}
                  collapsed={sectionCollapsed.observability}
                  onToggle={() => toggleSection("observability")}
                />
              </TabsContent>

              <TabsContent value="breakdown" className="space-y-6 outline-none focus:outline-none focus:ring-0">
                <BreakdownTab
                  estimation={estimation}
                  breakdownWithType={breakdownWithType}
                  actualStats={actualStats}
                  setActualStats={setActualStats}
                  clearActualStats={clearActualStats}
                  isDark={isDark}
                  isFullscreen={isFullscreen}
                  onShowInfo={setInfoModal}
                />
              </TabsContent>

              <TabsContent value="scaling" className="space-y-8 outline-none focus:outline-none focus:ring-0">
                <ScalingTab
                  estimation={estimation}
                  scalingParams={scalingParams}
                  setRunsPerDay={setRunsPerDay}
                  setLoopIntensity={setLoopIntensity}
                  scalingLoading={scalingLoading}
                  isDark={isDark}
                  onShowInfo={setInfoModal}
                />
                <div className={`pt-6 border-t ${isDark ? "border-slate-800" : "border-gray-200"}`}>
                  <ObservabilitySection
                    estimation={estimation}
                    actualStats={actualStats}
                    setActualStats={setActualStats}
                    clearActualStats={clearActualStats}
                    chartData={chartData}
                    activeBreakdown={activeBreakdown}
                    isDark={isDark}
                    collapsed={false}
                    onToggle={() => { }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>{/* end scrollable body */}
        </div>
      </div>
      {/* ── Info Modal Overlay ───────────────────────── */}
      {infoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border border-slate-700" : "bg-white"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className={`font-bold flex items-center gap-2 ${isDark ? "text-slate-100" : "text-gray-900"}`}>
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-blue-500" />
                </div>
                {infoModal.title}
              </h3>
              <button
                onClick={() => setInfoModal(null)}
                className={`p-2 rounded-full transition-all ${isDark ? "hover:bg-slate-800 text-slate-500 hover:text-slate-200" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"}`}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`px-6 py-8 max-h-[60vh] overflow-y-auto custom-scrollbar ${isDark ? "text-slate-300 leading-relaxed" : "text-gray-600 leading-relaxed"}`}>
              {infoModal.content}
            </div>
            <div className={`px-6 py-4 border-t flex justify-end ${isDark ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-gray-50/50"}`}>
              <button
                onClick={() => setInfoModal(null)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
