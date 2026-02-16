"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { BarChart3, X, Trophy } from "lucide-react";
import {
  useWorkflowStore,
  useComparisonResults,
  useUIState,
} from "@/store/useWorkflowStore";
import type { BatchEstimateResult } from "@/types/workflow";

// ── Helpers ──────────────────────────────────────────────────

/** Find the "best" (lowest) value across results for a given key. */
function bestValue(results: BatchEstimateResult[], key: keyof BatchEstimateResult) {
  const vals = results.map((r) => Number(r[key]) || 0);
  return Math.min(...vals);
}

function fmtCost(v: number) {
  return `$${v.toFixed(4)}`;
}
function fmtLatency(v: number) {
  return `${v.toFixed(2)}s`;
}
function fmtTokens(v: number) {
  return v.toLocaleString();
}

// ── Component ────────────────────────────────────────────────

export default function ComparisonDrawer() {
  const { isComparisonOpen, theme } = useUIState();
  const results = useComparisonResults();
  const { toggleComparisonDrawer, clearComparisonResults } = useWorkflowStore();
  const isDark = theme === "dark";

  if (!isComparisonOpen || results.length === 0) return null;

  // Metrics table rows
  const metrics: {
    label: string;
    key: keyof BatchEstimateResult;
    format: (v: number) => string;
    lower: boolean; // true = lower is better
  }[] = [
    { label: "Total Tokens", key: "total_tokens", format: fmtTokens, lower: true },
    { label: "Total Cost", key: "total_cost", format: fmtCost, lower: true },
    { label: "Total Latency", key: "total_latency", format: fmtLatency, lower: true },
    { label: "Tool Latency", key: "total_tool_latency", format: fmtLatency, lower: true },
    { label: "Nodes", key: "node_count", format: (v) => String(v), lower: false },
    { label: "Edges", key: "edge_count", format: (v) => String(v), lower: false },
    { label: "Cycles", key: "detected_cycles", format: (v) => String(v), lower: true },
  ];

  // Chart data for cost + latency comparison
  const chartData = results.map((r) => ({
    name: r.name ?? r.id.slice(0, 8),
    cost: Number(r.total_cost.toFixed(4)),
    latency: Number(r.total_latency.toFixed(2)),
  }));

  const handleClose = () => {
    toggleComparisonDrawer();
    clearComparisonResults();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center ${
        isDark ? "bg-black/60" : "bg-black/40"
      }`}
    >
      <div
        className={`w-full max-w-5xl max-h-[75vh] overflow-auto rounded-t-2xl border-t shadow-2xl p-6 ${
          isDark
            ? "bg-slate-900 border-slate-700 text-slate-100"
            : "bg-white border-gray-200 text-gray-800"
        }`}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">
            <BarChart3 className="inline w-5 h-5 mr-1.5 -mt-0.5" /> Scenario Comparison{" "}
            <span className="text-sm font-normal opacity-60">
              ({results.length} workflows)
            </span>
          </h2>
          <button
            onClick={handleClose}
            className={`rounded-md border px-3 py-1 text-sm transition ${
              isDark
                ? "border-slate-600 hover:bg-slate-700"
                : "border-gray-300 hover:bg-gray-100"
            }`}
          >
            <X className="inline w-3.5 h-3.5 mr-1" /> Close
          </button>
        </div>

        {/* ── Comparison Table ─────────────────────────────── */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th
                  className={`text-left py-2 px-3 border-b font-semibold ${
                    isDark ? "border-slate-700" : "border-gray-200"
                  }`}
                >
                  Metric
                </th>
                {results.map((r) => (
                  <th
                    key={r.id}
                    className={`text-center py-2 px-3 border-b font-semibold ${
                      isDark ? "border-slate-700" : "border-gray-200"
                    }`}
                  >
                    <div>{r.name ?? r.id.slice(0, 8)}</div>
                    <span
                      className={`text-[10px] font-normal px-1.5 py-0.5 rounded-full ${
                        r.graph_type === "DAG"
                          ? isDark
                            ? "bg-emerald-900/50 text-emerald-300"
                            : "bg-emerald-100 text-emerald-700"
                          : isDark
                          ? "bg-amber-900/50 text-amber-300"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.graph_type}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const best = m.lower ? bestValue(results, m.key) : null;
                return (
                  <tr key={m.label}>
                    <td
                      className={`py-2 px-3 border-b font-medium ${
                        isDark ? "border-slate-700/50" : "border-gray-100"
                      }`}
                    >
                      {m.label}
                    </td>
                    {results.map((r) => {
                      const val = Number(r[m.key]) || 0;
                      const isBest = m.lower && val === best;
                      return (
                        <td
                          key={r.id}
                          className={`text-center py-2 px-3 border-b font-mono text-xs ${
                            isDark ? "border-slate-700/50" : "border-gray-100"
                          } ${
                            isBest
                              ? isDark
                                ? "text-emerald-400 font-bold"
                                : "text-emerald-600 font-bold"
                              : ""
                          }`}
                        >
                          {m.format(val)}
                          {isBest && <Trophy className="inline w-3.5 h-3.5 ml-1 text-amber-500" />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Charts ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cost chart */}
          <div>
            <h3 className="text-sm font-semibold mb-2 opacity-80">
              Cost Comparison ($)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cost" fill="#3b82f6" name="Cost ($)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Latency chart */}
          <div>
            <h3 className="text-sm font-semibold mb-2 opacity-80">
              Latency Comparison (s)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="latency" fill="#f59e0b" name="Latency (s)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
