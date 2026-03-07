"use client";

import React from "react";
import { motion } from "framer-motion";
import { Save, SaveAll, FilePlus, Pencil, Cloud, FolderOpen } from "lucide-react";

interface GuideItem {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const ITEMS: GuideItem[] = [
  {
    icon: Save,
    title: "Save Workflow",
    description:
      'Click "Save" in the header to persist your current workflow. If you\'re not signed in, you\'ll be prompted to sign in first. Each save updates the existing workflow in your canvas.',
    color: "#22c55e",
  },
  {
    icon: SaveAll,
    title: "Save As",
    description:
      'Use "Save As" to create a copy of the current workflow under a new name. This is useful for creating variations of the same workflow for A/B comparison.',
    color: "#14b8a6",
  },
  {
    icon: FilePlus,
    title: "New Workflow",
    description:
      'Click "New" to start a blank workflow. If you have unsaved changes, you\'ll see a confirmation dialog before the canvas is cleared.',
    color: "#3b82f6",
  },
  {
    icon: Pencil,
    title: "Rename Workflow",
    description:
      "Click the workflow name in the header bar to rename it inline. Press Enter to save or Escape to cancel. You can also double-click workflow names in the sidebar list.",
    color: "#f97316",
  },
  {
    icon: FolderOpen,
    title: "Load a Workflow",
    description:
      "Your saved workflows appear in the left sidebar. Click any workflow name to load it onto the canvas. The current workflow is highlighted with a blue left border.",
    color: "#8b5cf6",
  },
  {
    icon: Cloud,
    title: "Cloud Sync",
    description:
      "When signed in, all workflows sync to the cloud automatically. A cloud icon appears next to the workflow list to confirm sync status. An amber dot in the header indicates unsaved local changes.",
    color: "#06b6d4",
  },
];

export default function SaveManageTab({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
      {ITEMS.map((item, i) => (
        <motion.div
          key={item.title}
          className={`flex gap-3 rounded-lg border p-3 ${isDark ? "border-slate-700 bg-slate-800/50" : "border-gray-100 bg-gray-50"}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
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
