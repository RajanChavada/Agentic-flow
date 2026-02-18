"use client";

import React, { useState, useEffect } from "react";
import { Copy, Trash2, BarChart3, Save, Cloud } from "lucide-react";
import type { WorkflowNodeType, BatchEstimateResponse } from "@/types/workflow";
import {
  useUIState,
  useScenarios,
  useSelectedForComparison,
  useWorkflowStore,
} from "@/store/useWorkflowStore";
import { useUser } from "@/store/useAuthStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PaletteItem {
  type: WorkflowNodeType;
  label: string;
  shape: "circle" | "rectangle" | "diamond" | "octagon";
  colour: string;
  darkColour: string;
  shapeColour: string;
}

const PALETTE: PaletteItem[] = [
  {
    type: "startNode",
    label: "Start",
    shape: "circle",
    colour: "bg-green-50 border-green-500 text-green-900",
    darkColour: "bg-green-900/30 border-green-400 text-green-100",
    shapeColour: "bg-green-500",
  },
  {
    type: "agentNode",
    label: "Agent",
    shape: "rectangle",
    colour: "bg-blue-50 border-blue-500 text-blue-900",
    darkColour: "bg-blue-900/30 border-blue-400 text-blue-100",
    shapeColour: "bg-blue-500",
  },
  {
    type: "toolNode",
    label: "Tool",
    shape: "diamond",
    colour: "bg-orange-50 border-orange-500 text-orange-900",
    darkColour: "bg-orange-900/30 border-orange-400 text-orange-100",
    shapeColour: "bg-orange-500",
  },
  {
    type: "finishNode",
    label: "Finish",
    shape: "octagon",
    colour: "bg-red-50 border-red-500 text-red-900",
    darkColour: "bg-red-900/30 border-red-400 text-red-100",
    shapeColour: "bg-red-500",
  },
];

