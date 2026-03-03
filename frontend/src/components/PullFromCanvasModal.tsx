"use client";

import React, { useState, useEffect } from "react";
import { GitBranch, Loader2 } from "lucide-react";
import { useWorkflowStore, useActiveCanvasId } from "@/store/useWorkflowStore";
import { useUser } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import type { Canvas } from "@/types/workflow";

interface WorkflowRow {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PullFromCanvasModal({ isOpen, onClose }: Props) {
  const activeCanvasId = useActiveCanvasId();
  const user = useUser();
  const { pullWorkflowsFromCanvas } = useWorkflowStore();

  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<Set<string>>(new Set());
  const [loadingCanvases, setLoadingCanvases] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setLoadingCanvases(true);
    supabase
      .from("canvases")
      .select("id, name, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch canvases:", error);
          setCanvases([]);
        } else {
          const list = (data ?? []).filter((c) => c.id !== activeCanvasId).map((c) => ({
            id: c.id,
            name: c.name,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
          setCanvases(list);
          if (list.length > 0 && !selectedCanvasId) {
            setSelectedCanvasId(list[0].id);
          }
        }
        setLoadingCanvases(false);
      });
  }, [isOpen, user, activeCanvasId]);

  useEffect(() => {
    if (!selectedCanvasId) {
      setWorkflows([]);
      setSelectedWorkflowIds(new Set());
      return;
    }
    setLoadingWorkflows(true);
    supabase
      .from("workflows")
      .select("id, name")
      .eq("canvas_id", selectedCanvasId)
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch workflows:", error);
          setWorkflows([]);
        } else {
          const list = (data ?? []).map((w) => ({ id: w.id, name: w.name }));
          setWorkflows(list);
          setSelectedWorkflowIds(new Set(list.map((w) => w.id)));
        }
        setLoadingWorkflows(false);
      });
  }, [selectedCanvasId, user]);

  const toggleWorkflow = (id: string) => {
    setSelectedWorkflowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedWorkflowIds(new Set(workflows.map((w) => w.id)));
  };

  const selectNone = () => {
    setSelectedWorkflowIds(new Set());
  };

  const handleImport = async () => {
    if (!selectedCanvasId || selectedWorkflowIds.size === 0) return;
    setImporting(true);
    await pullWorkflowsFromCanvas(selectedCanvasId, Array.from(selectedWorkflowIds));
    setImporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-border bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Pull from canvas</h2>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Choose canvas
            </label>
            {loadingCanvases ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading canvases...</span>
              </div>
            ) : canvases.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No other canvases. Create one from the dashboard.
              </p>
            ) : (
              <select
                value={selectedCanvasId ?? ""}
                onChange={(e) => setSelectedCanvasId(e.target.value || null)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {canvases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                Workflows to add
              </label>
              {workflows.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={selectNone}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Select none
                  </button>
                </div>
              )}
            </div>
            {loadingWorkflows ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading workflows...</span>
              </div>
            ) : workflows.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No workflows in this canvas.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-input p-2">
                {workflows.map((w) => (
                  <label
                    key={w.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkflowIds.has(w.id)}
                      onChange={() => toggleWorkflow(w.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{w.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedCanvasId || selectedWorkflowIds.size === 0 || importing}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Import {selectedWorkflowIds.size} workflow{selectedWorkflowIds.size !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
