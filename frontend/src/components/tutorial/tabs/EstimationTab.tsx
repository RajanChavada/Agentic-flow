"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, DollarSign, Clock, BarChart3, TrendingUp, Activity, AlertTriangle, Layers } from "lucide-react";

interface GuideItem {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const ITEMS: GuideItem[] = [
  {
    icon: Zap,
    title: "Running an Estimate",
    description:
      'Click "Run Workflow & Gen Estimate" in the header bar. The workflow must have at least one Start and one Finish node. The backend analyzes every node, edge, and loop to compute token counts, costs, and latency.',
    color: "#3b82f6",
  },
  {
    icon: BarChart3,
    title: "Estimate Panel",
    description:
      "After running, the Estimate Panel slides up from the bottom showing KPI cards (total tokens, cost, latency) and a per-node breakdown chart. Click on any bar to see details for that specific node.",
    color: "#6366f1",
  },
  {
    icon: DollarSign,
    title: "Cost Breakdown",
    description:
      "Each node shows its input cost, output cost, and total cost based on the selected model's pricing. The breakdown highlights which nodes are the biggest cost drivers with bottleneck severity indicators.",
    color: "#22c55e",
  },
  {
    icon: Clock,
    title: "Latency & Critical Path",
    description:
      "The critical path shows the longest chain of sequential nodes from Start to Finish. Parallel nodes don't add to the critical path. The estimate panel highlights which nodes lie on this path.",
    color: "#f97316",
  },
  {
    icon: Activity,
    title: "Cycle Detection",
    description:
      "If your workflow has loops (cycles), the estimator detects them using graph analysis. It shows min/avg/max ranges for tokens, cost, and latency based on expected loop iterations.",
    color: "#ef4444",
  },
  {
    icon: TrendingUp,
    title: "Scaling Projections",
    description:
      'Set "Runs per day" in the scaling section to see projected monthly costs and token usage. Use the "Loop intensity" slider to stress-test loop-heavy workflows.',
    color: "#8b5cf6",
  },
  {
    icon: AlertTriangle,
    title: "Health Score",
    description:
      "Every estimate includes a health score (A through F). It evaluates cost efficiency, loop risk, parallelism usage, and overall workflow structure. Badges like \"Cost-efficient\" or \"Loop-heavy\" highlight key traits.",
    color: "#eab308",
  },
  {
    icon: Layers,
    title: "Compare Workflows",
    description:
      "Select two or more workflows in the sidebar using checkboxes, then click \"Compare Selected\". This runs a batch estimate and shows a side-by-side comparison in a drawer panel.",
    color: "#14b8a6",
  },
];

export default function EstimationTab({ isDark }: { isDark: boolean }) {
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
