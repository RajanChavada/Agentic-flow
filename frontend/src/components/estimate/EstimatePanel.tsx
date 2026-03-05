"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import {
  useEstimation,
  useUIState,
  useWorkflowStore,
  useScalingParams,
  useActualStats,
} from "@/store/useWorkflowStore";

import OverviewSection from "./OverviewSection";
import HealthSection from "./HealthSection";
import CyclesSection from "./CyclesSection";
import BreakdownSection from "./BreakdownSection";
import ScalingSection from "./ScalingSection";
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
  const [width, setWidth] = useState(Math.max(PANEL_MIN_WIDTH, 420));
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
  const breakdownWithType = (estimation?.breakdown ?? []).map((b) => {
    const matchedNode = nodes.find((n) => n.id === b.node_id);
    return { ...b, nodeType: matchedNode?.type ?? "agentNode" };
  });

  const activeBreakdown = breakdownWithType.filter((b) => b.tokens > 0);

  const chartData = activeBreakdown.map((b) => ({
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
           <div className="space-y-6">
            {/* ── 1. OVERVIEW (North Star) -- always visible ── */}
            <div>
              <OverviewSection
                estimation={estimation}
                isDark={isDark}
                isFullscreen={isFullscreen}
                heroTextClass={heroTextClass}
              />
            </div>

            {/* ── 2. HEALTH & BOTTLENECKS (collapsible) ── */}
            <div>
              <HealthSection
                estimation={estimation}
                breakdownWithType={breakdownWithType}
                nodes={nodes}
                isDark={isDark}
                collapsed={sectionCollapsed.health}
                onToggle={() => toggleSection("health")}
              />
            </div>

            {/* ── 3. CYCLES (collapsible, conditional) ── */}
            {estimation.detected_cycles && estimation.detected_cycles.length > 0 && (
            <div>
              <CyclesSection
                estimation={estimation}
                isDark={isDark}
                collapsed={sectionCollapsed.cycles}
                onToggle={() => toggleSection("cycles")}
              />
            </div>
            )}

            {/* ── 4. BREAKDOWN (collapsible) ── */}
            <div>
              <BreakdownSection
                estimation={estimation}
                breakdownWithType={breakdownWithType}
                isDark={isDark}
                collapsed={sectionCollapsed.breakdown}
                onToggle={() => toggleSection("breakdown")}
              />
            </div>

            {/* ── 5. SCALING & PLANNING (collapsible) ── */}
            <div>
              <ScalingSection
                estimation={estimation}
                scalingParams={scalingParams}
                setRunsPerDay={setRunsPerDay}
                setLoopIntensity={setLoopIntensity}
                scalingLoading={scalingLoading}
                isDark={isDark}
                collapsed={sectionCollapsed.scaling}
                onToggle={() => toggleSection("scaling")}
              />
            </div>

            {/* ── 6. OBSERVABILITY (collapsible) ── */}
            <div>
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
            </div>
           </div>{/* end grid / space-y wrapper */}
          </div>{/* end scrollable body */}
        </div>
      </div>
    </>
  );
}
