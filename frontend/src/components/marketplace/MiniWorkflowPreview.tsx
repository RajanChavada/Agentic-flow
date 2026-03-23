"use client";

import React, { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import type { NodeConfigPayload, EdgeConfigPayload } from "@/types/workflow";
import { cn } from "@/lib/utils";

const NODE_SIZE = 12;
const PADDING = 8;
const SKIP_TYPES = new Set(["blankBoxNode", "textNode"]);

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  startNode: { fill: "#22c55e", stroke: "#16a34a" },
  agentNode: { fill: "#3b82f6", stroke: "#2563eb" },
  toolNode: { fill: "#f59e0b", stroke: "#d97706" },
  finishNode: { fill: "#ef4444", stroke: "#dc2626" },
  blankBoxNode: { fill: "#94a3b8", stroke: "#64748b" },
  textNode: { fill: "#94a3b8", stroke: "#64748b" },
};

interface Props {
  nodes: NodeConfigPayload[];
  edges: EdgeConfigPayload[];
  isDark?: boolean;
  className?: string;
}

export default function MiniWorkflowPreview({ nodes, edges, isDark, className }: Props) {
  const { positions: posMap, bounds, offset } = useMemo(() => {
    const flowNodes = nodes.filter((n) => !SKIP_TYPES.has(n.type));
    if (flowNodes.length === 0) {
      return {
        positions: new Map<string, { x: number; y: number }>(),
        bounds: { w: 80, h: 40 },
        offset: { x: 0, y: 0 },
      };
    }

    // 1. Try to use actual positions if ALL nodes have them
    const allHavePos = flowNodes.every(n => n.position && typeof n.position.x === 'number');
    if (allHavePos) {
      const positions = new Map<string, { x: number; y: number }>();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      const rawPos: [string, number, number][] = flowNodes.map(n => [n.id, n.position!.x, n.position!.y]);
      for (const [_, x, y] of rawPos) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      // Normalization factor: map largest dimension to ~120px to keep NODE_SIZE 12 looking good
      const rawW = Math.max(1, maxX - minX);
      const rawH = Math.max(1, maxY - minY);
      const scale = Math.max(rawW / 120, rawH / 60, 1.0);

      for (const [id, x, y] of rawPos) {
        positions.set(id, { 
          x: (x - minX) / scale, 
          y: (y - minY) / scale 
        });
      }
      
      const w = rawW / scale + PADDING * 2;
      const h = Math.max(rawH / scale, 20) + PADDING * 2;
      return {
        positions,
        bounds: { w, h },
        offset: { x: -PADDING, y: -(h - rawH / scale) / 2 },
      };
    }

    // 2. Fallback to Dagre with variety
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    
    // Simple heuristic: alternate layout based on node count to create variety
    const rankdir = flowNodes.length % 2 === 0 ? "TB" : "LR";
    g.setGraph({ rankdir, nodesep: 16, ranksep: 20 });

    for (const n of flowNodes) {
      g.setNode(n.id, { width: NODE_SIZE, height: NODE_SIZE });
    }
    for (const e of edges) {
      if (g.hasNode(e.source) && g.hasNode(e.target)) {
        g.setEdge(e.source, e.target);
      }
    }
    dagre.layout(g);

    const positions = new Map<string, { x: number; y: number }>();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of flowNodes) {
      const pos = g.node(n.id);
      const x = pos.x - NODE_SIZE / 2;
      const y = pos.y - NODE_SIZE / 2;
      positions.set(n.id, { x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + NODE_SIZE);
      maxY = Math.max(maxY, y + NODE_SIZE);
    }
    const w = Math.max(1, maxX - minX + PADDING * 2);
    const h = Math.max(1, maxY - minY + PADDING * 2);
    return {
      positions,
      bounds: { w, h },
      offset: { x: minX - PADDING, y: minY - PADDING },
    };
  }, [nodes, edges]);

  const flowNodes = nodes.filter((n) => !SKIP_TYPES.has(n.type));
  const strokeColor = isDark ? "#475569" : "#cbd5e1";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border bg-muted/30",
        isDark ? "border-gray-700" : "border-gray-200",
        className
      )}
      style={{ minHeight: 56 }}
    >
      <svg
        viewBox={`0 0 ${bounds.w} ${bounds.h}`}
        className="h-14 w-full max-w-[140px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {edges.map((e) => {
          const src = posMap.get(e.source);
          const tgt = posMap.get(e.target);
          if (!src || !tgt) return null;
          const sx = src.x + NODE_SIZE / 2 - offset.x;
          const sy = src.y + NODE_SIZE / 2 - offset.y;
          const tx = tgt.x + NODE_SIZE / 2 - offset.x;
          const ty = tgt.y + NODE_SIZE / 2 - offset.y;
          return (
            <line
              key={`${e.source}-${e.target}`}
              x1={sx}
              y1={sy}
              x2={tx}
              y2={ty}
              stroke={strokeColor}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}
        {flowNodes.map((n) => {
          const pos = posMap.get(n.id);
          if (!pos) return null;
          const x = pos.x - offset.x;
          const y = pos.y - offset.y;
          const colors = NODE_COLORS[n.type] ?? NODE_COLORS.agentNode;
          const isDiamond = n.type === "toolNode";
          if (isDiamond) {
            const cx = x + NODE_SIZE / 2;
            const cy = y + NODE_SIZE / 2;
            const r = NODE_SIZE / 2;
            const points = [
              `${cx},${cy - r}`,
              `${cx + r},${cy}`,
              `${cx},${cy + r}`,
              `${cx - r},${cy}`,
            ].join(" ");
            return (
              <polygon
                key={n.id}
                points={points}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={1}
              />
            );
          }
          const isCircle = n.type === "startNode" || n.type === "finishNode";
          if (isCircle) {
            return (
              <circle
                key={n.id}
                cx={x + NODE_SIZE / 2}
                cy={y + NODE_SIZE / 2}
                r={NODE_SIZE / 2 - 0.5}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={1}
              />
            );
          }
          return (
            <rect
              key={n.id}
              x={x}
              y={y}
              width={NODE_SIZE}
              height={NODE_SIZE}
              rx={3}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={1}
            />
          );
        })}
      </svg>
    </div>
  );
}
