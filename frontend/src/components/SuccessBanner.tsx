"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useUIState, useWorkflowStore } from "@/store/useWorkflowStore";

/** Thin banner shown at the top when there's a success message. */
export default function SuccessBanner() {
  const { successMessage, theme } = useUIState();
  const setSuccessMessage = useWorkflowStore((s) => s.setSuccessMessage);
  const isDark = theme === "dark";

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(undefined), 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage, setSuccessMessage]);

  if (!successMessage) return null;

  return (
    <div
      className={`flex items-center justify-between border-b px-6 py-2 text-sm ${
        isDark
          ? "bg-green-900/30 border-green-800 text-green-300"
          : "bg-green-100 border-green-300 text-green-800"
      }`}
    >
      <span>{successMessage}</span>
      <button
        onClick={() => setSuccessMessage(undefined)}
        className={`ml-4 text-xs ${isDark ? "text-green-400 hover:text-green-200" : "text-green-600 hover:text-green-800"}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
