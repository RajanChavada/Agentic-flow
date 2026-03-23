"use client";

import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { useUser } from "@/store/useAuthStore";
import { useWorkflowStore, useUIState } from "@/store/useWorkflowStore";
import { publishTemplate } from "@/lib/marketplacePersistence";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "rag", label: "RAG" },
  { id: "research", label: "Research" },
  { id: "orchestration", label: "Orchestration" },
  { id: "custom", label: "Custom" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPublished?: () => void;
}

export default function PublishModal({ isOpen, onClose, onPublished }: Props) {
  const user = useUser();
  const { theme } = useUIState();
  const currentWorkflowId = useWorkflowStore((s) => s.currentWorkflowId);
  const currentWorkflowName = useWorkflowStore((s) => s.currentWorkflowName);
  const isDark = theme === "dark";

  const [name, setName] = useState(currentWorkflowName || "Untitled Workflow");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentWorkflowName || "Untitled Workflow");
      setDescription("");
      setCategory("custom");
      setError(null);
      setStatus("idle");
    }
  }, [isOpen, currentWorkflowName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentWorkflowId) {
      setError("You must be signed in and have a saved workflow to publish.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const id = await publishTemplate(user.id, currentWorkflowId, name, description, category);
      if (id) {
        setStatus("success");
        onPublished?.();
        // auto-close after 2s
        setTimeout(() => {
          onClose();
          setStatus("idle");
        }, 2000);
      } else {
        setStatus("error");
        setError("Failed to publish. Please try again.");
      }
    } catch (e) {
      setStatus("error");
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={cn(
          "w-full max-w-md rounded-lg border p-6 shadow-xl",
          isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Publish to Marketplace</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm",
                isDark
                  ? "border-gray-600 bg-gray-800 text-foreground"
                  : "border-gray-300 bg-white text-foreground"
              )}
              placeholder="My workflow"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm",
                isDark
                  ? "border-gray-600 bg-gray-800 text-foreground"
                  : "border-gray-300 bg-white text-foreground"
              )}
              placeholder="What does this workflow do?"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm",
                isDark
                  ? "border-gray-600 bg-gray-800 text-foreground"
                  : "border-gray-300 bg-white text-foreground"
              )}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            {status === "success" ? (
              <div className="flex items-center gap-2 text-green-600 font-medium py-2">
                <Check className="w-4 h-4" /> Published successfully!
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium",
                    isDark ? "text-gray-300 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {status === "loading" ? "Publishing…" : "Publish"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
