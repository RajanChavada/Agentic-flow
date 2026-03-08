"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowUp, X, Loader2 } from "lucide-react";
import { useWorkflowStore, useUIState } from "@/store/useWorkflowStore";
import { nodesToPayload, edgesToPayload } from "@/store/utils";
import type { WorkflowNodeData } from "@/types/workflow";
import type { Node, Edge } from "@xyflow/react";
import { v4 as uuid } from "uuid";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ScaffoldRefineBar() {
  const { theme } = useUIState();
  const isDark = theme === "dark";
  const setRefineBarOpen = useWorkflowStore((s) => s.setRefineBarOpen);

  const [refineText, setRefineText] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  const handleRefine = useCallback(async () => {
    if (!refineText.trim() || isRefining) return;
    setIsRefining(true);
    setRefineError(null);

    try {
      const state = useWorkflowStore.getState();
      const nodesPayload = nodesToPayload(state.nodes);
      const edgesPayload = edgesToPayload(state.edges);

      const res = await fetch(`${API_BASE}/api/scaffold/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: refineText.trim(),
          nodes: nodesPayload,
          edges: edgesPayload,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }
      const data = await res.json();

      // Map refined response to React Flow nodes/edges
      const rfNodes: Node<WorkflowNodeData>[] = (data.nodes || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (n: any, i: number) => ({
          id: n.id || `node-${uuid()}`,
          type: n.type,
          position: { x: 200 + (i % 3) * 280, y: 100 + Math.floor(i / 3) * 180 },
          data: {
            label: n.label ?? n.type,
            type: n.type,
            modelProvider: n.model_provider,
            modelName: n.model_name,
            context: n.context,
            toolId: n.tool_id,
            toolCategory: n.tool_category,
            maxSteps: n.max_steps,
            taskType: n.task_type ?? undefined,
            expectedOutputSize: n.expected_output_size ?? undefined,
            expectedCallsPerRun: n.expected_calls_per_run ?? undefined,
          },
        })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rfEdges: Edge[] = (data.edges || []).map((e: any) => ({
        id: e.id ?? `e-${uuid()}`,
        source: e.source,
        target: e.target,
      }));

      const store = useWorkflowStore.getState();
      useWorkflowStore.setState({
        nodes: rfNodes,
        edges: rfEdges,
        estimation: null,
        currentWorkflowName: data.name || store.currentWorkflowName,
        isDirty: true,
        ui: {
          ...store.ui,
          successMessage: "Workflow refined!",
          needsLayout: true,
        },
      });

      setRefineText("");

      setTimeout(() => {
        useWorkflowStore.setState((s) => ({
          ui: { ...s.ui, successMessage: undefined },
        }));
      }, 3000);
    } catch (err) {
      setRefineError(
        err instanceof Error ? err.message : "Failed to refine workflow"
      );
      setTimeout(() => setRefineError(null), 5000);
    } finally {
      setIsRefining(false);
    }
  }, [refineText, isRefining]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleRefine();
      }
    },
    [handleRefine]
  );

  const handleClose = useCallback(() => {
    setRefineBarOpen(false);
  }, [setRefineBarOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex items-center gap-2 px-4 py-2 border-b shrink-0 ${
        isDark
          ? "bg-slate-800/80 border-slate-700"
          : "bg-blue-50/80 border-blue-100"
      }`}
    >
      <Sparkles
        className={`w-4 h-4 shrink-0 ${
          isDark ? "text-blue-400" : "text-blue-500"
        }`}
      />
      <input
        value={refineText}
        onChange={(e) => setRefineText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isRefining}
        placeholder="Refine: 'Add error handling' or 'Use Claude instead of GPT'"
        className={`flex-1 bg-transparent text-sm outline-none placeholder:text-sm ${
          isDark
            ? "text-slate-100 placeholder:text-slate-500"
            : "text-gray-900 placeholder:text-gray-400"
        } ${isRefining ? "opacity-60 cursor-not-allowed" : ""}`}
      />

      {/* Error indicator */}
      {refineError && (
        <span
          className={`text-xs shrink-0 ${
            isDark ? "text-red-400" : "text-red-600"
          }`}
        >
          {refineError}
        </span>
      )}

      {/* Submit button */}
      {isRefining ? (
        <Loader2
          className={`w-4 h-4 animate-spin shrink-0 ${
            isDark ? "text-blue-400" : "text-blue-500"
          }`}
        />
      ) : (
        <button
          onClick={handleRefine}
          disabled={!refineText.trim()}
          className={`rounded-md p-1 transition shrink-0 ${
            refineText.trim()
              ? isDark
                ? "text-blue-400 hover:bg-slate-700"
                : "text-blue-600 hover:bg-blue-100"
              : isDark
                ? "text-slate-600 cursor-not-allowed"
                : "text-gray-300 cursor-not-allowed"
          }`}
          title="Refine workflow"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className={`rounded-md p-1 transition shrink-0 ${
          isDark
            ? "text-slate-500 hover:text-slate-300 hover:bg-slate-700"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        }`}
        title="Close refine bar"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
