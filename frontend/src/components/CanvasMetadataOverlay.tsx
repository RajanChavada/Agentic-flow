"use client";
"use no memo";

import { useMemo } from "react";
import { analyzeGraph } from "@/lib/graphAnalysis";
import { useEstimation, useWorkflowStore } from "@/store/useWorkflowStore";

/**
 * Canvas metadata overlay - frosted glass HUD in top-right corner.
 * Displays real-time graph metrics: nodes, depth, loops, branches, complexity.
 */
export function CanvasMetadataOverlay() {
  // Fine-grained subscriptions - only nodes and edges
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const estimation = useEstimation();

  // Memoized graph analysis - recomputes only when nodes or edges change
  const metrics = useMemo(() => analyzeGraph(nodes, edges), [nodes, edges]);
  const complexityLabel =
    estimation?.summary?.complexity_label ??
    estimation?.complexity_label ??
    metrics.complexityLevel;
  const complexityScore =
    estimation?.summary?.complexity_score ??
    estimation?.complexity_score ??
    metrics.complexityScore;
  const complexityClass =
    complexityLabel === "Low"
      ? "bg-green-100 text-green-700 ring-green-200 dark:bg-green-950/60 dark:text-green-300 dark:ring-green-900"
      : complexityLabel === "Medium"
        ? "bg-yellow-100 text-yellow-800 ring-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:ring-yellow-900"
        : complexityLabel === "High"
          ? "bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-900"
          : "bg-red-100 text-red-700 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-900";
  const complexityTooltip =
    "Agentic complexity score. Higher = more expensive and less predictable. Based on node count, depth, loops, branching, and parallelism.";

  return (
    <div className="absolute top-4 right-4 z-50 hidden md:block rounded-lg border border-gray-200 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/80 select-none">
      <div className="flex items-center gap-2 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-gray-300">
        <span
          title="All non-start and non-finish nodes on the canvas."
          className="cursor-help"
        >
          nodes: {metrics.nonTerminalNodeCount}
        </span>

        <span className="text-gray-400">|</span>

        <span
          title="Longest path from Start to Finish in hops."
          className="cursor-help"
        >
          depth: {metrics.maxDepth}
        </span>

        <span className="text-gray-400">|</span>

        <span
          title="Detected back-edges (cycles) in the workflow graph."
          className="cursor-help"
        >
          loops: {metrics.loopCount}
        </span>

        <span className="text-gray-400">|</span>

        <span
          title="Number of Condition nodes on the canvas."
          className="cursor-help"
        >
          branches: {metrics.branchCount}
        </span>

        <span className="text-gray-400">|</span>

        <span className="flex items-center gap-1">
          <span title={complexityTooltip} className="cursor-help">
            complexity:
          </span>
          <span
            title={complexityTooltip}
            className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${complexityClass} cursor-help`}
          >
            {complexityLabel}
          </span>
          <span className="text-gray-400">({complexityScore})</span>
          <span
            title={complexityTooltip}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold text-gray-500 dark:border-gray-600 dark:text-gray-400 cursor-help"
            aria-hidden="true"
          >
            i
          </span>
        </span>
        <span className="sr-only" aria-label={complexityTooltip} />
      </div>
    </div>
  );
}
