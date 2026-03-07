"use client";

import React from "react";
import { motion } from "framer-motion";
import { Type, Square, MousePointerClick, Palette, GitBranch, LayoutDashboard, Grip, Target } from "lucide-react";

interface GuideItem {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const ITEMS: GuideItem[] = [
  {
    icon: MousePointerClick,
    title: "Edge Labels",
    description:
      "Double-click any edge (arrow) on the canvas to add a text label. This is useful for annotating connections with descriptions like \"on success\" or \"retry\". Press Enter to save, Escape to cancel.",
    color: "#3b82f6",
  },
  {
    icon: Square,
    title: "Group Boxes",
    description:
      'Drag a "Group Box" from the Canvas Authoring section in the sidebar. Use it to visually group related nodes together. Double-click the group header to add a title. Resize by dragging corners.',
    color: "#6b7280",
  },
  {
    icon: Type,
    title: "Text Labels",
    description:
      'Drag a "Text Label" from the sidebar to add freeform text annotations anywhere on the canvas. Double-click to edit. Use these for documentation, version notes, or section headers.',
    color: "#8b5cf6",
  },
  {
    icon: GitBranch,
    title: "Condition Branches",
    description:
      "Condition nodes have two output handles: True (green, right side) and False (red, bottom). Connections from these handles are automatically colored. The condition expression is shown on the node face.",
    color: "#a855f7",
  },
  {
    icon: Target,
    title: "Ideal State Node",
    description:
      "Drag an Ideal State node to define success criteria for your workflow. Add a natural language description and optionally generate a JSON schema. Only one Ideal State node per canvas is allowed.",
    color: "#14b8a6",
  },
  {
    icon: Palette,
    title: "Node Configuration",
    description:
      "Click a node to select it (blue ring appears). Click again or double-click to open its configuration modal. Here you can set models, add context, configure tool IDs, or adjust condition parameters.",
    color: "#ec4899",
  },
  {
    icon: LayoutDashboard,
    title: "Auto Layout",
    description:
      'Click the "Layout" button in the header bar to automatically arrange nodes using the dagre algorithm. This is especially useful after importing a workflow or when the canvas gets messy.',
    color: "#06b6d4",
  },
  {
    icon: Grip,
    title: "Canvas Navigation",
    description:
      "Scroll to zoom in/out. Click and drag on empty space to pan. Hold Shift and drag to create a selection box. Selected nodes can be moved together. Use the minimap in the bottom-right corner for orientation.",
    color: "#f97316",
  },
];

export default function CanvasGuideTab({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
      {ITEMS.map((item, i) => (
        <motion.div
          key={item.title}
          className={`flex gap-3 rounded-lg border p-3 ${isDark ? "border-slate-700 bg-slate-800/50" : "border-gray-100 bg-gray-50"}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <item.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: item.color }} />
          <div>
            <p className={`text-xs font-semibold mb-0.5 ${isDark ? "text-slate-100" : "text-gray-900"}`}>{item.title}</p>
            <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-gray-500"}`}>{item.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
