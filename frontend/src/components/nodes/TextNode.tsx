"use client";
"use no memo";

import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { type NodeProps } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/useWorkflowStore";

const DEFAULT_STYLE = {
  content: "Text",
  fontSize: "md" as const,
  color: "#374151",
  background: "none" as const,
  backgroundColor: undefined as string | undefined,
};

const FONT_SIZE_MAP: Record<string, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg font-medium",
  heading: "text-xl font-bold",
};

function TextNode({ id, data, selected }: NodeProps & { data: WorkflowNodeData }) {
  const style = { ...DEFAULT_STYLE, ...data.textNodeStyle };
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(style.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { updateNodeData } = useWorkflowStore();

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== style.content) {
      updateNodeData(id, {
        textNodeStyle: { ...style, content: trimmed },
      });
    }
    setEditing(false);
  }, [editValue, style, id, updateNodeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      }
      if (e.key === "Escape") {
        setEditValue(style.content);
        setEditing(false);
      }
    },
    [commitEdit, style.content]
  );

  const bgClass =
    style.background === "pill"
      ? isDark
        ? "bg-slate-700/60 px-3 py-1 rounded-full"
        : "bg-gray-100 px-3 py-1 rounded-full"
      : style.background === "badge"
      ? isDark
        ? "bg-slate-700/80 px-2.5 py-1 rounded-md"
        : "bg-gray-100 px-2.5 py-1 rounded-md"
      : "";

  const bgInline =
    style.background !== "none" && style.backgroundColor
      ? { backgroundColor: style.backgroundColor }
      : undefined;

  return (
    <div
      className={`cursor-default select-none ${bgClass} ${
        selected ? "ring-2 ring-blue-400 ring-offset-1 rounded" : ""
      }`}
      style={bgInline}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditValue(style.content);
        setEditing(true);
      }}
    >
      {editing ? (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className={`resize-none border-none outline-none bg-transparent min-w-[60px] ${FONT_SIZE_MAP[style.fontSize]}`}
          style={{ color: isDark ? "#e2e8f0" : style.color }}
          rows={1}
        />
      ) : (
        <span
          className={`whitespace-pre-wrap ${FONT_SIZE_MAP[style.fontSize]}`}
          style={{ color: isDark ? "#e2e8f0" : style.color }}
        >
          {style.content || "Double-click to edit"}
        </span>
      )}
    </div>
  );
}

export default memo(TextNode);
