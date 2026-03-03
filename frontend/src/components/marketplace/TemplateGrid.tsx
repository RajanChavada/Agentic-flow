"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { listTemplates, deleteTemplate, type TemplateCategory } from "@/lib/marketplacePersistence";
import type { WorkflowTemplate } from "@/types/workflow";
import TemplateCard from "./TemplateCard";
import TemplatePreviewModal from "./TemplatePreviewModal";
import { useUIState } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "", label: "All" },
  { id: "rag", label: "RAG" },
  { id: "research", label: "Research" },
  { id: "orchestration", label: "Orchestration" },
  { id: "custom", label: "Custom" },
];

interface Props {
  onUseTemplate: (id: string) => void;
  loadingId?: string | null;
  currentUserId: string | null;
}

export default function TemplateGrid({ onUseTemplate, loadingId, currentUserId }: Props) {
  const { theme } = useUIState();
  const isDark = theme === "dark";
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<TemplateCategory>("");
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    listTemplates(category).then(({ templates: data, error }) => {
      setTemplates(data);
      setLoadError(error);
      setLoading(false);
    });
  }, [category]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleUseFromModal = (id: string) => {
    onUseTemplate(id);
    setPreviewTemplate(null);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!currentUserId) return;
    const ok = await deleteTemplate(id, currentUserId);
    if (ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setPreviewTemplate((prev) => (prev?.id === id ? null : prev));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id || "all"}
            onClick={() => setCategory(c.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              category === c.id
                ? isDark
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary text-primary-foreground"
                : isDark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loadError ? (
        <div
          className={cn(
            "py-12 px-4 text-center rounded-lg border",
            isDark ? "bg-red-950/30 border-red-800 text-red-200" : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          <p className="font-medium">Unable to load templates</p>
          <p className="mt-1 text-sm opacity-90">{loadError}</p>
          <p className="mt-2 text-xs opacity-75">
            Ensure Supabase is configured and run migration 003_workflow_templates.sql if needed.
          </p>
        </div>
      ) : templates.length === 0 ? (
        <p className={cn("py-12 text-center", isDark ? "text-gray-400" : "text-gray-600")}>
          No templates found. Publish your first workflow to the marketplace.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onUse={onUseTemplate}
              onPreview={(template) => setPreviewTemplate(template)}
              onDelete={currentUserId && t.user_id === currentUserId ? handleDeleteTemplate : undefined}
              isOwnedByCurrentUser={currentUserId !== null && t.user_id === currentUserId}
              isDark={isDark}
              isUsing={loadingId === t.id}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {previewTemplate && (
          <TemplatePreviewModal
            key={previewTemplate.id}
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onUseTemplate={handleUseFromModal}
            onDeleteTemplate={
              currentUserId && previewTemplate.user_id === currentUserId
                ? handleDeleteTemplate
                : undefined
            }
            isOwnedByCurrentUser={
              currentUserId !== null && previewTemplate.user_id === currentUserId
            }
            isDark={isDark}
            isUsing={loadingId === previewTemplate.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
