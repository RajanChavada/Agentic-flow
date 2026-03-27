/* eslint-disable */
"use client";

import React, { useState, useMemo } from 'react';
import {
    BarChart3,
    Crosshair,
    Rocket,
    RefreshCw,
    Zap,
    Clock,
    LayoutDashboard,
    BrainCircuit,
    Wrench,
    Info,
    Save,
    TrendingUp
} from "lucide-react";
import type { WorkflowEstimation, ScalingProjection } from '@/types/workflow';
import { useGate } from "@/hooks/useGate";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
} from "recharts";

interface ScalingParams {
    runsPerDay: number | null;
    loopIntensity: number;
}

interface ScalingTabProps {
    estimation: WorkflowEstimation;
    scalingParams: ScalingParams;
    setRunsPerDay: (rpd: number | null) => void;
    setLoopIntensity: (li: number) => void;
    scalingLoading: boolean;
    isDark: boolean;
    onShowInfo?: (info: { title: string; content: React.ReactNode }) => void;
}

const PIE_COLOURS = ["#3b82f6", "#f59e0b", "#ef4444", "#22c55e", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export function ScalingTab({
    estimation,
    scalingParams,
    setRunsPerDay,
    setLoopIntensity,
    scalingLoading,
    isDark,
    onShowInfo,
}: ScalingTabProps) {
    // ── Baseline Scenario State ────────────────────────────
    const [baseline, setBaseline] = useState<{
        runsPerDay: number;
        loopIntensity: number;
        projection: ScalingProjection;
    } | null>(null);

    // Paywall gate for scenario comparison (Pro feature)
    const { isGated: scenarioGated } = useGate("scenario_comparison");

    const saveBaseline = () => {
        if (estimation.scaling_projection && scalingParams.runsPerDay) {
            setBaseline({
                runsPerDay: scalingParams.runsPerDay,
                loopIntensity: scalingParams.loopIntensity,
                projection: estimation.scaling_projection
            });
        }
    };

    const clearBaseline = () => setBaseline(null);

    // ── Heatmap Calculation ────────────────────────────────
    // We generate a 3x3 grid around the current slider values if available,
    // otherwise we pick sensible defaults.
    const heatmapData = useMemo(() => {
        const baseRuns = scalingParams.runsPerDay || 1000;
        const baseLoop = scalingParams.loopIntensity;

        const runsVariations = [
            Math.max(10, Math.floor(baseRuns * 0.5)),
            baseRuns,
            baseRuns * 2,
            baseRuns * 5
        ];

        const loopVariations = estimation.detected_cycles.length > 0
            ? [
                Math.max(0.1, baseLoop - 0.5),
                baseLoop,
                baseLoop + 1.0,
                baseLoop + 3.0
            ]
            : [1.0]; // If no loops, loop intensity is irrelevant

        // Cost = (Total Est Cost * Loop Multiplier) * Runs * 30.44 days
        // (This is a rough approximation for the heatmap visual; backend provides exacts for the projection)
        const baseCostPerRun = estimation.total_cost;

        const grid = loopVariations.map(loop => {
            return runsVariations.map(runs => {
                // Approximate monthly cost for heatmap
                const monthlyCost = baseCostPerRun * loop * runs * 30.44;
                return { runs, loop, monthlyCost };
            });
        });

        // Find min/max for color scaling
        let minCost = Infinity;
        let maxCost = 0;
        grid.forEach(row => row.forEach(cell => {
            if (cell.monthlyCost < minCost) minCost = cell.monthlyCost;
            if (cell.monthlyCost > maxCost) maxCost = cell.monthlyCost;
        }));

        return { runsVariations, loopVariations, grid, minCost, maxCost };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scalingParams.runsPerDay, scalingParams.loopIntensity, estimation.total_cost, estimation.detected_cycles.length]);

    const getHeatmapColor = (cost: number) => {
        if (heatmapData.minCost === heatmapData.maxCost) return isDark ? "bg-slate-700" : "bg-gray-200";
        // Convert to a 0-1 scale
        const ratio = (cost - heatmapData.minCost) / (heatmapData.maxCost - heatmapData.minCost);
        // Green to Red scaling
        if (isDark) {
            if (ratio < 0.2) return "bg-emerald-900/40 text-emerald-300";
            if (ratio < 0.5) return "bg-green-800/60 text-green-300";
            if (ratio < 0.8) return "bg-amber-800/40 text-amber-300";
            return "bg-red-900/60 text-red-300";
        } else {
            if (ratio < 0.2) return "bg-emerald-100 text-emerald-800";
            if (ratio < 0.5) return "bg-green-200 text-green-800";
            if (ratio < 0.8) return "bg-amber-200 text-amber-800";
            return "bg-red-200 text-red-800";
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Interactive Sliders ──────────────────────── */}
            <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                        <BarChart3 className="w-4 h-4" /> What-If Scaling
                    </h3>
                    {scalingLoading && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full animate-pulse ${isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-600"}`}>
                            Updating Models…
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Runs per day */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                                Runs / Day
                            </label>
                            <div className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${isDark ? "bg-purple-900/40 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                                {scalingParams.runsPerDay ?? "Off"}
                            </div>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={50000}
                            step={500}
                            value={scalingParams.runsPerDay ?? 0}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                setRunsPerDay(v > 0 ? v : null);
                            }}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-purple-500"
                            style={{ background: isDark ? "#334155" : "#e2e8f0" }}
                        />
                        <div className={`flex justify-between text-[10px] mt-1.5 font-medium ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            <span>0</span>
                            <span>25k</span>
                            <span>50k+</span>
                        </div>
                    </div>

                    {/* Loop Intensity */}
                    <div className={estimation.detected_cycles.length === 0 ? "opacity-50 pointer-events-none" : ""}>
                        <div className="flex items-center justify-between mb-2">
                            <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                                Loop Intensity
                                {estimation.detected_cycles.length === 0 && (
                                    <span className={`text-[9px] font-normal px-1.5 py-0.5 rounded ${isDark ? "bg-slate-800 text-slate-500" : "bg-gray-100 text-gray-400"}`}>No cycles detected</span>
                                )}
                            </label>
                            <div className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${isDark ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-100 text-indigo-700"}`}>
                                {scalingParams.loopIntensity.toFixed(1)}×
                            </div>
                        </div>
                        <input
                            type="range"
                            min={0.1}
                            max={5.0}
                            step={0.1}
                            value={scalingParams.loopIntensity}
                            onChange={(e) => setLoopIntensity(Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500"
                            style={{ background: isDark ? "#334155" : "#e2e8f0" }}
                        />
                        <div className={`flex justify-between text-[10px] mt-1.5 font-medium ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            <span>0.1×</span>
                            <span>1.0× (Estimate)</span>
                            <span>5.0×</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Scenario Comparison Matrix ────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Left: Token Distribution Pie Chart */}
                <div className={`p-4 rounded-xl border flex flex-col ${isDark ? "border-slate-700 bg-slate-900/30" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                            <BrainCircuit className="w-4 h-4 text-purple-500" /> Token Mix (Monthly)
                        </h3>
                        <button
                            onClick={() => onShowInfo?.({
                                title: "Monthly Token Mix",
                                content: (
                                    <div className="space-y-3 text-sm">
                                        <p>This pie chart breaks down your <strong className="text-purple-500">Monthly Token Load</strong> by model provider.</p>
                                        <p>It&apos;s vital for understanding which models will consume your API credits fastest at high volume.</p>
                                    </div>
                                )
                            })}
                            className="text-slate-400 hover:text-blue-500 transition-colors"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {!estimation.scaling_projection ? (
                        <div className="flex-1 flex items-center justify-center p-8 text-xs text-slate-400">
                            Slide &quot;Runs / Day&quot; above to see distribution
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="h-40 w-40 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={(estimation.breakdown || []).filter((b) => b.tokens > 0).map((b) => ({
                                                name: `${b.model_provider} / ${b.model_name}`,
                                                value: (b.tokens || 0) * (scalingParams.runsPerDay || 0) * 30.44 * scalingParams.loopIntensity
                                            }))}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={70}
                                            innerRadius={45}
                                            strokeWidth={1}
                                            stroke={isDark ? "#1e293b" : "#ffffff"}
                                        >
                                            {(estimation.breakdown || []).map((_, i: number) => (
                                                <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                                            ))}
                                        </Pie>
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                                                borderColor: isDark ? "#475569" : "#e5e7eb",
                                                color: isDark ? "#e2e8f0" : "#1f2937",
                                                borderRadius: 8,
                                                fontSize: 10,
                                            }}
                                            formatter={(val: any) => [`${(Number(val) / 1_000_000).toFixed(2)}M tokens`, "Load"]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                {(estimation.breakdown || []).filter((b) => b.tokens > 0).slice(0, 6).map((b, i: number) => (
                                    <div key={i} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLOURS[i % PIE_COLOURS.length] }} />
                                            <span className={`text-[10px] truncate ${isDark ? "text-slate-300" : "text-gray-600"}`}>{b.node_name}</span>
                                        </div>
                                        <span className={`text-[10px] font-mono tabular-nums ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                            {(((b.tokens || 0) / (estimation.total_tokens || 1)) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Side-by-Side Comparison */}
                <div className={`p-4 rounded-xl border flex flex-col ${isDark ? "border-slate-700 bg-slate-900/30" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                            <Rocket className="w-4 h-4 text-blue-500" /> Scenario Comparison
                        </h3>
                        <div className="flex items-center gap-2">
                            {estimation.scaling_projection && !scenarioGated && (
                                <button
                                    onClick={baseline ? clearBaseline : saveBaseline}
                                    className={`text-[10px] px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors ${baseline
                                        ? (isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300")
                                        : (isDark ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "bg-blue-600 text-white hover:bg-blue-700")
                                        }`}
                                >
                                    <Save className="w-3 h-3" />
                                    {baseline ? "Clear Baseline" : "Set as Baseline"}
                                </button>
                            )}
                            <button
                                onClick={() => onShowInfo?.({
                                    title: "Total Cost Breakdown",
                                    content: (
                                        <div className="space-y-3 text-sm">
                                            <p>This shows where your money is going globally. If you run this flow 1,000 times a day, which nodes are eating the budget?</p>
                                            <p>Often it&apos;s one or two &quot;heavy&quot; nodes (like a complex Planner or a large context extraction) that dominate the bill.</p>
                                        </div>
                                    )
                                })}
                                className="text-slate-400 hover:text-blue-500 transition-colors"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => onShowInfo?.({
                                    title: "Baseline Comparison",
                                    content: (
                                        <div className="space-y-3 text-sm">
                                            <p>Press <strong className="text-blue-500">Set Baseline</strong> to &quot;lock&quot; your current scaling scenario. This allows you to slide the inputs and see exactly how much cost goes up or down relative to your starting point.</p>
                                            <p>It&apos;s essentially a &quot;Git Diff&quot; for your cloud bills.</p>
                                        </div>
                                    )
                                })}
                                className="text-slate-400 hover:text-blue-500 transition-colors"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {!estimation.scaling_projection ? (
                        <div className={`flex-1 flex items-center justify-center text-xs text-center p-6 rounded-lg border border-dashed ${isDark ? "border-slate-700 text-slate-500" : "border-gray-200 text-gray-400"}`}>
                            Set &quot;Runs / Day&quot; above to view monthly deployment projections.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Current Scenario Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className={`p-4 rounded-xl border-2 shadow-sm ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-blue-50/30 border-blue-100"}`}>
                                    <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${isDark ? "text-slate-400" : "text-blue-600"}`}>Monthly Estimate</div>
                                    <div className={`text-2xl font-black font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
                                        ${estimation.scaling_projection.monthly_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                    {baseline && !scenarioGated && (
                                        <div className={`text-xs font-bold flex items-center gap-1 mt-2 px-2 py-1 rounded w-max ${estimation.scaling_projection.monthly_cost > baseline.projection.monthly_cost ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                                            {estimation.scaling_projection.monthly_cost > baseline.projection.monthly_cost ? <TrendingUp className="w-3 h-3" /> : <Rocket className="w-3 h-3" />}
                                            {estimation.scaling_projection.monthly_cost > baseline.projection.monthly_cost ? "+" : ""}
                                            ${Math.abs(estimation.scaling_projection.monthly_cost - baseline.projection.monthly_cost).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </div>
                                    )}
                                </div>
                                <div className={`p-4 rounded-xl border shadow-sm ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
                                    <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Scale Load</div>
                                    <div className={`text-2xl font-black font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
                                        {(estimation.scaling_projection.monthly_tokens / 1_000_000).toFixed(1)}M
                                    </div>
                                    <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Tokens / Month</div>
                                </div>
                            </div>

                            {/* Baseline Reference Row */}
                            {baseline && !scenarioGated && (
                                <div className={`flex items-center justify-between p-2 px-3 rounded text-xs ${isDark ? "bg-indigo-900/20 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                                    <div className="font-semibold">Baseline config:</div>
                                    <div className="font-mono">{baseline.runsPerDay} runs/day @ {baseline.loopIntensity}x loops</div>
                                </div>
                            )}

                            {/* Additional Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div>
                                    <div className={`text-[10px] mb-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Avg. compute time/mo</div>
                                    <div className={`text-xs font-mono font-semibold ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                                        {estimation.scaling_projection.monthly_compute_seconds < 3600
                                            ? `${(estimation.scaling_projection.monthly_compute_seconds / 60).toFixed(0)} mins`
                                            : `${(estimation.scaling_projection.monthly_compute_seconds / 3600).toFixed(1)} hrs`}
                                    </div>
                                </div>
                                <div>
                                    <div className={`text-[10px] mb-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Cost per 1k runs</div>
                                    <div className={`text-xs font-mono font-semibold ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                                        ${estimation.scaling_projection.cost_per_1k_runs.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Sensitivity Heatmap */}
                <div className={`p-4 rounded-xl border flex flex-col ${isDark ? "border-slate-700 bg-slate-900/30" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                            <Crosshair className="w-4 h-4 text-emerald-500" /> Sensitivity Heatmap
                        </h3>
                        <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>Monthly Cost Matrix</div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr>
                                    <th className={`font-normal text-left pb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                        <div className="flex items-center gap-1 text-[10px]"><TrendingUp className="w-3 h-3" /> Loops \ Runs</div>
                                    </th>
                                    {heatmapData.runsVariations.map(r => (
                                        <th key={r} className={`pb-2 font-mono font-semibold ${r === scalingParams.runsPerDay ? (isDark ? "text-purple-400" : "text-purple-600") : (isDark ? "text-slate-400" : "text-gray-600")}`}>
                                            {r >= 1000 ? `${(r / 1000).toFixed(r % 1000 === 0 ? 0 : 1)}k` : r}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmapData.grid.map((row, i) => {
                                    const loopVal = heatmapData.loopVariations[i];
                                    return (
                                        <tr key={i}>
                                            <td className={`font-mono font-semibold py-1.5 pr-2 ${loopVal === scalingParams.loopIntensity ? (isDark ? "text-indigo-400" : "text-indigo-600") : (isDark ? "text-slate-400" : "text-gray-600")}`}>
                                                {loopVal.toFixed(1)}x
                                            </td>
                                            {row.map((cell, j) => (
                                                <td key={j} className="p-0.5">
                                                    <div className={`
                                                        px-2 py-1.5 rounded-md text-center font-mono font-medium
                                                        ${getHeatmapColor(cell.monthlyCost)}
                                                        ${(cell.runs === scalingParams.runsPerDay && cell.loop === scalingParams.loopIntensity)
                                                            ? "ring-2 ring-offset-1 " + (isDark ? "ring-white ring-offset-slate-900" : "ring-purple-500 ring-offset-white")
                                                            : ""}
                                                    `}>
                                                        ${cell.monthlyCost > 1000 ? `${(cell.monthlyCost / 1000).toFixed(1)}k` : cell.monthlyCost.toFixed(0)}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
