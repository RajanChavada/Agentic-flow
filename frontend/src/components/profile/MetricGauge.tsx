"use client";

import React from "react";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

const GAUGE_MAX = 50;

interface MetricGaugeProps {
  label: string;
  value: number;
  max?: number;
  isDark: boolean;
}

export default function MetricGauge({
  label,
  value,
  max = GAUGE_MAX,
  isDark,
}: MetricGaugeProps) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const data = [{ name: label, value: pct, fill: isDark ? "#3b82f6" : "#2563eb" }];

  return (
    <div
      className={`flex flex-col items-center rounded-xl border p-4 transition ${
        isDark ? "border-slate-700 bg-slate-800/40" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="h-24 w-24">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={8}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background={{ fill: isDark ? "#334155" : "#e5e7eb" }}
              cornerRadius={4}
              dataKey="value"
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p
        className={`mt-1 text-2xl font-semibold ${isDark ? "text-slate-100" : "text-gray-900"}`}
      >
        {value}
      </p>
      <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
        {label}
      </p>
    </div>
  );
}
