"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b"];

export interface ActivityDonutDataItem {
  name: string;
  value: number;
}

interface ActivityDonutChartProps {
  data: ActivityDonutDataItem[];
  isDark: boolean;
}

export default function ActivityDonutChart({ data, isDark }: ActivityDonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const displayData =
    total > 0
      ? data
      : [{ name: "No data", value: 1 }];

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={displayData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            stroke={isDark ? "#1e293b" : "#ffffff"}
            strokeWidth={2}
          >
            {displayData.map((_, i) => (
              <Cell
                key={i}
                fill={total > 0 ? CHART_COLORS[i % CHART_COLORS.length] : (isDark ? "#475569" : "#d1d5db")}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderColor: isDark ? "#475569" : "#e5e7eb",
              color: isDark ? "#e2e8f0" : "#1f2937",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => {
              if (name === "No data") return ["—", "—"];
              const v = typeof value === "number" ? value : 0;
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return [`${v} (${pct}%)`, name ?? ""] as [React.ReactNode, string];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) => (
              <span className={isDark ? "text-slate-300" : "text-gray-600"}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
