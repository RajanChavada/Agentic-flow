"use client";

import React from "react";
import { X, LayoutGrid, GitBranch, FolderKanban } from "lucide-react";
import { useUIState } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CanvasesInfoModal({ isOpen, onClose }: Props) {
  const { theme } = useUIState();
  const isDark = theme === "dark";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-lg border p-6 shadow-xl max-h-[90vh] overflow-y-auto",
          isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            What are canvases?
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "rounded p-1 transition-colors",
              isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Canvases</strong> are containers for organizing your agentic workflows. Think of them like folders or projects—each canvas holds multiple workflows that belong together.
          </p>

          <div className="space-y-2">
            <p className="font-medium text-foreground">Why use canvases?</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Group workflows by project, feature, or use case</li>
              <li>Keep related designs in one place (e.g. &quot;RAG Pipeline&quot;, &quot;Customer Support Bot&quot;)</li>
              <li>Compare cost and latency across different workflow versions</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <FolderKanban className="h-4 w-4" />
              Getting started
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Create a new canvas (give it a name like &quot;My RAG Experiment&quot;)</li>
              <li>You&apos;ll open the editor—drag Start, Agent, and Tool nodes onto the canvas</li>
              <li>Connect nodes and configure models to build your workflow</li>
              <li>Save workflows to this canvas; they&apos;ll appear here when you return</li>
            </ol>
          </div>

          <p className="text-xs border-t pt-3 flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 shrink-0" />
            Each workflow is a graph of nodes. Canvases help you organize and compare them.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition",
              isDark
                ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            )}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
