"use client";

import React, { useState } from "react";
import {
  useWorkflowStore,
  useWorkflowNodes,
  useWorkflowEdges,
  useUIState,
} from "@/store/useWorkflowStore";
import type {
  NodeConfigPayload,
  EdgeConfigPayload,
  WorkflowEstimation,
  EstimateRequestPayload,
} from "@/types/workflow";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function HeaderBar() {
  const nodes = useWorkflowNodes();
  const edges = useWorkflowEdges();
  const { theme } = useUIState();
  const { setEstimation, setErrorBanner, toggleTheme } = useWorkflowStore();
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  // ── Save scenario ────────────────────────────────────────
  const scenarioCount = Object.keys(useWorkflowStore.getState().scenarios).length;

  const handleSave = () => {
    const name = prompt("Scenario name:", `Scenario-${scenarioCount + 1}`);
    if (!name) return;
    useWorkflowStore.getState().saveCurrentScenario(name);
  };

  const handleEstimate = async () => {
    // Basic validation
    const hasStart = nodes.some((n) => n.type === "startNode");
    const hasFinish = nodes.some((n) => n.type === "finishNode");
    if (!hasStart || !hasFinish) {
      setErrorBanner("Workflow must have at least one Start and one Finish node.");
      return;
    }

    setErrorBanner(undefined);
    setLoading(true);

    const payload: EstimateRequestPayload = {
      nodes: nodes.map<NodeConfigPayload>((n) => ({
        id: n.id,
        type: n.data.type,
        label: n.data.label,
        model_provider: n.data.modelProvider,
        model_name: n.data.modelName,
        context: n.data.context,
        tool_id: n.data.toolId,
        tool_category: n.data.toolCategory,
        max_steps: n.data.maxSteps ?? null,
      })),
      edges: edges.map<EdgeConfigPayload>((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
      recursion_limit: 25,
      runs_per_day: useWorkflowStore.getState().scalingParams.runsPerDay,
      loop_intensity:
        useWorkflowStore.getState().scalingParams.loopIntensity !== 1.0
          ? useWorkflowStore.getState().scalingParams.loopIntensity
          : null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const data: WorkflowEstimation = await res.json();
      setEstimation(data);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Failed to fetch estimation"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <header
      className={`flex items-center justify-between border-b px-6 py-3 transition-colors ${
        isDark
          ? "border-slate-700 bg-slate-900"
          : "border-gray-200 bg-white"
      }`}
    >
      <h1
        className={`text-lg font-bold tracking-tight ${
          isDark ? "text-slate-100" : "text-gray-800"
        }`}
      >
        Agentic Flow Designer
      </h1>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            isDark
              ? "border-slate-600 text-slate-300 hover:bg-slate-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          }`}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "☀ Light" : "◑ Dark"}
        </button>

        {/* Save current workflow as scenario */}
        <button
          onClick={handleSave}
          disabled={nodes.length === 0}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
            isDark
              ? "border-emerald-700 text-emerald-300 hover:bg-emerald-800/40"
              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          }`}
          title="Save current workflow as a scenario"
        >
          💾 Save
        </button>

        <button
          onClick={handleEstimate}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "Running…" : "Run Workflow & Gen Estimate"}
        </button>
      </div>
    </header>
  );
}
