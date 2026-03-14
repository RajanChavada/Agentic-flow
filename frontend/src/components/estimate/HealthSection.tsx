"use client";

import React from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Route,
  Zap,
  Wrench,
  Info
} from 'lucide-react';
import type { WorkflowEstimation } from '@/types/workflow';
import type { Node } from '@xyflow/react';
import type { BreakdownWithType } from './types';
import { DOT_COLOURS } from './types';
import DashboardSection from './DashboardSection';

interface HealthSectionProps {
  estimation: WorkflowEstimation;
  breakdownWithType: BreakdownWithType[];
  nodes: Node<any>[];
  isDark: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onShowInfo?: (info: { title: string; content: React.ReactNode }) => void;
}

export default function HealthSection({
  estimation,
  breakdownWithType,
  nodes,
  isDark,
  collapsed,
  onToggle,
  onShowInfo,
}: HealthSectionProps) {
  return (
    <DashboardSection
      id="health"
      title="Health & Bottlenecks"
      icon={<Activity className="w-4 h-4" />}
      collapsed={collapsed}
      onToggle={onToggle}
      isDark={isDark}
    >
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
                <button
                  onClick={() => onShowInfo?.({
                    title: "Workflow Health Score",
                    content: (
                      <div className="space-y-4 text-sm">
                        <p>The health score evaluates your workflow across three primary pillars:</p>
                        <ul className="list-disc pl-5 space-y-2">
                          <li><strong className="text-emerald-500">Cost Efficiency</strong>: How well your token usage matches the task complexity.</li>
                          <li><strong className="text-blue-500">Reliability</strong>: Loop detection and recursion safety.</li>
                          <li><strong className="text-amber-500">Optimization</strong>: Use of tool-calling vs raw prompting.</li>
                        </ul>
                        <div className="p-3 bg-muted rounded-lg font-mono text-[10px] space-y-1">
                          <p>Grade Thresholds:</p>
                          <p>A: 85-100 (Optimized)</p>
                          <p>B: 70-84 (Solid)</p>
                          <p>C: 55-69 (Needs Polish)</p>
                          <p>F: &lt;40 (High Risk)</p>
                        </div>
                      </div>
                    )
                  })}
                  className={`ml-1 hover:text-blue-500 transition-colors ${isDark ? "text-slate-500" : "text-gray-400"}`}
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              {/* Progress bar */}
              <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${estimation.health.score >= 85 ? "bg-green-500" :
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
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isGood
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
                  <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {labels[factor]}
                  </div>
                  <div className={`text-sm font-bold ${s >= 20 ? (isDark ? "text-green-300" : "text-green-600") :
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
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT_COLOURS[b.nodeType] ?? "bg-blue-500"
                        }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                        {b.node_name}
                      </div>
                      <div className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {b.model_provider && `${b.model_provider} / ${b.model_name}`}
                        {b.nodeType === "toolNode" && b.tool_id && `Tool: ${b.tool_id}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <div className={`text-xs tracking-wide uppercase font-semibold ${isDark ? "text-slate-500" : "text-gray-400"}`}>Cost</div>
                          <div className={`text-sm font-bold tabular-nums ${costPct >= 40
                            ? isDark ? "text-red-400" : "text-red-600"
                            : costPct >= 20
                              ? isDark ? "text-yellow-400" : "text-yellow-600"
                              : isDark ? "text-slate-300" : "text-gray-600"
                            }`}>
                            {costPct}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={`text-xs tracking-wide uppercase font-semibold ${isDark ? "text-slate-500" : "text-gray-400"}`}>Latency</div>
                          <div className={`text-sm font-bold tabular-nums ${latencyPct >= 40
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

      {/* ── Critical Path & Parallelism (inside Health) ── */}
      {estimation.critical_path.length > 0 && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                <Route className="inline w-4 h-4 mr-1 -mt-0.5" /> Critical Path
              </h3>
              {estimation.critical_path_latency > 0 && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isDark ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700"
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
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`
                          text-sm px-2.5 py-1.5 rounded-md font-semibold border shadow-sm transition-transform hover:-translate-y-0.5
                          ${isDark ? "bg-blue-900/30 border-blue-700 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"}
                        `}
                      >
                        {label}
                      </span>
                      {latMs && latMs !== "0" && (
                        <span className={`text-[10px] font-medium tabular-nums ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {latMs} ms
                        </span>
                      )}
                    </div>
                    {i < estimation.critical_path.length - 1 && (
                      <span className={`text-base font-bold px-1 ${isDark ? "text-blue-600" : "text-blue-300"}`}>→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
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
                        <span className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                          Step {step.step + 1}
                        </span>
                        {step.parallelism > 1 && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? "bg-green-900/40 text-green-300" : "bg-green-100 text-green-700"
                            }`}>
                            {step.parallelism}× parallel
                          </span>
                        )}
                      </div>
                      <div className={`text-xs tabular-nums font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
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
                    <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${step.parallelism >= 3
                          ? "bg-green-500"
                          : step.parallelism === 2
                            ? "bg-blue-500"
                            : "bg-gray-400"
                          }`}
                        style={{
                          width: `${Math.min(100, (step.parallelism / Math.max(1, ...estimation.parallel_steps.map(s => s.parallelism))) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardSection>
  );
}
