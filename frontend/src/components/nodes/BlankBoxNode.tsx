"use client";

import React, { memo } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData, LabelPosition, BlankBoxStyle } from "@/types/workflow";

const DEFAULT_STYLE: BlankBoxStyle = {
  label: "Group",
  labelPosition: "top-left",
  labelColor: "#3b82f6",
  labelBackground: "none",
  borderStyle: "dashed",
  borderColor: "#3b82f6",
  borderWidth: 2,
  backgroundColor: "#eff6ff",
  backgroundOpacity: 40,
  connectable: false,
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const POSITION_CLASSES: Record<LabelPosition, string> = {
  "top-left":      "top-2 left-2",
  "top-center":    "top-2 left-1/2 -translate-x-1/2",
  "top-right":     "top-2 right-2",
  "middle-left":   "top-1/2 left-2 -translate-y-1/2",
  "middle-center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "middle-right":  "top-1/2 right-2 -translate-y-1/2",
  "bottom-left":   "bottom-2 left-2",
  "bottom-center": "bottom-2 left-1/2 -translate-x-1/2",
  "bottom-right":  "bottom-2 right-2",
};

function LabelTag({
  text,
  position,
  color,
  background,
}: {
  text: string;
  position: LabelPosition;
  color: string;
  background: "none" | "pill";
}) {
  if (!text) return null;
  return (
    <span
      className={cn(
        "absolute text-xs font-semibold tracking-wide pointer-events-none select-none",
        background === "pill" && "px-2 py-0.5 rounded-full",
        POSITION_CLASSES[position]
      )}
      style={{
        color,
        backgroundColor: background === "pill" ? color + "20" : "transparent",
      }}
    >
      {text}
    </span>
  );
}

function BlankBoxNode({ data, selected }: NodeProps & { data: WorkflowNodeData }) {
  const s: BlankBoxStyle = { ...DEFAULT_STYLE, ...data.blankBoxStyle };

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        lineClassName="!border-blue-400"
        handleClassName="!w-2.5 !h-2.5 !bg-white !border-blue-400 !rounded-sm"
      />

      {s.connectable && (
        <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />
      )}

      <div
        className="relative w-full h-full rounded-md"
        style={{
          border: s.borderStyle === "none"
            ? "none"
            : `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}`,
          backgroundColor: hexToRgba(s.backgroundColor, s.backgroundOpacity / 100),
          minWidth: 120,
          minHeight: 80,
        }}
      >
        <LabelTag
          text={s.label}
          position={s.labelPosition}
          color={s.labelColor}
          background={s.labelBackground}
        />
      </div>

      {s.connectable && (
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
      )}
    </>
  );
}

export default memo(BlankBoxNode);
