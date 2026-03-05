"use client";

import React from 'react';
import {
  BarChart3,
  Crosshair,
  Rocket,
  TrendingUp,
} from 'lucide-react';
import type { WorkflowEstimation } from '@/types/workflow';
import DashboardSection from './DashboardSection';

interface ScalingParams {
  runsPerDay: number | null;
  loopIntensity: number;
}

interface ScalingSectionProps {
  estimation: WorkflowEstimation;
  scalingParams: ScalingParams;
  setRunsPerDay: (rpd: number | null) => void;
  setLoopIntensity: (li: number) => void;
  scalingLoading: boolean;
  isDark: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

export default function ScalingSection({
  estimation,
  scalingParams,
  setRunsPerDay,
  setLoopIntensity,
  scalingLoading,
  isDark,
  collapsed,
  onToggle,
}: ScalingSectionProps) {
  return (
    <DashboardSection
      id="scaling"
      title="Scaling & Planning"
      icon={<TrendingUp className="w-4 h-4" />}
      collapsed={collapsed}
      onToggle={onToggle}
      isDark={isDark}
    >
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
    </DashboardSection>
  );
}
