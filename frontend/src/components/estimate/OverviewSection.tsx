"use client";

import React from 'react';
import type { WorkflowEstimation } from '@/types/workflow';

interface OverviewSectionProps {
  estimation: WorkflowEstimation;
  isDark: boolean;
  isFullscreen: boolean;
  heroTextClass: string;
}

export default function OverviewSection({
  estimation,
  isDark,
  isFullscreen,
  heroTextClass,
}: OverviewSectionProps) {
  return (
    <div className="space-y-4">
      {/* Hero row: 3 cards */}
      <div className={`grid ${isFullscreen ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'} gap-4 min-w-0`}>
        {/* Tokens card */}
        <div
          className={`
            rounded-xl border p-5 min-h-[120px] flex flex-col min-w-0 overflow-hidden
            ${isDark ? 'bg-muted/50 border-slate-700' : 'bg-muted/50 border-gray-200'}
          `}
        >
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Token Usage
          </p>
          {estimation.token_range ? (
            <>
              <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                {estimation.token_range.avg.toLocaleString()}
              </p>
              <div className={`text-[10px] mt-1 flex gap-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <span>Min: {estimation.token_range.min.toLocaleString()}</span>
                <span>Max: {estimation.token_range.max.toLocaleString()}</span>
              </div>
            </>
          ) : (
            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
              {estimation.total_tokens.toLocaleString()}
            </p>
          )}
          <p className={`text-xs mt-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Tokens (avg)</p>
        </div>

        {/* Cost card */}
        <div
          className={`
            rounded-xl border p-5 min-h-[120px] flex flex-col min-w-0 overflow-hidden
            ${isDark ? 'bg-muted/50 border-slate-700' : 'bg-muted/50 border-gray-200'}
          `}
        >
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Cost
          </p>
          {estimation.cost_range ? (
            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
              ${estimation.cost_range.avg.toFixed(4)}
            </p>
          ) : (
            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
              ${estimation.total_cost.toFixed(4)}
            </p>
          )}
          {estimation.cost_range && (
            <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              ${estimation.cost_range.min.toFixed(4)} – ${estimation.cost_range.max.toFixed(4)}
            </p>
          )}
          <p className={`text-xs mt-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Per run</p>
        </div>

        {/* Latency card */}
        <div
          className={`
            rounded-xl border p-5 min-h-[120px] flex flex-col min-w-0 overflow-hidden
            ${isDark ? 'bg-muted/50 border-slate-700' : 'bg-muted/50 border-gray-200'}
          `}
        >
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Latency
          </p>
          {estimation.latency_range ? (
            <>
              <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
                {estimation.latency_range.avg.toFixed(2)}s
              </p>
              <div className={`text-[10px] mt-1 flex gap-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <span>Min: {estimation.latency_range.min.toFixed(2)}s</span>
                <span>Max: {estimation.latency_range.max.toFixed(2)}s</span>
              </div>
            </>
          ) : (
            <p className={`${heroTextClass} font-bold mt-1 tabular-nums`}>
              {estimation.total_latency.toFixed(2)}s
            </p>
          )}
          <p className={`text-xs mt-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            P95 estimate
            {estimation.total_tool_latency > 0 && (
              <span className={`ml-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                · {(estimation.total_tool_latency * 1000).toFixed(0)} ms tool
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Graph type + Health badge inline */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Graph type: <span className="font-semibold">{estimation.graph_type}</span>
        </span>
        {estimation.health && (
          <span
            className={`
              text-xs px-2.5 py-1 rounded-md font-semibold
              ${estimation.health.grade === 'A' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                estimation.health.grade === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                estimation.health.grade === 'C' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                estimation.health.grade === 'D' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}
            `}
          >
            Health: {estimation.health.grade} ({estimation.health.score}/100)
          </span>
        )}
      </div>
    </div>
  );
}
