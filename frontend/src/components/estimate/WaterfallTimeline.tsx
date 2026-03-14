import React, { useMemo } from "react";
import { WorkflowEstimation } from "@/types/workflow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ── Colour palette for per-node bars ─────────────────────── */
const NODE_COLOURS: Record<string, string> = {
    agentNode: "bg-blue-500",
    toolNode: "bg-amber-500",
    startNode: "bg-green-500",
    finishNode: "bg-red-500",
};

interface WaterfallTimelineProps {
    estimation: WorkflowEstimation;
    isDark: boolean;
}

export function WaterfallTimeline({ estimation, isDark }: WaterfallTimelineProps) {
    // Calculate relative start times based on BFS parallel steps
    const timelineNodes = useMemo(() => {
        let currentStartTime = 0;
        const nodes: Array<{
            id: string;
            label: string;
            type: string;
            startTime: number;
            latency: number;
            cost: number;
            tokens: number;
            stepIdx: number;
            rowOffset: number; // For stacking parallel nodes vertically
        }> = [];

        // The denominator for calculating percentages
        // If total_latency is 0, fallback to 1 to avoid division by zero
        const maxTime = Math.max(estimation.total_latency, 0.001);

        estimation.parallel_steps?.forEach((step, stepIdx) => {
            let rowOffset = 0;
            step.node_ids.forEach((nodeId) => {
                const bd = estimation.breakdown.find((b) => b.node_id === nodeId);
                if (!bd) return;

                // Node Type heuristically calculated from colours available or from breakdown if we augmented it
                // We'll fallback to "agentNode" if unknown
                const isTool = bd.tool_id != null || bd.node_name.toLowerCase().includes("tool");
                const isStart = bd.node_name.toLowerCase().includes("start");
                const nodeType = isStart ? "startNode" : (isTool ? "toolNode" : "agentNode");

                nodes.push({
                    id: bd.node_id,
                    label: bd.node_name,
                    type: nodeType,
                    startTime: currentStartTime,
                    latency: bd.latency,
                    cost: bd.cost,
                    tokens: bd.tokens,
                    stepIdx,
                    rowOffset: rowOffset++,
                });
            });
            // Advance the timeline by the max latency of this parallel step
            currentStartTime += step.total_latency;
        });

        return { nodes, maxTime, totalSteps: estimation.parallel_steps?.length || 0 };
    }, [estimation]);

    if (!estimation.parallel_steps || timelineNodes.nodes.length === 0) {
        return (
            <div className={`text-sm p-4 text-center ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Timeline data not available.
            </div>
        );
    }

    // Find the maximum rowOffset to determine container height
    const maxRowsInAnyStep = Math.max(...timelineNodes.nodes.map(n => n.rowOffset)) + 1;
    const rowHeight = 32; // px per row (bar height + gap)
    const containerHeight = maxRowsInAnyStep * rowHeight + 40; // + padding/axis

    return (
        <div className={`rounded-xl border p-5 overflow-hidden ${isDark ? "bg-muted/50 border-slate-700" : "bg-white border-gray-200"}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    Execution Timeline
                </h3>
                <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Total Latency: {timelineNodes.maxTime.toFixed(2)}s
                </span>
            </div>

            <div className="relative w-full" style={{ height: containerHeight }}>
                {/* Background Grid Lines (e.g. 4 segments) */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <div
                        key={pct}
                        className={`absolute top-0 bottom-6 border-l ${isDark ? "border-slate-800" : "border-gray-100"}`}
                        style={{ left: `${pct * 100}%` }}
                    />
                ))}

                {/* X-Axis Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <div
                        key={`label-${pct}`}
                        className={`absolute bottom-0 text-[9px] -translate-x-1/2 ${isDark ? "text-slate-500" : "text-gray-400"}`}
                        style={{ left: `${pct * 100}%` }}
                    >
                        {(pct * timelineNodes.maxTime).toFixed(1)}s
                    </div>
                ))}

                {/* Timeline Bars */}
                <TooltipProvider delayDuration={100}>
                    {timelineNodes.nodes.map((node) => {
                        const leftPct = (node.startTime / timelineNodes.maxTime) * 100;
                        // Ensure minimum width of 2px for visibility of fast nodes (like start/finish)
                        const widthPct = Math.max((node.latency / timelineNodes.maxTime) * 100, 0.5);
                        const topPx = node.rowOffset * rowHeight;
                        const barColour = NODE_COLOURS[node.type] || "bg-blue-500";

                        return (
                            <Tooltip key={node.id}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={`absolute rounded-md ${barColour} shadow-sm opacity-90 hover:opacity-100 transition-opacity cursor-pointer overflow-hidden flex items-center px-2`}
                                        style={{
                                            left: `${leftPct}%`,
                                            width: `${widthPct}%`,
                                            minWidth: "12px",
                                            top: `${topPx}px`,
                                            height: "24px",
                                        }}
                                    >
                                        {widthPct > 5 && (
                                            <span className="text-[10px] font-medium text-white truncate pointer-events-none">
                                                {node.label}
                                            </span>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className={isDark ? "bg-slate-800 text-white border-slate-700" : ""}>
                                    <div className="text-xs space-y-1">
                                        <p className="font-bold">{node.label}</p>
                                        <p className="opacity-80">Duration: {(node.latency * 1000).toFixed(0)}ms</p>
                                        <p className="opacity-80">Tokens: {node.tokens}</p>
                                        <p className="opacity-80">Cost: ${node.cost.toFixed(5)}</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </TooltipProvider>
            </div>

            {/* Legend */}
            <div className={`mt-4 flex flex-wrap gap-4 text-[10px] items-center justify-center ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Agent / LLM</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Tool Call</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Control / Start</div>
            </div>
        </div>
    );
}
