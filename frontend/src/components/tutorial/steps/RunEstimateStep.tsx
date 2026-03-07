"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, DollarSign, Clock, BarChart3 } from "lucide-react";

const KPI_CHIPS = [
  { icon: Zap, label: "Tokens", value: "12,450", color: "#3b82f6" },
  { icon: DollarSign, label: "Cost", value: "$0.0234", color: "#22c55e" },
  { icon: Clock, label: "Latency", value: "2.4s", color: "#f97316" },
];

const BAR_DATA = [
  { label: "Agent 1", width: 85, color: "#3b82f6" },
  { label: "Agent 2", width: 55, color: "#6366f1" },
  { label: "Tool", width: 30, color: "#f97316" },
  { label: "Condition", width: 5, color: "#a855f7" },
];

export default function RunEstimateStep({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-5">
      {/* Mock estimate button */}
      <motion.div
        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        Run Workflow & Gen Estimate
      </motion.div>

      {/* KPI chips row */}
      <div className="flex gap-3">
        {KPI_CHIPS.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 ${
              isDark ? "border-slate-600 bg-slate-800" : "border-gray-200 bg-white"
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
          >
            <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
            <div>
              <p className={`text-[9px] uppercase tracking-wide ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {kpi.label}
              </p>
              <p className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
                {kpi.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Animated bar chart */}
      <motion.div
        className={`w-full max-w-sm rounded-lg border p-3 ${
          isDark ? "border-slate-600 bg-slate-800/60" : "border-gray-200 bg-gray-50"
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart3 className={`w-3.5 h-3.5 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
          <span className={`text-[11px] font-semibold ${isDark ? "text-slate-300" : "text-gray-700"}`}>
            Cost Breakdown
          </span>
        </div>

        <div className="space-y-2">
          {BAR_DATA.map((bar, i) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className={`w-16 text-[10px] text-right shrink-0 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {bar.label}
              </span>
              <div className={`flex-1 h-3 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: bar.color }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${bar.width}%` }}
                  transition={{ duration: 0.6, delay: 0.8 + i * 0.15, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