function ShapeIndicator({ shape, color }: { shape: string; color: string }) {
  switch (shape) {
    case "circle":
      return <span className={`inline-block w-4 h-4 rounded-full ${color}`} />;
    case "rectangle":
      return <span className={`inline-block w-4 h-4 rounded-sm ${color}`} />;
    case "diamond":
      return <span className={`inline-block w-3.5 h-3.5 rotate-45 rounded-[2px] ${color}`} />;
    case "octagon":
      return (
        <span
          className={`inline-block w-4 h-4 rounded-[3px] ${color}`}
          style={{ clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" }}
        />
      );
    default:
      return <span className={`inline-block w-4 h-4 rounded ${color}`} />;
  }
}

export default function Sidebar() {
  const { theme } = useUIState();
  const scenarios = useScenarios();
  const selectedIds = useSelectedForComparison();
  const {
    toggleComparisonSelection,
    loadScenario,
    deleteScenario,
    duplicateScenario,
    setComparisonResults,
    toggleComparisonDrawer,
    setErrorBanner,
    loadWorkflowsFromSupabase,
    deleteWorkflowFromSupabase,
  } = useWorkflowStore();
  const isDark = theme === "dark";
  const [comparing, setComparing] = useState(false);
  const user = useUser();
  const supabaseLoading = useWorkflowStore((s) => s.supabaseLoading);

  // Load workflows from Supabase when the user signs in
  useEffect(() => {
    if (user) {
      loadWorkflowsFromSupabase();
    }
  }, [user, loadWorkflowsFromSupabase]);

  const scenarioList = Object.values(scenarios).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: WorkflowNodeType,
    label: string
  ) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.setData("application/reactflow-label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  // ── Compare handler ─────────────────────────────────────
  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setComparing(true);
    setErrorBanner(undefined);

    // Build batch payload from selected scenarios
    const workflows = selectedIds
      .map((id) => scenarios[id])
      .filter(Boolean)
      .map((s) => ({
        id: s.id,
        name: s.name,
        nodes: s.graph.nodes,
        edges: s.graph.edges,
        recursion_limit: s.graph.recursionLimit ?? 25,
      }));

    try {
      const res = await fetch(`${API_BASE}/api/estimate/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflows }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const data: BatchEstimateResponse = await res.json();
      setComparisonResults(data.results);
      toggleComparisonDrawer();
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Batch estimation failed"
      );
    } finally {
      setComparing(false);
    }
  };

  return (
    <aside
      className={`w-52 shrink-0 border-r p-4 flex flex-col gap-3 overflow-y-auto ${
        isDark
          ? "border-slate-600 bg-slate-900"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      {/* ── Node palette ──────────────────────────────────── */}
      <h2
        className={`text-xs font-bold uppercase tracking-wide mb-1 ${
          isDark ? "text-slate-400" : "text-gray-500"
        }`}
      >
        Nodes
      </h2>

      {PALETTE.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(e, item.type, item.label)}
          className={`
            flex items-center gap-2.5 cursor-grab active:cursor-grabbing
            rounded-md border px-3 py-2.5 text-sm font-medium
            hover:shadow-md transition-all
            ${isDark ? item.darkColour : item.colour}
          `}
        >
          <ShapeIndicator shape={item.shape} color={item.shapeColour} />
          <span>{item.label}</span>
        </div>
      ))}

      {/* ── Saved Workflows ───────────────────────────────── */}
      <div
        className={`mt-3 pt-3 border-t ${
          isDark ? "border-slate-700" : "border-gray-200"
        }`}
      >
        <h2
          className={`text-xs font-bold uppercase tracking-wide mb-2 ${
            isDark ? "text-slate-400" : "text-gray-500"
          }`}
        >
          Saved Workflows
          {scenarioList.length > 0 && (
            <span className="ml-1 font-normal opacity-60">
              ({scenarioList.length})
            </span>
          )}
          {user && (
            <span title="Synced with Supabase">
              <Cloud className="inline w-3 h-3 ml-1 text-blue-400" />
            </span>
          )}
        </h2>

        {scenarioList.length === 0 && !supabaseLoading && (
          <p
            className={`text-[10px] italic ${
              isDark ? "text-slate-500" : "text-gray-400"
            }`}
          >
            No saved scenarios yet. Use <Save className="inline w-3 h-3 mx-0.5" /> Save in the header.
          </p>
        )}

        {supabaseLoading && (
          <p className={`text-[10px] italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            Loading workflows...
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {scenarioList.map((sc) => {
            const isSelected = selectedIds.includes(sc.id);
            return (
              <div
                key={sc.id}
                className={`rounded-md border px-2 py-1.5 text-xs transition ${
                  isSelected
                    ? isDark
                      ? "border-blue-500 bg-blue-900/30"
                      : "border-blue-400 bg-blue-50"
                    : isDark
                    ? "border-slate-700 bg-slate-800/60"
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* Row 1: checkbox + name */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleComparisonSelection(sc.id)}
                    className="accent-blue-500 rounded"
                    title="Select for comparison"
                  />
                  <span
                    className={`font-medium truncate flex-1 cursor-pointer ${
                      isDark ? "text-slate-200" : "text-gray-800"
                    }`}
                    onClick={() => loadScenario(sc.id)}
                    title={`Load "${sc.name}"`}
                  >
                    {sc.name}
                  </span>
                </div>

                {/* Row 2: metrics pill + actions */}
                <div className="flex items-center justify-between mt-1">
                  {sc.estimate ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isDark
                          ? "bg-slate-700 text-slate-300"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      ${sc.estimate.total_cost.toFixed(4)} /{" "}
                      {sc.estimate.total_latency.toFixed(1)}s
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] italic ${
                        isDark ? "text-slate-600" : "text-gray-400"
                      }`}
                    >
                      no estimate
                    </span>
                  )}

                  <div className="flex gap-1">
                    <button
                      onClick={() => duplicateScenario(sc.id)}
                      title="Duplicate"
                      className="opacity-50 hover:opacity-100 text-[10px]"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (user) {
                          deleteWorkflowFromSupabase(sc.id);
                        } else {
                          deleteScenario(sc.id);
                        }
                      }}
                      title="Delete"
                      className="opacity-50 hover:opacity-100 text-[10px]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compare button */}
        {scenarioList.length >= 2 && (
          <button
            onClick={handleCompare}
            disabled={selectedIds.length < 2 || comparing}
            className={`mt-2 w-full rounded-md border px-2 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
              isDark
                ? "border-blue-600 text-blue-300 hover:bg-blue-800/40"
                : "border-blue-300 text-blue-700 hover:bg-blue-50"
            }`}
          >
            {comparing
              ? "Comparing…"
              : <><BarChart3 className="inline w-3.5 h-3.5 mr-1" /> Compare Selected ({selectedIds.length})</>}
          </button>
        )}
      </div>

      <div className={`mt-auto pt-4 border-t text-[10px] ${isDark ? "border-slate-700 text-slate-500" : "border-gray-200 text-gray-400"}`}>
        Drag a node onto the canvas
      </div>
    </aside>
  );
}
