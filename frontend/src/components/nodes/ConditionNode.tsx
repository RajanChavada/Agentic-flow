"use client";
"use no memo";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";
import { GitBranch } from "lucide-react";

function ConditionNode({ id, data, selected }: NodeProps & { data: WorkflowNodeData }) {
  // Detect dark mode via html class (per project conventions)
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const conditionExpr = (data.conditionExpression as string | undefined) ?? "";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 120 }}>
      {/* Input handle at top */}
      <Handle
        id="t-top"
        type="target"
        position={Position.Top}
        className="bg-gray-500! w-2.5! h-2.5!"
      />

      {/* Outer diamond for border */}
      <div
        className={`
          absolute inset-0 transition-all duration-300
          ${isDark ? "bg-purple-400" : "bg-purple-500"}
          ${selected ? "ring-2 ring-offset-2 ring-blue-400" : ""}
        `}
        style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
      />

      {/* Inner diamond for fill (inset by 2px for border effect) */}
      <div
        className={`
          absolute flex items-center justify-center
          transition-all duration-300
          ${isDark ? "bg-purple-900/30" : "bg-purple-50"}
        `}
        style={{
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          inset: "2px",
        }}
      >
        {/* Node content */}
        <div className="flex flex-col items-center justify-center gap-0.5 px-2">
          <GitBranch className={`w-4 h-4 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
          <span className={`text-xs font-semibold truncate max-w-[70px] ${isDark ? "text-purple-100" : "text-purple-900"}`}>
            {data.label || "Condition"}
          </span>
          {conditionExpr && (
            <span
              className={`text-[9px] truncate max-w-[70px] leading-tight ${isDark ? "text-purple-300/80" : "text-purple-700/70"}`}
              title={conditionExpr}
            >
              {conditionExpr}
            </span>
          )}
        </div>
      </div>

      {/* True output handle at RIGHT with label */}
      <Handle
        id="s-right-true"
        type="source"
        position={Position.Right}
        style={{ background: "#22c55e", width: 12, height: 12 }}
        className="border-2 border-white dark:border-slate-800"
      />
      <span
        className="absolute text-[10px] font-semibold text-green-600 dark:text-green-400 pointer-events-none"
        style={{ right: -36, top: "50%", transform: "translateY(-50%)" }}
      >
        True
      </span>

      {/* False output handle at BOTTOM with label */}
      <Handle
        id="s-bottom-false"
        type="source"
        position={Position.Bottom}
        style={{ background: "#ef4444", width: 12, height: 12 }}
        className="border-2 border-white dark:border-slate-800"
      />
      <span
        className="absolute text-[10px] font-semibold text-red-600 dark:text-red-400 pointer-events-none"
        style={{ bottom: -18, left: "50%", transform: "translateX(-50%)" }}
      >
        False
      </span>
    </div>
  );
}

export default memo(ConditionNode);
