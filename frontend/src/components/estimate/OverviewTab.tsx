/* eslint-disable */
import React from "react";
import { type WorkflowEstimation } from "@/types/workflow";
import type { BreakdownWithType } from "./types";
import { BrainCircuit, Wrench, Info } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { WaterfallTimeline } from "./WaterfallTimeline";
import { ProviderIcon } from "@/lib/providerIcons";

interface OverviewTabProps {
    estimation: WorkflowEstimation;
    breakdownWithType: BreakdownWithType[];
    isDark: boolean;
    isFullscreen: boolean;
    heroTextClass: string;
    onShowInfo?: (info: { title: string; content: React.ReactNode }) => void;
}

const PIE_COLOURS = ["#3b82f6", "#f59e0b", "#ef4444", "#22c55e", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export function OverviewTab({
    estimation,
    breakdownWithType,
    isDark,
    isFullscreen,
    heroTextClass,
    onShowInfo,
}: OverviewTabProps) {
    const [viewMode, setViewMode] = React.useState<"cost" | "tokens">("cost");
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

    // Aggregate tool impact
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
        // direct tool nodes
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

    return (
        <div className="space-y-6">
            {/* ── KPI Cards ───────────────────────────────────── */}
            <div className={`grid ${isFullscreen ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"} gap-4 min-w-0`}>
                {/* Tokens card */}
                <div
                    className={`rounded-xl border p-5 min-h-[120px] flex flex-col min-w-0 overflow-hidden ${isDark ? "bg-muted/50 border-slate-700" : "bg-muted/50 border-gray-200"
                        }`}
                >
                    <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Token Usage</p>
                    {estimation.token_range ? (
                        <>
                            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                                {estimation.token_range.avg.toLocaleString()}
                            </p>
                            <div className={`text-[10px] mt-1 flex gap-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                <span>Min: {estimation.token_range.min.toLocaleString()}</span>
                                <span>Max: {estimation.token_range.max.toLocaleString()}</span>
                            </div>
                        </>
                    ) : (
                        <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                            {estimation.total_tokens.toLocaleString()}
                        </p>
                    )}
                    <p className={`text-xs mt-auto ${isDark ? "text-slate-500" : "text-gray-400"}`}>Tokens (avg)</p>
                </div>

                {/* Cost card */}
                <div
                    className={`rounded-xl border p-5 min-h-[120px] flex flex-col min-w-0 overflow-hidden ${isDark ? "bg-muted/50 border-slate-700" : "bg-muted/50 border-gray-200"
                        }`}
                >
                    <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Cost</p>
                    {estimation.cost_range ? (
                        <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                            ${estimation.cost_range.avg.toFixed(4)}
                        </p>
                    ) : (
                        <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                            ${estimation.total_cost.toFixed(4)}
                        </p>
                    )}
                    {estimation.cost_range && (
                        <p className={`text-[10px] mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            ${estimation.cost_range.min.toFixed(4)} – ${estimation.cost_range.max.toFixed(4)}
                        </p>
                    )}
                    <p className={`text-xs mt-auto ${isDark ? "text-slate-500" : "text-gray-400"}`}>Per run</p>
                </div>

                {/* Latency card */}
                <div
                    className={`rounded-xl border p-5 min-h-[120px] flex flex-col min-w-0 overflow-hidden ${isDark ? "bg-muted/50 border-slate-700" : "bg-muted/50 border-gray-200"
                        }`}
                >
                    <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Latency</p>
                    {estimation.latency_range ? (
                        <>
                            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                                {estimation.latency_range.avg.toFixed(2)}s
                            </p>
                            <div className={`text-[10px] mt-1 flex gap-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                <span>Min: {estimation.latency_range.min.toFixed(2)}s</span>
                                <span>Max: {estimation.latency_range.max.toFixed(2)}s</span>
                            </div>
                        </>
                    ) : (
                        <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                            {estimation.total_latency.toFixed(2)}s
                        </p>
                    )}
                    <p className={`text-xs mt-auto ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        P95 estimate
                        {estimation.total_tool_latency > 0 && (
                            <span className={`ml-1 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                                · {(estimation.total_tool_latency * 1000).toFixed(0)} ms tool
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* ── Pie Charts & Tool Impact ────────────────────── */}
            <div className={`grid ${isFullscreen ? "grid-cols-2" : "grid-cols-1"} gap-6`}>
                {modelData.length > 0 && (
                    <div className={`rounded-xl border p-5 ${isDark ? "bg-muted/50 border-slate-700" : "bg-white border-gray-200"}`}>
                        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                            <BrainCircuit className="w-4 h-4" /> Model Mix — {viewMode === "cost" ? "Cost" : "Tokens"}
                            <button
                                onClick={() => onShowInfo?.({
                                    title: "Model Mix (Token Distribution)",
                                    content: (
                                        <div className="space-y-3 text-sm">
                                            <p>This chart shows which AI models are driving the most <strong className="text-blue-500">cost</strong> in your workflow. Large, expensive models (like GPT-4) will take up a larger share than smaller models (like Haiku).</p>
                                            <p>Use this to identify if "cheap" nodes are accidentally using "expensive" models.</p>
                                        </div>
                                    )
                                })}
                                className="hover:text-blue-500 transition-colors"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                            <div className="ml-auto flex items-center text-xs font-medium rounded-md border border-gray-200 dark:border-slate-700">
                                <button
                                    onClick={() => setViewMode("cost")}
                                    className={`px-2 py-1 rounded-l-md ${viewMode === "cost" ? "bg-blue-500 text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
                                >
                                    Cost
                                </button>
                                <button
                                    onClick={() => setViewMode("tokens")}
                                    className={`px-2 py-1 rounded-r-md ${viewMode === "tokens" ? "bg-blue-500 text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
                                >
                                    Tokens
                                </button>
                            </div>
                        </h3>
                        <div className="flex items-start gap-4">
                            <div className="h-32 w-32 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={modelData.map((m) => ({
                                                name: m.name,
                                                value: viewMode === "cost" ? Number(m.cost.toFixed(6)) : m.tokens
                                            }))}
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
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                                                borderColor: isDark ? "#475569" : "#e5e7eb",
                                                color: isDark ? "#e2e8f0" : "#1f2937",
                                                borderRadius: 8,
                                                fontSize: 11,
                                            }}
                                            formatter={(value: any) => [
                                                viewMode === "cost"
                                                    ? `$${Number(value).toFixed(6)}`
                                                    : `${Number(value).toLocaleString()} tokens`,
                                                viewMode === "cost" ? "Cost" : "Usage"
                                            ]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex-1 space-y-1.5 min-w-0">
                                {modelData.map((m, i) => {
                                    const costPct = Math.round((m.cost / totalCost) * 100);
                                    const tokensPct = Math.round((m.tokens / (estimation.total_tokens || 1)) * 100);
                                    const latencyPct = Math.round((m.latency / totalLatency) * 100);
                                    const displayedPct = viewMode === "cost" ? costPct : tokensPct;

                                    return (
                                        <div key={m.name} className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLOURS[i % PIE_COLOURS.length] }} />
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-[10px] font-medium truncate flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                                                    <ProviderIcon provider={m.name.split(" / ")[0]} size={12} className="shrink-0" />
                                                    {m.name}
                                                    <span className={`ml-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                                        ({m.count})
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-right">
                                                    <div className={`text-[9px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>{viewMode === "cost" ? "Cost" : "Tokens"}</div>
                                                    <div className={`text-[10px] font-bold tabular-nums ${displayedPct >= 60 ? (isDark ? "text-red-400" : "text-red-600") :
                                                        displayedPct >= 30 ? (isDark ? "text-yellow-400" : "text-yellow-600") :
                                                            (isDark ? "text-slate-300" : "text-gray-600")
                                                        }`}>{displayedPct}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-[9px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>Latency</div>
                                                    <div className={`text-[10px] font-bold tabular-nums ${latencyPct >= 60 ? (isDark ? "text-red-400" : "text-red-600") :
                                                        latencyPct >= 30 ? (isDark ? "text-yellow-400" : "text-yellow-600") :
                                                            (isDark ? "text-slate-300" : "text-gray-600")
                                                        }`}>{latencyPct}%</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {toolData.length > 0 && (
                    <div className={`rounded-xl border p-5 ${isDark ? "bg-muted/50 border-slate-700" : "bg-white border-gray-200"}`}>
                        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                            <Wrench className="w-4 h-4" /> Tool Impact
                            <button
                                onClick={() => onShowInfo?.({
                                    title: "Tool-Calling Impact",
                                    content: (
                                        <div className="space-y-3 text-sm">
                                            <p>When an agent uses a <strong className="text-blue-500">Tool</strong>, it incurs overhead in two ways:</p>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li><strong className={`${isDark ? "text-slate-200" : "text-gray-900"}`}>Token Overhead</strong>: The tool's JSON schema must be sent to the model every time.</li>
                                                <li><strong className={`${isDark ? "text-slate-200" : "text-gray-900"}`}>Latency Overhead</strong>: The actual time the tool takes to execute (API calls, DB queries).</li>
                                            </ul>
                                            <p>This section helps you see if specific tools are unexpectedly slow or "chatty".</p>
                                        </div>
                                    )
                                })}
                                className="hover:text-blue-500 transition-colors"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </h3>
                        <div className="space-y-2">
                            {toolData.map((t) => (
                                <div key={t.name} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${isDark ? "bg-amber-900/10 border-amber-900/30" : "bg-amber-50/60 border-amber-100"
                                    }`}>
                                    <span className={`text-[10px] ${isDark ? "text-amber-400" : "text-amber-600"}`}><Wrench className="w-3 h-3" /></span>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[10px] font-medium truncate ${isDark ? "text-slate-200" : "text-gray-700"}`}>{t.name}</div>
                                        <div className={`text-[9px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                            +{t.schemaTokens} schema · +{t.responseTokens} response tokens
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <div className={`text-[10px] font-bold tabular-nums ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                                            {(t.latency * 1000).toFixed(0)} ms
                                        </div>
                                        <div className={`text-[9px] tabular-nums ${t.latencyPct >= 30 ? (isDark ? "text-red-400" : "text-red-600") :
                                            t.latencyPct >= 15 ? (isDark ? "text-yellow-400" : "text-yellow-600") :
                                                (isDark ? "text-slate-500" : "text-gray-400")
                                            }`}>{t.latencyPct}% of latency</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Waterfall Timeline ──────────────────────────── */}
            <WaterfallTimeline estimation={estimation} isDark={isDark} />
        </div>
    );
}
