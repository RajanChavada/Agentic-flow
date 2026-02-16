"use client";

import React from "react";
import { X } from "lucide-react";
import { useUIState, useWorkflowStore } from "@/store/useWorkflowStore";

/** Thin banner shown at the top when there's an error. */
export default function ErrorBanner() {
  const { errorBanner, theme } = useUIState();
  const setErrorBanner = useWorkflowStore((s) => s.setErrorBanner);
  const isDark = theme === "dark";

  if (!errorBanner) return null;

  return (
    <div
      className={`flex items-center justify-between border-b px-6 py-2 text-sm ${
        isDark
          ? "bg-red-900/30 border-red-800 text-red-300"
          : "bg-red-100 border-red-300 text-red-800"
      }`}
    >
      <span>{errorBanner}</span>
      <button
        onClick={() => setErrorBanner(undefined)}
        className={`ml-4 text-xs ${isDark ? "text-red-400 hover:text-red-200" : "text-red-500 hover:text-red-700"}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
