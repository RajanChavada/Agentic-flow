"use client";

import React from "react";
import { Boxes } from "@/components/ui/background-boxes";

export function BackgroundBoxesDemo() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-gray-50 dark:border-slate-700/60 dark:bg-slate-900">
      <Boxes />
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Built for Engineers
        </h2>
        <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-slate-400 sm:text-base">
          DAG analysis, critical-path detection, token-level cost breakdowns —
          everything you need to architect efficient agentic systems.
        </p>
      </div>
    </div>
  );
}

export default BackgroundBoxesDemo;
