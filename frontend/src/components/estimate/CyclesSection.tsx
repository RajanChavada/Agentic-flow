"use client";

import React from 'react';
import {
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  OctagonAlert,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { WorkflowEstimation } from '@/types/workflow';
import DashboardSection from './DashboardSection';

interface CyclesSectionProps {
  estimation: WorkflowEstimation;
  isDark: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

export default function CyclesSection({
  estimation,
  isDark,
  collapsed,
  onToggle,
}: CyclesSectionProps) {
  return (
    <DashboardSection
      id="cycles"
      title="Cycles"
      icon={<RefreshCw className="w-4 h-4" />}
      collapsed={collapsed}
      onToggle={onToggle}
      isDark={isDark}
    >
      {/* ── Detected Cycles Banner ──────────────────── */}
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
    </DashboardSection>
  );
}
