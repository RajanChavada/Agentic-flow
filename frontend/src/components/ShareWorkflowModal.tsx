"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Copy, Mail, Loader2, Check } from "lucide-react";
import { useUIState } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";
import {
  createShare,
  type ShareType,
  type WorkflowSnapshot,
  type CanvasShareSnapshot,
} from "@/lib/shareWorkflows";
import { supabase } from "@/lib/supabase";
import type { Node } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";

interface ShareWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareType: ShareType;
  workflowId?: string;
  canvasId?: string;
  workflowName?: string;
  canvasName?: string;
  nodes?: Node<WorkflowNodeData>[];
  edges?: { id?: string; source: string; target: string; data?: Record<string, unknown> }[];
  userId: string;
}

export default function ShareWorkflowModal({
  isOpen,
  onClose,
  shareType,
  workflowId,
  canvasId,
  workflowName,
  canvasName,
  nodes,
  edges,
  userId,
}: ShareWorkflowModalProps) {
  const { theme } = useUIState();
  const isDark = theme === "dark";
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createShareRecord = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      if (shareType === "workflow") {
        if (!nodes || !edges) {
          setError("No workflow data to share.");
          setLoading(false);
          return;
        }
        const snapshot: WorkflowSnapshot = {
          nodes,
          edges,
          name: workflowName ?? "Untitled Workflow",
          recursionLimit: 25,
        };
        const result = await createShare(userId, "workflow", snapshot, {
          workflowId,
          canvasId,
        });
        if (result) {
          setShareUrl(result.shareUrl);
        } else {
          setError("Failed to create share link.");
        }
      } else {
        if (!canvasId) {
          setError("No canvas selected.");
          setLoading(false);
          return;
        }
        let canvasNameToUse = canvasName ?? "Shared Canvas";
        if (!canvasName) {
          const { data: c } = await supabase
            .from("canvases")
            .select("name")
            .eq("id", canvasId)
            .eq("user_id", userId)
            .single();
          canvasNameToUse = c?.name ?? "Shared Canvas";
        }
        const { data: workflows, error: fetchErr } = await supabase
          .from("workflows")
          .select("id, name, graph")
          .eq("canvas_id", canvasId)
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (fetchErr || !workflows?.length) {
          setError("No workflows found in this canvas.");
          setLoading(false);
          return;
        }

        const workflowSnapshots: WorkflowSnapshot[] = workflows.map((row) => {
          const g = row.graph as { nodes?: unknown[]; edges?: { id?: string; source: string; target: string }[]; recursionLimit?: number };
          const rawNodes: Record<string, unknown>[] = Array.isArray(g?.nodes) ? (g.nodes as Record<string, unknown>[]) : [];
          const rawEdges = (g?.edges ?? []) as { id?: string; source: string; target: string }[];
          const rfNodes: Node<WorkflowNodeData>[] = rawNodes.map((n, i) => ({
            id: String(n.id ?? `n-${i}`),
            type: (n.type as string) ?? "agentNode",
            position: { x: 200 + (i % 3) * 280, y: 100 + Math.floor(i / 3) * 180 },
            data: {
              label: String(n.label ?? n.type ?? "Node"),
              type: (n.type as WorkflowNodeData["type"]) ?? "agentNode",
              modelProvider: n.model_provider as string | undefined,
              modelName: n.model_name as string | undefined,
              context: n.context as string | undefined,
              toolId: n.tool_id as string | undefined,
              toolCategory: n.tool_category as string | undefined,
              maxSteps: n.max_steps as number | null | undefined,
              taskType: n.task_type as string | undefined,
              expectedOutputSize: n.expected_output_size as string | undefined,
              expectedCallsPerRun: n.expected_calls_per_run as number | null | undefined,
            },
          }));
          const rfEdges = rawEdges.map((e) => ({
            id: e.id ?? `${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
          }));
          return {
            nodes: rfNodes,
            edges: rfEdges,
            name: row.name ?? "Untitled",
            recursionLimit: g?.recursionLimit ?? 25,
          };
        });

        const snapshot: CanvasShareSnapshot = {
          workflows: workflowSnapshots,
          canvasName: canvasNameToUse,
        };

        const result = await createShare(userId, "canvas", snapshot, {
          canvasId,
        });
        if (result) {
          setShareUrl(result.shareUrl);
        } else {
          setError("Failed to create share link.");
        }
      }
    } catch (err) {
      console.error("Share creation failed:", err);
      setError("Failed to create share link.");
    } finally {
      setLoading(false);
    }
  }, [userId, shareType, workflowId, canvasId, workflowName, canvasName, nodes, edges]);

  useEffect(() => {
    if (isOpen && shareUrl === null && !loading && !error) {
      createShareRecord();
    }
  }, [isOpen, shareUrl, loading, error, createShareRecord]);

  // Reset when modal closes (including loading so reopen can retry)
  useEffect(() => {
    if (!isOpen) {
      setShareUrl(null);
      setError(null);
      setCopied(false);
      setLoading(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard.");
    }
  };

  const handleEmail = () => {
    if (!shareUrl) return;
    const subject = encodeURIComponent(
      shareType === "workflow"
        ? `Workflow: ${workflowName ?? "Untitled"}`
        : `Canvas: ${canvasName ?? "Untitled"}`
    );
    const body = encodeURIComponent(
      `I'm sharing a ${shareType === "workflow" ? "workflow" : "canvas"} with you:\n\n${shareUrl}\n\nOpen the link to view it and copy it to your own canvas.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-lg border p-6 shadow-xl",
          isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Share {shareType === "workflow" ? "workflow" : "canvas"}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "rounded p-1 transition-colors",
              isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Creating share link...</span>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {shareUrl && !loading && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm break-all">
              {shareUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
                  isDark
                    ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy link
                  </>
                )}
              </button>
              <button
                onClick={handleEmail}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
                  isDark
                    ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                )}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
            </div>
          </div>
        )}

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
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
