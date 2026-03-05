"use client";

import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import type { WorkflowEstimation, NodeEstimation, ActualNodeStats } from '@/types/workflow';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { BreakdownWithType } from './types';
import { NODE_COLOURS } from './types';
import DashboardSection from './DashboardSection';

interface ChartDataItem {
  name: string;
  tokens: number;
  cost: number;
  latency: number;
}

interface ObservabilitySectionProps {
  estimation: WorkflowEstimation;
  actualStats: ActualNodeStats[];
  setActualStats: (stats: ActualNodeStats[]) => void;
  clearActualStats: () => void;
  chartData: ChartDataItem[];
  activeBreakdown: BreakdownWithType[];
  isDark: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

export default function ObservabilitySection({
  estimation,
  actualStats,
  setActualStats,
  clearActualStats,
  chartData,
  activeBreakdown,
  isDark,
  collapsed,
  onToggle,
}: ObservabilitySectionProps) {
  /* ── Observability paste state ──────────────────────────── */
  const [showActualPaste, setShowActualPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  return (
    <DashboardSection
      id="observability"
      title="Observability"
      icon={<Radio className="w-4 h-4" />}
      collapsed={collapsed}
      onToggle={onToggle}
      isDark={isDark}
    >
      {/* ── Actual vs Estimated ──────── */}
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
      </div>
    </DashboardSection>
  );
}
