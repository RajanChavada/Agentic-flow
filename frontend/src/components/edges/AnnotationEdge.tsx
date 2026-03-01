"use client";
"use no memo";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
} from "@xyflow/react";
import { useWorkflowStore } from "@/store/useWorkflowStore";

export default function AnnotationEdge({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const updateEdgeLabel = useWorkflowStore((s) => s.updateEdgeLabel);
  const sourceNodeType = useWorkflowStore(
    (s) => s.nodes.find((n) => n.id === source)?.type
  );

  const isBlankBoxSource = sourceNodeType === "blankBoxNode";
  const savedLabel = (data as Record<string, unknown> | undefined)?.label as
    | string
    | undefined;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isBlankBoxSource) return;
      e.stopPropagation();
      setDraft(savedLabel ?? "");
      setEditing(true);
    },
    [isBlankBoxSource, savedLabel]
  );

  const save = useCallback(() => {
    const trimmed = draft.trim();
    updateEdgeLabel(id, trimmed);
    setEditing(false);
  }, [draft, id, updateEdgeLabel]);

  const cancel = useCallback(() => {
    setEditing(false);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [save, cancel]
  );

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />

      {/* Transparent wide hit area for double-click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onDoubleClick={onDoubleClick}
        style={{ cursor: isBlankBoxSource ? "pointer" : "default" }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {editing ? (
            <div className="nodrag nopan">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={save}
                className="rounded-md border border-blue-400 bg-white px-2 py-0.5 text-xs shadow-md outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-800 dark:text-slate-100 dark:border-blue-500"
                style={{ minWidth: 80, maxWidth: 200 }}
                placeholder="Edge label..."
              />
            </div>
          ) : savedLabel ? (
            <span
              className="pointer-events-none select-none rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm dark:bg-slate-700 dark:text-slate-300"
            >
              {savedLabel}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
