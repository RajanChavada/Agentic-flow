"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { useUIState, useWorkflowStore } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";
import { useRemainingSlots, GATE_CONFIGS } from "@/hooks/useGate";
import UpgradeModal from "@/components/UpgradeModal";
import type { GateTrigger } from "@/hooks/useGate";

export default function NameWorkflowModal() {
  const router = useRouter();
  const { theme } = useUIState();
  const isDark = theme === "dark";

  const show = useWorkflowStore((s) => s.showNameWorkflowModal);
  const setShow = useWorkflowStore((s) => s.setShowNameWorkflowModal);
  const currentWorkflowName = useWorkflowStore((s) => s.currentWorkflowName);
  const createCanvasAndSaveWorkflow = useWorkflowStore((s) => s.createCanvasAndSaveWorkflow);
  const nodes = useWorkflowStore((s) => s.nodes);
  const setErrorBanner = useWorkflowStore((s) => s.setErrorBanner);
  const activeCanvasId = useWorkflowStore((s) => s.activeCanvasId);

  // Get canvas count to check limits (approximate: count distinct canvasId among scenarios)
  const scenarios = useWorkflowStore((s) => s.scenarios);
  const canvasIds = Object.values(scenarios).map(s => s.canvasId).filter(Boolean);
  const uniqueCanvasCount = new Set(canvasIds).size + (activeCanvasId ? 1 : 0);
  const remainingSlots = useRemainingSlots(uniqueCanvasCount);
  const isAtLimit = remainingSlots === 0;

  const [name, setName] = useState(currentWorkflowName || "Untitled Workflow");
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (show) {
      setName(currentWorkflowName || "Untitled Workflow");
    }
  }, [show, currentWorkflowName]);

  if (!show) return null;

  const handleClose = () => {
    if (!loading) setShow(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // Check canvas limit before saving
    if (isAtLimit) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    setErrorBanner(undefined);

    try {
      const canvasId = await createCanvasAndSaveWorkflow(trimmed);
      setShow(false);
      if (canvasId) {
        router.push(`/editor/${canvasId}`);
      } else {
        setErrorBanner("Failed to save. Please try again.");
      }
    } catch {
      setErrorBanner("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
        onClick={handleClose}
      >
        <div
          className={cn(
            "w-full max-w-sm rounded-lg border p-6 shadow-xl",
            isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Name your workflow</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className={cn(
                "rounded p-1 transition-colors disabled:opacity-50",
                isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            A new canvas will be created and your workflow will be saved. You can keep editing.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <label className="flex flex-col gap-1">
              <span className={cn("text-xs font-medium", isDark ? "text-slate-300" : "text-gray-600")}>
                Workflow name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My workflow"
                disabled={loading}
                autoFocus
                className={cn(
                  "rounded-md border px-3 py-2 text-sm outline-none transition disabled:opacity-50",
                  isDark
                    ? "border-gray-600 bg-gray-800 text-foreground focus:border-blue-500"
                    : "border-gray-300 bg-white text-foreground focus:border-blue-500"
                )}
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-50",
                  isDark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                    : "border-gray-300 text-gray-600 hover:bg-gray-100"
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || nodes.length === 0}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save & continue"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Upgrade modal for canvas limit */}
      {showUpgrade && (
        <UpgradeModal
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          trigger="canvas_limit"
        />
      )}
    </>
  );
}
