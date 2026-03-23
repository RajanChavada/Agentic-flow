/* eslint-disable */
"use client";
import React, { useState } from "react";
import {
    BrainCircuit,
    Wrench,
    RefreshCw,
    Radio,
    ChevronRight,
    ChevronDown,
    Clock,
    Banknote,
    Zap,
    Info
} from "lucide-react";
import type { WorkflowEstimation, NodeEstimation, ActualNodeStats } from "@/types/workflow";
import type { BreakdownWithType } from "./types";
import { DOT_COLOURS } from "./types";
import { ProviderIcon } from "@/lib/providerIcons";

interface BreakdownTabProps {
    estimation: WorkflowEstimation;
    breakdownWithType: BreakdownWithType[];
    actualStats: ActualNodeStats[];
    setActualStats: (stats: ActualNodeStats[]) => void;
    clearActualStats: () => void;
    isDark: boolean;
    isFullscreen: boolean;
    onShowInfo?: (info: { title: string; content: React.ReactNode }) => void;
}

// Helper for bottleneck severity colors
const getBottleneckClasses = (severity: string | null | undefined, isDark: boolean) => {
    if (severity === "high") {
        return isDark ? "bg-red-900/40 text-red-300 border-red-800/50" : "bg-red-50 text-red-600 border-red-200";
    }
    if (severity === "medium") {
        return isDark ? "bg-yellow-900/40 text-yellow-300 border-yellow-800/50" : "bg-amber-50 text-amber-600 border-amber-200";
    }
    return isDark ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-gray-50 text-gray-500 border-gray-200";
};

