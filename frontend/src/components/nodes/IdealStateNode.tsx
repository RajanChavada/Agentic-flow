"use client";
"use no memo";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";
import { Target, CheckCircle2 } from "lucide-react";

function IdealStateNode({ id, data, selected }: NodeProps & { data: WorkflowNodeData }) {
  // Detect dark mode via html class (per project conventions)
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const description = (data.idealStateDescription as string | undefined) ?? "";
  const hasSchema = Boolean(data.idealStateSchema);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 80 }}>
      {/* Input handle at top (terminal/goal node - no output handles) */}
      <Handle
        id="t-top"
        type="target"
        position={Position.Top}
        className="bg-gray-500! w-2.5! h-2.5!"
      />

      {/* Outer rounded rectangle for border */}
      <div
        className={`
          absolute inset-0 rounded-xl transition-all duration-300
          ${isDark ? "bg-teal-400" : "bg-teal-500"}
          ${selected ? "ring-2 ring-offset-2 ring-blue-400" : ""}
        `}
      />

      {/* Inner rectangle for fill (inset by 2px for border effect) */}
      <div
        className={`
          absolute rounded-xl flex items-center justify-center
          transition-all duration-300
          ${isDark ? "bg-teal-900/30" : "bg-teal-50"}
        `}
        style={{ inset: "2px" }}
      >
        {/* Node content */}
        <div className="flex flex-col items-center justify-center gap-0.5 px-3">
          <div className="relative">
            <Target className={`w-4 h-4 ${isDark ? "text-teal-400" : "text-teal-600"}`} />
            {/* Schema generated badge (green checkmark) */}
            {hasSchema && (
              <CheckCircle2
                className="absolute -top-1 -right-2.5 w-3 h-3 text-green-500"
                strokeWidth={2.5}
              />
            )}
          </div>
          <span className={`text-xs font-semibold truncate max-w-[100px] ${isDark ? "text-teal-100" : "text-teal-900"}`}>
            {data.label || "Ideal State"}
          </span>
          {description && (
            <span
              className={`text-[9px] truncate max-w-[100px] leading-tight ${isDark ? "text-teal-300/80" : "text-teal-700/70"}`}
              title={description}
            >
              {description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(IdealStateNode);
