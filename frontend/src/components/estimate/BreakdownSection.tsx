"use client";

import React from 'react';
import {
  BarChart3,
  BrainCircuit,
  Wrench,
  RefreshCw,
} from 'lucide-react';
import type { WorkflowEstimation } from '@/types/workflow';
import {
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { BreakdownWithType } from './types';
import { DOT_COLOURS } from './types';
import DashboardSection from './DashboardSection';

interface BreakdownSectionProps {
  estimation: WorkflowEstimation;
  breakdownWithType: BreakdownWithType[];
  isDark: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

export default function BreakdownSection({
  estimation,
  breakdownWithType,
  isDark,
  collapsed,
  onToggle,
}: BreakdownSectionProps) {
  return (
    <DashboardSection
      id="breakdown"
      title="Breakdown"
      icon={<BarChart3 className="w-4 h-4" />}
      collapsed={collapsed}
      onToggle={onToggle}
      isDark={isDark}
    >
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

      {/* ── Detailed Breakdown Table ────────────────── */}
      <div>
        <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
          Detailed Breakdown
        </h3>
        <div
          className={`
            rounded-xl border overflow-hidden
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
                          <div className="font-medium flex items-center">
                            {b.node_name}
                            {b.branch_probability != null && b.branch_probability < 1.0 && (
                              <span className={`text-[10px] ml-1.5 px-1.5 py-0.5 rounded font-medium ${
                                isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                              }`}>
                                ~{Math.round(b.branch_probability * 100)}%
                              </span>
                            )}
                          </div>
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
                            {Math.round(Math.max(b.cost_share ?? 0, b.latency_share ?? 0) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className={isDark ? "text-slate-600" : "text-gray-300"}>—</span>
                      )}
                    </td>
                  </tr>
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
    </DashboardSection>
  );
}
