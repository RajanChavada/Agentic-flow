"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, ArrowUp, LayoutGrid, Loader2 } from "lucide-react";
import { listTemplates } from "@/lib/marketplacePersistence";
import { openTutorial } from "@/hooks/useTutorial";
import {
  useWorkflowStore,
  useUIState,
} from "@/store/useWorkflowStore";
import type { WorkflowTemplate, WorkflowNodeData } from "@/types/workflow";
import type { Node, Edge } from "@xyflow/react";
import { v4 as uuid } from "uuid";
import OverlayTemplateCard from "./OverlayTemplateCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TUTORIAL_KEY = "neurovn-tutorial-completed";

const PLACEHOLDER_PROMPTS = [
  "Build a RAG pipeline for document Q&A...",
  "Create a research agent with web search...",
  "Design a classification workflow...",
  "Set up a multi-agent orchestration system...",
];

export default function BlankCanvasOverlay() {
  const router = useRouter();
  const { theme } = useUIState();
  const isDark = theme === "dark";
  const dismissBlankOverlay = useWorkflowStore((s) => s.dismissBlankOverlay);
  const loadTemplateOntoCanvas = useWorkflowStore((s) => s.loadTemplateOntoCanvas);

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  // Scaffold state
  const [promptText, setPromptText] = useState("");
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [scaffoldError, setScaffoldError] = useState<string | null>(null);

  // Fetch curated templates on mount
  useEffect(() => {
    let cancelled = false;
    listTemplates().then(({ templates: all }) => {
      if (cancelled) return;
      const curated = all.filter((t) => t.is_curated).slice(0, 8);
      setTemplates(curated.length > 0 ? curated : all.slice(0, 8));
    });
    return () => { cancelled = true; };
  }, []);

  // Typing effect for placeholder text (only when input is empty)
  useEffect(() => {
    if (promptText) return;
    const target = PLACEHOLDER_PROMPTS[placeholderIdx];
    let charIdx = 0;
    setDisplayedText("");

    const typeTimer = setInterval(() => {
      charIdx++;
      setDisplayedText(target.slice(0, charIdx));
      if (charIdx >= target.length) {
        clearInterval(typeTimer);
      }
    }, 35);

    const cycleTimer = setTimeout(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDER_PROMPTS.length);
    }, target.length * 35 + 2500);

    return () => {
      clearInterval(typeTimer);
      clearTimeout(cycleTimer);
    };
  }, [placeholderIdx, promptText]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      dismissBlankOverlay();
      const tutorialDone = localStorage.getItem(TUTORIAL_KEY) === "true";
      if (!tutorialDone) {
        setTimeout(() => openTutorial(), 300);
      }
    }, 250);
  }, [dismissBlankOverlay]);

  const handleTemplateSelect = useCallback(
    async (id: string) => {
      setIsExiting(true);
      setTimeout(async () => {
        await loadTemplateOntoCanvas(id);
        dismissBlankOverlay();
      }, 200);
    },
    [loadTemplateOntoCanvas, dismissBlankOverlay]
  );

  const handleBrowseAll = useCallback(() => {
    router.push("/marketplace");
  }, [router]);

  // Scaffold: call POST /api/scaffold and load result onto canvas
  const handleScaffold = useCallback(async () => {
    if (!promptText.trim() || isScaffolding) return;
    setIsScaffolding(true);
    setScaffoldError(null);

    try {
      const res = await fetch(`${API_BASE}/api/scaffold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText.trim() }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }
      const data = await res.json();

      // Map scaffold response to React Flow nodes/edges (same pattern as loadTemplateOntoCanvas)
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
            allowedActions: n.allowed_actions ?? undefined,
            outputSchema: (n.output_schema as Record<string, unknown> | null | undefined) ?? null,
            inputSchema: (n.input_schema as Record<string, unknown> | null | undefined) ?? null,
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
        currentWorkflowId: null,
        currentWorkflowName: data.name || "Generated Workflow",
        isDirty: true,
        ui: {
          ...store.ui,
          successMessage: "Workflow generated! Refine or start customizing.",
          needsLayout: true,
          hasSeenBlankOverlay: true,
          isRefineBarOpen: true,
        },
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("neurovn-blank-overlay-dismissed", "true");
      }

      setTimeout(() => {
        useWorkflowStore.setState((s) => ({
          ui: { ...s.ui, successMessage: undefined },
        }));
      }, 3000);
    } catch (err) {
      setScaffoldError(
        err instanceof Error ? err.message : "Failed to generate workflow"
      );
      setTimeout(() => setScaffoldError(null), 5000);
    } finally {
      setIsScaffolding(false);
    }
  }, [promptText, isScaffolding]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleScaffold();
      }
    },
    [handleScaffold]
  );

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
        >
          {/* Backdrop gradient */}
          <div
            className={`absolute inset-0 ${
              isDark
                ? "bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900/60"
                : "bg-gradient-to-b from-gray-50/60 via-gray-100/80 to-gray-50/60"
            }`}
          />

          {/* Content card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`relative z-10 w-full max-w-2xl mx-4 rounded-xl border shadow-xl ${
              isDark
                ? "border-slate-700 bg-slate-900/95"
                : "border-gray-200 bg-white/95"
            } backdrop-blur-sm`}
          >
            <div className="p-6 sm:p-8">
              {/* Welcome heading */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="text-center mb-6"
              >
                <h2
                  className={`text-xl sm:text-2xl font-bold mb-2 ${
                    isDark ? "text-slate-100" : "text-gray-900"
                  }`}
                >
                  Design your AI workflow
                </h2>
                <p
                  className={`text-sm ${
                    isDark ? "text-slate-400" : "text-gray-500"
                  }`}
                >
                  Describe what you want to build, or start with a template
                </p>
              </motion.div>

              {/* NL Prompt field (enabled with scaffold) */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.3 }}
                className="relative mb-6"
              >
                <div className="relative">
                  <Sparkles
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      isDark ? "text-blue-400" : "text-blue-500"
                    }`}
                  />
                  <input
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isScaffolding}
                    className={`w-full pl-10 pr-12 py-3 rounded-lg border text-sm transition outline-none ${
                      isDark
                        ? "border-slate-600 bg-slate-800/80 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                        : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                    } ${isScaffolding ? "opacity-60 cursor-not-allowed" : ""}`}
                    placeholder=" "
                  />
                  {/* Typing effect placeholder (only when input is empty) */}
                  {!promptText && (
                    <span
                      className={`absolute left-10 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none ${
                        isDark ? "text-slate-500" : "text-gray-400"
                      }`}
                    >
                      {displayedText}
                      <span className="animate-pulse">|</span>
                    </span>
                  )}
                  {/* Submit button */}
                  <button
                    onClick={handleScaffold}
                    disabled={!promptText.trim() || isScaffolding}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition ${
                      promptText.trim() && !isScaffolding
                        ? isDark
                          ? "bg-blue-600 text-white hover:bg-blue-500"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                        : isDark
                          ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isScaffolding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Loading text */}
                {isScaffolding && (
                  <p
                    className={`mt-2 text-xs ${
                      isDark ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    Generating workflow...
                  </p>
                )}

                {/* Error message */}
                {scaffoldError && (
                  <p
                    className={`mt-2 text-xs ${
                      isDark ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    {scaffoldError}
                  </p>
                )}
              </motion.div>

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.24, duration: 0.3 }}
                className="flex items-center gap-3 mb-5"
              >
                <div
                  className={`flex-1 h-px ${
                    isDark ? "bg-slate-700" : "bg-gray-200"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    isDark ? "text-slate-500" : "text-gray-400"
                  }`}
                >
                  or start with a template
                </span>
                <div
                  className={`flex-1 h-px ${
                    isDark ? "bg-slate-700" : "bg-gray-200"
                  }`}
                />
              </motion.div>

              {/* Template grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {templates.map((t, i) => (
                  <OverlayTemplateCard
                    key={t.id}
                    template={t}
                    isDark={isDark}
                    onSelect={handleTemplateSelect}
                    index={i}
                  />
                ))}
              </div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex items-center justify-between"
              >
                <button
                  onClick={handleBrowseAll}
                  className={`flex items-center gap-1.5 text-sm font-medium transition ${
                    isDark
                      ? "text-slate-400 hover:text-blue-400"
                      : "text-gray-500 hover:text-blue-600"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Browse all templates
                </button>
                <button
                  onClick={handleDismiss}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isDark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  }`}
                >
                  Start from scratch
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
