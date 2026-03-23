"use client";

import React from "react";
import { Copy, Loader2, Sparkles, Trash2 } from "lucide-react";
import type { WorkflowTemplate } from "@/types/workflow";
import { cn } from "@/lib/utils";
import MiniWorkflowPreview from "./MiniWorkflowPreview";

interface Props {
  template: WorkflowTemplate;
  onUse: (id: string) => void;
  onPreview?: (template: WorkflowTemplate) => void;
  onDelete?: (id: string) => void;
  isOwnedByCurrentUser?: boolean;
  isDark: boolean;
  isUsing?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  rag: "RAG",
  research: "Research",
  orchestration: "Orchestration",
  custom: "Custom",
};

export default function TemplateCard({
  template,
  onUse,
  onPreview,
  onDelete,
  isOwnedByCurrentUser,
  isDark,
  isUsing,
}: Props) {
  const nodeCount = template.graph?.nodes?.length ?? 0;
  const categoryLabel = CATEGORY_LABELS[template.category] ?? template.category;

  const handleUseClick = () => {
    if (onPreview) {
      onPreview(template);
    } else {
      onUse(template.id);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border p-4 transition-all hover:shadow-xl hover:-translate-y-0.5",
        isDark
          ? "border-gray-700 bg-gray-800/50"
          : "border-gray-200 bg-white"
      )}
    >
      {/* Hover Overlay */}
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-[2px]",
          isDark ? "bg-slate-900/60" : "bg-white/60"
        )}
      >
        <button
          onClick={handleUseClick}
          disabled={isUsing}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100",
            isDark
              ? "bg-blue-500 text-white hover:bg-blue-400"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {isUsing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Use this template &rarr;
        </button>
      </div>

      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-foreground line-clamp-1">{template.name}</h3>
        <div className="relative z-20 flex shrink-0 items-center gap-1">
          {isOwnedByCurrentUser && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template.id);
              }}
              className={cn(
                "rounded p-1 transition-colors",
                isDark
                  ? "text-red-400 hover:bg-red-950/30 hover:text-red-300"
                  : "text-red-600 hover:bg-red-50 hover:text-red-700"
              )}
              title="Delete from marketplace"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {template.is_curated && (
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
              isDark ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-800"
            )}
          >
            <Sparkles className="inline-block w-3 h-3 mr-0.5 align-middle" />
            Curated
          </span>
          )}
        </div>
      </div>
      {template.graph?.nodes && template.graph.nodes.length > 0 && (
        <div className="mb-3">
          <MiniWorkflowPreview
            nodes={template.graph.nodes}
            edges={template.graph.edges ?? []}
            isDark={isDark}
          />
        </div>
      )}
      {template.description && (
        <p
          className={cn(
            "mb-3 text-sm line-clamp-2",
            isDark ? "text-gray-400" : "text-gray-600"
          )}
        >
          {template.description}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded px-2 py-0.5 text-xs",
              isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
            )}
          >
            {categoryLabel}
          </span>
          <span
            className={cn(
              "text-xs",
              isDark ? "text-gray-500" : "text-gray-500"
            )}
          >
            {nodeCount} nodes
          </span>
        </div>
      </div>
    </div>
  );
}
