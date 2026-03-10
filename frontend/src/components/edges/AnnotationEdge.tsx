"use client";
"use no memo";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  MarkerType,
  type EdgeProps,
} from "@xyflow/react";
import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/useWorkflowStore";

/** Compact preview of a JSON Schema's top-level properties. */
function schemaPreview(schema: Record<string, unknown> | null | undefined): string {
  if (!schema) return "No schema";
  const props = (schema.properties as Record<string, { type?: string }>) || {};
  const keys = Object.keys(props).slice(0, 3);
  const display = keys.map((k) => `${k}: ${props[k]?.type || "?"}`).join(", ");
  return `{ ${display}${Object.keys(props).length > 3 ? ", ..." : ""} }`;
}

export default function AnnotationEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  sourceHandleId,
}: EdgeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [badgeHover, setBadgeHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateEdgeLabel = useWorkflowStore((s) => s.updateEdgeLabel);
  const contractResults = useWorkflowStore((s) => s.contractResults);
  const allNodes = useWorkflowStore((s) => s.nodes);

  const savedLabel = (data as Record<string, unknown> | undefined)?.label as
    | string
    | undefined;

  // Find contract result for this edge
  const contract = contractResults.find(
    (r) => r.edge_id === id || (r.source_id === source && r.target_id === target)
  );

  // ── Style overrides ──────────────────────────────────────────
  // Priority: critical path (Canvas.tsx) > condition edges > contract status > default
  const defaultStrokeColor = "#6b7280";
  const isDefaultStroke = !style?.stroke || style.stroke === defaultStrokeColor;

  let finalStyle = style;
  let finalMarkerEnd = markerEnd;
  let isConditionEdge = false;

  // Condition edge coloring: green for True branch, red for False branch
  if (isDefaultStroke && sourceHandleId?.includes("true")) {
    isConditionEdge = true;
    const resolvedStroke = "#22c55e";
    finalStyle = { ...style, stroke: resolvedStroke, strokeWidth: 2 };
    finalMarkerEnd = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: resolvedStroke } as any;
  } else if (isDefaultStroke && sourceHandleId?.includes("false")) {
    isConditionEdge = true;
    const resolvedStroke = "#ef4444";
    finalStyle = { ...style, stroke: resolvedStroke, strokeWidth: 2 };
    finalMarkerEnd = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: resolvedStroke } as any;
  }

  // Contract status coloring (only when no condition or critical-path override)
  if (!isConditionEdge && isDefaultStroke && contract) {
    let contractStroke: string | undefined;
    if (contract.status === "compatible") contractStroke = "#22c55e";
    else if (contract.status === "incompatible") contractStroke = "#ef4444";

    if (contractStroke) {
      finalStyle = { ...finalStyle, stroke: contractStroke, strokeWidth: 2 };
      finalMarkerEnd = {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: contractStroke,
      } as any;
    }
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // ── Label editing ────────────────────────────────────────────
  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDraft(savedLabel ?? "");
      setEditing(true);
    },
    [savedLabel]
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

  // ── Hover preview data ───────────────────────────────────────
  const sourceNode = contract ? allNodes.find((n) => n.id === source) : null;
  const targetNode = contract ? allNodes.find((n) => n.id === target) : null;

  // Badge offset: push below label if label/editing is visible
  const badgeOffsetY = savedLabel || editing ? 16 : 0;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={finalMarkerEnd} style={finalStyle} />

      {/* Transparent wide hit area for double-click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onDoubleClick={onDoubleClick}
        style={{ cursor: "pointer" }}
      />

      <EdgeLabelRenderer>
        {/* ── Annotation label ── */}
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

        {/* ── Contract status badge ── */}
        {contract && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + badgeOffsetY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
            onMouseEnter={() => setBadgeHover(true)}
            onMouseLeave={() => setBadgeHover(false)}
          >
            <div className="relative">
              {/* Badge circle */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border shadow-sm cursor-default transition-colors",
                  contract.status === "compatible"
                    ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-600"
                    : contract.status === "incompatible"
                      ? "bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-600"
                      : "bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600"
                )}
              >
                {contract.status === "compatible" && (
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                )}
                {contract.status === "incompatible" && (
                  <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                )}
                {contract.status === "unvalidated" && (
                  <Minus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                )}
              </div>

              {/* Hover preview panel */}
              {badgeHover && (
                <div
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 w-64 rounded-lg border shadow-lg p-3 text-[11px] leading-relaxed",
                    "bg-white border-stone-200 dark:bg-slate-900 dark:border-slate-700"
                  )}
                >
                  <p className="font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
                    Edge Contract
                  </p>

                  {/* Source node */}
                  <div className="mb-1.5">
                    <span className="text-stone-500 dark:text-slate-400">Source: </span>
                    <span className="font-medium text-stone-700 dark:text-slate-200">
                      {sourceNode?.data?.label || source}
                    </span>
                    <p className="font-mono text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                      {schemaPreview(
                        sourceNode?.data?.outputSchema as
                          | Record<string, unknown>
                          | null
                          | undefined
                      )}
                    </p>
                  </div>

                  {/* Target node */}
                  <div className="mb-1.5">
                    <span className="text-stone-500 dark:text-slate-400">Target: </span>
                    <span className="font-medium text-stone-700 dark:text-slate-200">
                      {targetNode?.data?.label || target}
                    </span>
                    <p className="font-mono text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                      {schemaPreview(
                        targetNode?.data?.inputSchema as
                          | Record<string, unknown>
                          | null
                          | undefined
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <div
                    className={cn(
                      "flex items-center gap-1 pt-1.5 border-t font-medium",
                      contract.status === "compatible"
                        ? "text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                        : contract.status === "incompatible"
                          ? "text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30"
                          : "text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-800"
                    )}
                  >
                    {contract.status === "compatible" && <Check className="w-3 h-3" />}
                    {contract.status === "incompatible" && <X className="w-3 h-3" />}
                    {contract.status === "unvalidated" && <Minus className="w-3 h-3" />}
                    {contract.status === "compatible"
                      ? "Compatible"
                      : contract.status === "incompatible"
                        ? "Incompatible"
                        : "Unvalidated"}
                  </div>

                  {/* Error list */}
                  {contract.errors.length > 0 && (
                    <ul className="mt-1 text-[10px] text-red-600 dark:text-red-400 list-disc list-inside">
                      {contract.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
