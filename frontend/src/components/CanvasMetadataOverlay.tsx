"use client";
"use no memo";

import { useMemo } from "react";
import { analyzeGraph } from "@/lib/graphAnalysis";
import { useWorkflowStore } from "@/store/useWorkflowStore";

/**
 * Canvas metadata overlay - frosted glass HUD in top-right corner.
 * Displays real-time graph metrics: node count, depth, loops, risk surface, risk level.
 */
export function CanvasMetadataOverlay() {
  // Fine-grained subscriptions - only nodes and edges
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);

  // Memoized graph analysis - recomputes only when nodes or edges change
  const metrics = useMemo(() => analyzeGraph(nodes, edges), [nodes, edges]);

  return (
    <div className="absolute top-4 right-4 z-50 hidden md:block bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg px-3 py-2 pointer-events-none select-none">
      <div className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
        {/* Node count */}
        <span>{metrics.workflowNodeCount} nodes</span>

        <span className="text-gray-400">|</span>

        {/* Depth */}
        <span>depth {metrics.maxDepth}</span>

        <span className="text-gray-400">|</span>

        {/* Loop count */}
        <span>{metrics.loopCount} loops</span>

        <span className="text-gray-400">|</span>

        {/* Risk surface abbreviated: R:W:X:N */}
        <span className="text-blue-600 dark:text-blue-400">R:{metrics.toolRiskSurface.read}</span>
        <span className="text-amber-600 dark:text-amber-400">W:{metrics.toolRiskSurface.write}</span>
        <span className="text-red-600 dark:text-red-400">X:{metrics.toolRiskSurface.exec}</span>
        <span className="text-purple-600 dark:text-purple-400">N:{metrics.toolRiskSurface.network}</span>

        <span className="text-gray-400">|</span>

        {/* Risk level */}
        <span
          className={
            metrics.riskLevel === "Low"
              ? "text-green-600 dark:text-green-400"
              : metrics.riskLevel === "Medium"
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
          }
        >
          {metrics.riskLevel}
        </span>
      </div>
    </div>
  );
}

