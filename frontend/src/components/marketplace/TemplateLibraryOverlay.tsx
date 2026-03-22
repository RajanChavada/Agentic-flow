"use client";

import React, { useState } from "react";
import { X, LayoutTemplate } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkflowStore, useUIState } from "@/store/useWorkflowStore";
import { useUser } from "@/store/useAuthStore";
import TemplateGrid from "./TemplateGrid";

export default function TemplateLibraryOverlay() {
  const { isTemplateLibraryOpen, theme } = useUIState();
  const closeTemplateLibrary = useWorkflowStore((s) => s.closeTemplateLibrary);
  const loadTemplateOntoCanvas = useWorkflowStore((s) => s.loadTemplateOntoCanvas);
  const user = useUser();
  const isDark = theme === "dark";

  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isTemplateLibraryOpen) return null;

  const handleUseTemplate = async (id: string) => {
    setLoadingId(id);
    try {
      await loadTemplateOntoCanvas(id);
      closeTemplateLibrary();
    } catch (err) {
      console.error("Failed to load template:", err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md overflow-hidden">
        {/* Header */}
        <header className={`shrink-0 flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-slate-800" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <LayoutTemplate className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            <h2 className="text-xl font-bold">Template Library</h2>
          </div>
          <button
            onClick={closeTemplateLibrary}
            className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <p className="text-muted-foreground">
              Select a template to instantly load it onto your canvas. This will replace your current workflow.
            </p>
          </div>
          <TemplateGrid
            onUseTemplate={handleUseTemplate}
            loadingId={loadingId}
            currentUserId={user?.id ?? null}
          />
        </div>
      </div>
    </AnimatePresence>
  );
}
