"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lightbulb, Keyboard, Zap, Shield, Workflow, BarChart3 } from "lucide-react";

interface TipItem {
  icon: React.ElementType;
  title: string;
  tips: string[];
  color: string;
}

const SECTIONS: TipItem[] = [
  {
    icon: Keyboard,
    title: "Keyboard Shortcuts",
    color: "#3b82f6",
    tips: [
      "Delete / Backspace -- Remove selected nodes or edges",
      "Ctrl+Z / Cmd+Z -- Undo last action",
      "Ctrl+Shift+Z / Cmd+Shift+Z -- Redo",
      "Escape -- Deselect all / close modals",
      "Arrow keys -- Navigate this tutorial",
    ],
  },
  {
    icon: Zap,
    title: "Workflow Best Practices",
    color: "#22c55e",
    tips: [
      "Always start with a Start node and end with a Finish node",
      "Use condition nodes to model branching logic with probability splits",
      "Set max_steps on agent nodes inside loops to cap iteration costs",
      "Add context to agent nodes for more accurate token estimation",
      "Use the Ideal State node to define clear success criteria upfront",
    ],
  },
  {
    icon: BarChart3,
    title: "Getting Better Estimates",
    color: "#f97316",
    tips: [
      "Set the task type (classification, summarization, RAG, etc.) for smarter output predictions",
      "Use expected_output_size to hint at response length (short/medium/long/very_long)",
      "Assign specific models to agents -- different models have very different costs",
      "Add tool nodes to agents that use them -- tool schema tokens affect input costs",
      "Use scaling projections to forecast monthly spend before deploying",
    ],
  },
  {
    icon: Workflow,
    title: "Advanced Patterns",
    color: "#8b5cf6",
    tips: [
      "Create loops by connecting a downstream node back to an upstream node",
      "Use parallel branches (multiple outputs from one node) for concurrent execution",
      "Combine condition nodes with loops for retry-until-success patterns",
      "Use batch comparison to evaluate model swaps (e.g., GPT-4o vs Claude Sonnet)",
    ],
  },
  {
    icon: Shield,
    title: "Data & Privacy",
    color: "#06b6d4",
    tips: [
      "Guest mode works fully offline -- no data is sent to our servers",
      "Signed-in workflows sync to your private Supabase account",
      "Shared workflows are read-only for recipients",
      "Estimation runs locally -- your workflow context is only sent to the estimator API",
    ],
  },
];

export default function TipsTab({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-4 overflow-y-auto max-h-[420px] pr-1">
      {SECTIONS.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.08 }}
        >
          <h3 className={`text-xs font-bold mb-2 flex items-center gap-2 ${isDark ? "text-slate-200" : "text-gray-800"}`}>
            <section.icon className="w-3.5 h-3.5" style={{ color: section.color }} />
            {section.title}
          </h3>
          <div className={`rounded-lg border p-3 space-y-1.5 ${isDark ? "border-slate-700 bg-slate-800/50" : "border-gray-100 bg-gray-50"}`}>
            {section.tips.map((tip, i) => (
              <div key={i} className="flex gap-2">
                <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" style={{ color: section.color, opacity: 0.6 }} />
                <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-gray-600"}`}>{tip}</p>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
