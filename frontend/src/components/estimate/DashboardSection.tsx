"use client";

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type SectionId = 'health' | 'breakdown' | 'cycles' | 'scaling' | 'observability';

interface DashboardSectionProps {
  id: SectionId;
  title: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isDark: boolean;
}

export default function DashboardSection({
  id,
  title,
  icon,
  collapsed,
  onToggle,
  children,
  isDark,
}: DashboardSectionProps) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-full flex items-center gap-2 py-2 -mx-1 px-1 rounded-lg transition-colors
          ${isDark ? 'hover:bg-slate-800/60 text-slate-200' : 'hover:bg-gray-100 text-gray-700'}
        `}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" />
        )}
        <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>
        <span className="text-sm font-semibold">{title}</span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: collapsed ? 0 : 2000 }}
      >
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