// Helper to render proportional inline bars
const ProgressBar = ({ percent, colorClass, isDark }: { percent: number; colorClass: string; isDark: boolean }) => (
    <div className={`w-full h-1 mt-1 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
        <div className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
);

export function BreakdownTab({
    estimation,
    breakdownWithType,
    actualStats,
    setActualStats,
    clearActualStats,
    isDark,
    isFullscreen,
    onShowInfo,
}: BreakdownTabProps) {
    const [showActualPaste, setShowActualPaste] = useState(false);
    const [pasteValue, setPasteValue] = useState("");
    const [pasteError, setPasteError] = useState<string | null>(null);

    // Expanded rows state for tool impacts
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (nodeId: string) => {
        setExpandedRows(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    return (
        <div className="space-y-6">
            {/* ── Observability / JSON Paste ──────────────────────── */}
            <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                        <Radio className="w-4 h-4 text-blue-500" /> Observability Traces
                    </h3>
                    {actualStats.length > 0 ? (
                        <button
                            onClick={() => { clearActualStats(); setPasteValue(""); setPasteError(null); setShowActualPaste(false); }}
                            className="text-[10px] px-2 py-0.5 rounded font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition"
                        >
                            Clear Traces
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowActualPaste((v) => !v)}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium transition ${isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                            {showActualPaste ? "Cancel" : "Add JSON Trace"}
                        </button>
                    )}
                </div>

                {showActualPaste && actualStats.length === 0 && (
                    <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                                Last Run JSON Trace
                            </h3>
                            <button
                                onClick={() => onShowInfo?.({
                                    title: "Understanding Trace Logs",
                                    content: (
                                        <div className="space-y-3 text-sm">
                                            <p>The <strong className="text-blue-500">JSON Trace</strong> is the raw &quot;telemetry&quot; data captured from a real execution of this agent.</p>
                                            <p>While the <strong className="text-blue-500">Estimate Dashboard</strong> uses a mathematical model to guess future costs, the <strong className="text-blue-500">Trace</strong> is the ground truth from the last time the code actually ran.</p>
                                        </div>
                                    )
                                })}
                                className="hover:text-blue-500 transition-colors"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <textarea
                            value={pasteValue}
                            onChange={(e) => { setPasteValue(e.target.value); setPasteError(null); }}
                            placeholder={`[\n  { "node_id": "agent-1", "actual_tokens": 500, "actual_latency": 1.2, "actual_cost": 0.003 }\n]`}
                            rows={4}
                            className={`w-full rounded-md border p-2 text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDark ? "bg-slate-950 border-slate-700 text-slate-200 placeholder-slate-600" : "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400"}`}
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
                            className={`mt-2 w-full text-xs font-semibold py-1.5 rounded-md transition ${pasteValue.trim() ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
                        >
                            Load Trace Data
                        </button>
                    </div>
                )}
            </div>

            {/* ── Detailed Table ─────────────────────────────────── */}
            <div className={`rounded-xl border overflow-x-auto -webkit-overflow-scrolling-touch ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <table className="w-full text-sm min-w-[640px]">
                    <thead>
                        <tr className={`border-b-2 text-xs uppercase tracking-wider ${isDark ? "bg-slate-900 border-slate-700 text-slate-400" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                            <th className="text-left px-4 py-3 font-semibold w-6"></th>
                            <th className="text-left py-3 font-semibold">Node</th>
                            <th className="text-right px-4 py-3 font-semibold">
                                <div className="flex items-center justify-end gap-2">
                                    <span>Tokens</span>
                                    <button
                                        onClick={() => onShowInfo?.({
                                            title: "Token Metrics",
                                            content: (
                                                <div className="space-y-3 text-sm">
                                                    <p>Tokens are the primary unit of compute in LLMs. <strong className="text-emerald-500">Input tokens</strong> (your prompt) are usually cheaper than <strong className="text-emerald-500">Output tokens</strong> (the AI&apos;s response).</p>
                                                    <p>The progress bars show this node&apos;s contribution relative to the entire workflow&apos;s token usage.</p>
                                                </div>
                                            )
                                        })}
                                        className="hover:text-blue-500 transition-colors"
                                    >
                                        <Info className="w-3 h-3" />
                                    </button>
                                </div>
                            </th>
                            <th className="text-right px-4 py-3 font-semibold">Cost</th>
                            <th className="text-right px-4 py-3 font-semibold">Latency</th>
                            <th className="text-right px-4 py-3 font-semibold">
                                <div className="flex items-center justify-end gap-2">
                                    <span>Bottleneck</span>
                                    <button
                                        onClick={() => onShowInfo?.({
                                            title: "Resource Intensity",
                                            content: (
                                                <div className="space-y-3 text-sm">
                                                    <p>This reveals which nodes have the highest <strong className="text-blue-500">&quot;Resource Intensity&quot;</strong>.</p>
                                                    <p>A node is a &quot;bottleneck&quot; if its share of total cost or latency is significantly higher than others. <strong className="text-red-500">High severity</strong> indicates this node is a prime candidate for optimization (e.g., using a smaller model, or caching responses).</p>
                                                </div>
                                            )
                                        })}
                                        className="hover:text-blue-500 transition-colors"
                                    >
                                        <Info className="w-3 h-3" />
                                    </button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className={isDark ? "divide-y divide-slate-800" : "divide-y divide-gray-100"}>
                        {breakdownWithType.map((b, index) => {
                            const hasTools = b.tool_impacts && b.tool_impacts.length > 0;
                            const isExpanded = expandedRows[b.node_id];
                            const actual = actualStats.find(a => a.node_id === b.node_id);
                            const stripeClass = index % 2 === 0 ? "" : (isDark ? "bg-slate-900/30" : "bg-gray-50/50");

                            return (
                                <React.Fragment key={b.node_id}>
                                    <tr
                                        className={`transition-colors ${stripeClass} ${isDark ? "hover:bg-slate-800/80" : "hover:bg-blue-50/30"}`}
                                    >
                                        <td className="px-2 py-3">
                                            {hasTools && (
                                                <button onClick={() => toggleRow(b.node_id)} className={`p-1 rounded hover:bg-slate-500/20 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT_COLOURS[b.nodeType] ?? "bg-blue-500"}`} />
                                                <div>
                                                    <div className={`font-medium flex items-center ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                                                        {b.node_name}
                                                        {b.branch_probability != null && b.branch_probability < 1.0 && (
                                                            <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded-full font-medium ${isDark ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                                                                ~{Math.round(b.branch_probability * 100)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    {b.model_provider && b.model_name && (
                                                        <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                                            <ProviderIcon provider={b.model_provider} size={10} className="shrink-0" />
                                                            {b.model_provider} / {b.model_name}
                                                        </div>
                                                    )}
                                                    {b.nodeType === "toolNode" && b.tool_id && (
                                                        <div className={`text-[10px] mt-0.5 ${isDark ? "text-amber-500" : "text-amber-600"}`}>
                                                            <Wrench className="inline w-3 h-3 mr-0.5 -mt-0.5" /> {b.tool_id}
                                                        </div>
                                                    )}
                                                    {b.in_cycle && (
                                                        <div className={`text-[10px] mt-0.5 ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                                                            <RefreshCw className="inline w-3 h-3 mr-0.5 -mt-0.5" /> in cycle
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-right px-4 py-3 tabular-nums space-y-1">
                                            {actual && actual.actual_tokens ? (
                                                <>
                                                    <div className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                                                        <span className={isDark ? "text-slate-500" : "text-gray-400"}>Est:</span> {b.tokens.toLocaleString()}
                                                    </div>
                                                    <div className={`text-xs font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                                        <span className={isDark ? "text-slate-500" : "text-gray-400"}>Act:</span> {actual.actual_tokens.toLocaleString()}
                                                    </div>
                                                </>
                                            ) : b.tokens > 0 ? (
                                                <div className="w-full flex flex-col items-end">
                                                    <div className={isDark ? "text-slate-300" : "text-gray-700"}>{b.input_tokens.toLocaleString()} in</div>
                                                    <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                                        {b.output_tokens.toLocaleString()} out
                                                    </div>
                                                    {estimation.total_tokens > 0 && (
                                                        <ProgressBar percent={(b.tokens / estimation.total_tokens) * 100} colorClass="bg-emerald-400" isDark={isDark} />
                                                    )}
                                                </div>
                                            ) : b.nodeType === "toolNode" ? (
                                                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                                    ~{b.tool_response_tokens} resp
                                                </div>
                                            ) : (
                                                <span className={isDark ? "text-slate-600" : "text-gray-300"}>&mdash;</span>
                                            )}
                                        </td>
                                        <td className="text-right px-4 py-3 tabular-nums space-y-1">
                                            {actual && actual.actual_cost ? (
                                                <>
                                                    <div className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}><span className={isDark ? "text-slate-500" : "text-gray-400"}>Est:</span> ${b.cost.toFixed(4)}</div>
                                                    <div className={`text-xs font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`}><span className={isDark ? "text-slate-500" : "text-gray-400"}>Act:</span> ${actual.actual_cost.toFixed(4)}</div>
                                                </>
                                            ) : b.cost > 0 ? (
                                                <div className="w-full flex flex-col items-end">
                                                    <div className={isDark ? "text-slate-300" : "text-gray-800 font-medium"}>${b.cost.toFixed(6)}</div>
                                                    {b.input_cost > 0 && (
                                                        <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                                            ${b.input_cost.toFixed(6)} in
                                                        </div>
                                                    )}
                                                    {estimation.total_cost > 0 && (
                                                        <ProgressBar percent={(b.cost / estimation.total_cost) * 100} colorClass="bg-blue-400" isDark={isDark} />
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={isDark ? "text-slate-600" : "text-gray-300"}>&mdash;</span>
                                            )}
                                        </td>
                                        <td className="text-right px-4 py-3 tabular-nums space-y-1">
                                            {actual && actual.actual_latency ? (
                                                <>
                                                    <div className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}><span className={isDark ? "text-slate-500" : "text-gray-400"}>Est:</span> {(b.latency * 1000).toFixed(0)} ms</div>
                                                    <div className={`text-xs font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`}><span className={isDark ? "text-slate-500" : "text-gray-400"}>Act:</span> {(actual.actual_latency * 1000).toFixed(0)} ms</div>
                                                </>
                                            ) : b.latency > 0 ? (
                                                <div className="w-full flex flex-col items-end">
                                                    <div className={isDark ? "text-slate-300" : "text-gray-800 font-medium"}>{(b.latency * 1000).toFixed(1)} ms</div>
                                                    {b.tool_latency > 0 && b.nodeType === "agentNode" && (
                                                        <div className={`text-[10px] ${isDark ? "text-amber-500" : "text-amber-600"}`}>
                                                            <Wrench className="inline w-3 h-3 mr-0.5 -mt-0.5" /> {(b.tool_latency * 1000).toFixed(0)} ms
                                                        </div>
                                                    )}
                                                    {estimation.total_latency > 0 && (
                                                        <ProgressBar percent={(b.latency / estimation.total_latency) * 100} colorClass="bg-purple-400" isDark={isDark} />
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={isDark ? "text-slate-600" : "text-gray-300"}>&mdash;</span>
                                            )}
                                        </td>
                                        <td className="text-right px-4 py-3 tabular-nums">
                                            {(b.cost_share > 0 || b.latency_share > 0) ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    {(() => {
                                                        const isCostDom = (b.cost_share ?? 0) > (b.latency_share ?? 0);
                                                        const percent = Math.round(Math.max(b.cost_share ?? 0, b.latency_share ?? 0) * 100);
                                                        const Icon = isCostDom ? Banknote : Clock;
                                                        const classes = getBottleneckClasses(b.bottleneck_severity, isDark);

                                                        return (
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border ${classes}`}>
                                                                <Icon className="w-2.5 h-2.5" />
                                                                {percent}%
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className={isDark ? "text-slate-600" : "text-gray-300"}>&mdash;</span>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Expanded Tool Rows */}
                                    {hasTools && isExpanded && (
                                        <tr className={isDark ? "bg-slate-800/30" : "bg-amber-50/40"}>
                                            <td></td>
                                            <td colSpan={5} className="py-2 pr-4 pb-3">
                                                <div className="space-y-1.5 border-l-2 pl-3 ml-2 border-amber-500/30">
                                                    {b.tool_impacts!.map((ti) => (
                                                        <div key={ti.tool_node_id} className={`flex justify-between items-center text-[10px] ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                                                            <div className="flex items-center gap-1.5 font-medium">
                                                                <Wrench className="w-3 h-3 text-amber-500" />
                                                                {ti.tool_name}
                                                            </div>
                                                            <div className="tabular-nums flex items-center gap-4">
                                                                <span className={isDark ? "text-slate-400" : "text-gray-500"}>
                                                                    +{ti.schema_tokens} schema · +{ti.response_tokens} resp
                                                                </span>
                                                                <span>
                                                                    {(ti.execution_latency * 1000).toFixed(0)} ms
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    <tfoot className="shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <tr className={`border-t-2 font-bold ${isDark ? "border-slate-700 bg-slate-800/90 text-slate-200" : "border-gray-300 bg-white text-gray-900"}`}>
                            <td></td>
                            <td className="py-4 text-sm tracking-wide">TOTAL ESTIMATE</td>
                            <td className="text-right px-4 py-4 tabular-nums">
                                <div>{estimation.total_input_tokens.toLocaleString()} in</div>
                                <div className={`text-[10px] font-normal mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                    {estimation.total_output_tokens.toLocaleString()} out
                                </div>
                            </td>
                            <td className="text-right px-4 py-4 tabular-nums text-blue-600 dark:text-blue-400">
                                ${estimation.total_cost.toFixed(6)}
                            </td>
                            <td className="text-right px-4 py-4 tabular-nums text-purple-600 dark:text-purple-400">
                                {(estimation.total_latency * 1000).toFixed(1)} ms
                            </td>
                            <td className="text-right px-4 py-4 tabular-nums text-xs text-gray-400">
                                100%
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
