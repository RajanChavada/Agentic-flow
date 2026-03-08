"use client";

import React from "react";
import { motion } from "framer-motion";
import MiniWorkflowPreview from "@/components/marketplace/MiniWorkflowPreview";
import type { WorkflowTemplate } from "@/types/workflow";

interface Props {
  template: WorkflowTemplate;
  isDark: boolean;
  onSelect: (id: string) => void;
  index: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  rag: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  research: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  orchestration: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  custom: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400",
};

export default function OverlayTemplateCard({ template, isDark, onSelect, index }: Props) {
  const categoryClass = CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.custom;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.06, duration: 0.3 }}
      onClick={() => onSelect(template.id)}
      className={`group flex flex-col gap-2 rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer ${
        isDark
          ? "border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      } hover:shadow-md hover:-translate-y-0.5`}
    >
      <div className="transition-transform duration-200 group-hover:scale-[1.03]">
        <MiniWorkflowPreview
          nodes={template.graph.nodes}
          edges={template.graph.edges}
          isDark={isDark}
          className="pointer-events-none"
        />
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <span
          className={`text-sm font-semibold truncate ${
            isDark ? "text-slate-200" : "text-gray-800"
          }`}
        >
          {template.name}
        </span>
        <span
          className={`inline-flex self-start rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryClass}`}
        >
          {template.category}
        </span>
      </div>
    </motion.button>
  );
}
