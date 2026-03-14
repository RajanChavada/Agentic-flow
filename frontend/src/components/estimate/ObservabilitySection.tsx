"use client";

import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import type { WorkflowEstimation, NodeEstimation, ActualNodeStats } from '@/types/workflow';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { BreakdownWithType } from './types';
import { NODE_COLOURS } from './types';
import DashboardSection from './DashboardSection';

interface ChartDataItem {
  name: string;
  tokens: number;
  cost: number;
  latency: number;
}

interface ObservabilitySectionProps {
  estimation: WorkflowEstimation;
  actualStats: ActualNodeStats[];
  setActualStats: (stats: ActualNodeStats[]) => void;
  clearActualStats: () => void;
  chartData: ChartDataItem[];
  activeBreakdown: BreakdownWithType[];
  isDark: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

export default function ObservabilitySection({
  estimation,
  actualStats,
  setActualStats,
  clearActualStats,
  chartData,
  activeBreakdown,
  isDark,
  collapsed,
  onToggle,
}: ObservabilitySectionProps) {
  return (
    <DashboardSection
      id="observability"
      title="Observability"
      icon={<Radio className="w-4 h-4" />}
      collapsed={collapsed}
      onToggle={onToggle}
      isDark={isDark}
    >
      <div className="flex items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
        <div className="max-w-xs space-y-2">
          <Radio className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-slate-700" : "text-gray-300"}`} />
          <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            Telemetry analysis active
          </p>
          <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            Detailed model-level token distribution has been moved to the <span className="font-bold">Overview</span> tab for better consolidation.
          </p>
        </div>
      </div>
    </DashboardSection>
  );
}
