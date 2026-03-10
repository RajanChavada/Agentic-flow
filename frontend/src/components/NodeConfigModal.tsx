"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { BrainCircuit, Target, Loader2 } from "lucide-react";
import TagInput from "@/components/ui/TagInput";
import {
  useWorkflowStore,
  useSelectedNodeId,
  useWorkflowNodes,
  useUIState,
  useProviderData,
  useToolCategoryData,
} from "@/store/useWorkflowStore";
import type { ModelInfo, ToolInfoType } from "@/types/workflow";

const MODAL_WIDTH = 370;
const MODAL_PADDING = 16;

export default function NodeConfigModal() {
  const { isConfigModalOpen, theme } = useUIState();
  const selectedNodeId = useSelectedNodeId();
  const nodes = useWorkflowNodes();
  const { updateNodeData, closeConfigModal } = useWorkflowStore();
  const { getNodesBounds, flowToScreenPosition } = useReactFlow();
  const modalRef = useRef<HTMLDivElement>(null);

  const node = nodes.find((n) => n.id === selectedNodeId);

  // ── Agent node state ─────────────────────────────────────
  const [provider, setProvider] = useState(node?.data?.modelProvider ?? "");
  const [model, setModel] = useState(node?.data?.modelName ?? "");
  const [context, setContext] = useState(node?.data?.context ?? "");
  const [maxSteps, setMaxSteps] = useState<number | null>(
    (node?.data?.maxSteps as number | null | undefined) ?? null
  );

  // ── Tool node state ──────────────────────────────────────
  const [toolCategory, setToolCategory] = useState(node?.data?.toolCategory ?? "");
  const [toolId, setToolId] = useState(node?.data?.toolId ?? "");

  // ── Context-aware agent fields ───────────────────────────
  const [taskType, setTaskType] = useState(node?.data?.taskType ?? "");
  const [expectedOutputSize, setExpectedOutputSize] = useState(node?.data?.expectedOutputSize ?? "");
  const [expectedCallsPerRun, setExpectedCallsPerRun] = useState<number | null>(
    (node?.data?.expectedCallsPerRun as number | null | undefined) ?? null
  );
  const [allowedActions, setAllowedActions] = useState<string[]>(
    (node?.data?.allowedActions as string[] | undefined) ?? []
  );

  // ── Condition node state ─────────────────────────────────
  const [conditionExpression, setConditionExpression] = useState(
    (node?.data?.conditionExpression as string | undefined) ?? ""
  );
  const [probability, setProbability] = useState<number>(
    (node?.data?.probability as number | undefined) ?? 50
  );

  // ── Ideal state node state ─────────────────────────────
  const [idealStateDescription, setIdealStateDescription] = useState(
    (node?.data?.idealStateDescription as string | undefined) ?? ""
  );
  const [idealStateSchema, setIdealStateSchema] = useState<Record<string, unknown> | null>(
    (node?.data?.idealStateSchema as Record<string, unknown> | null | undefined) ?? null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingSchema, setIsEditingSchema] = useState(false);
  const [schemaEditText, setSchemaEditText] = useState("");
  const [schemaErrors, setSchemaErrors] = useState<string[]>([]);

  const [modalPos, setModalPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  // ── Dragging state ───────────────────────────────────────
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ── Provider/tool data from store (cached on editor mount) ──
  const providers = useProviderData() ?? [];
  const toolCategories = useToolCategoryData() ?? [];
  const isLoadingProviders = useWorkflowStore((s) => s.isLoadingProviders);
  const isLoadingTools = useWorkflowStore((s) => s.isLoadingTools);
  const registryLoading = isLoadingProviders || isLoadingTools;

  const isDark = theme === "dark";
  const isToolNode = node?.type === "toolNode";
  const isConditionNode = node?.type === "conditionNode";
  const isIdealStateNode = node?.type === "idealStateNode";

  // ── Drag-to-move handlers ────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent) => {
    // Only allow dragging from the header area (not inputs/buttons)
    e.preventDefault();
    isDragging.current = true;
    const currentTop = modalPos?.top ?? 100;
    const currentLeft = modalPos?.left ?? 100;
    dragOffset.current = { x: e.clientX - currentLeft, y: e.clientY - currentTop };

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const modalHeight = modalRef.current?.offsetHeight ?? 500;
      const newLeft = Math.max(0, Math.min(vw - 80, ev.clientX - dragOffset.current.x));
      const newTop = Math.max(0, Math.min(vh - MODAL_PADDING - modalHeight, ev.clientY - dragOffset.current.y));
      setModalPos((prev) =>
        prev ? { ...prev, top: newTop, left: newLeft } : { top: newTop, left: newLeft, maxHeight: 500 }
      );
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [modalPos]);

  // ── Derived: models for selected provider / tools for selected category ──
  const currentProvider = providers.find((p) => p.id === provider);
  const modelsForProvider: ModelInfo[] = currentProvider?.models ?? [];
  const selectedModel = modelsForProvider.find((m) => m.id === model);

  const currentToolCategory = toolCategories.find((c) => c.id === toolCategory);
  const toolsForCategory: ToolInfoType[] = currentToolCategory?.tools ?? [];
  const selectedTool = toolsForCategory.find((t) => t.id === toolId);

  // Calculate position next to the selected node (keep full modal within viewport)
  useEffect(() => {
    if (!isConfigModalOpen || !node) {
      setModalPos(null);
      return;
    }

    try {
      const bounds = getNodesBounds([node]);
      const screenPos = flowToScreenPosition({
        x: bounds.x + bounds.width + 20,
        y: bounds.y,
      });

      let left = screenPos.x;
      let top = screenPos.y;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Max modal height so it never exceeds viewport (header ~64px + padding)
      const modalMaxHeight = Math.min(640, vh - 2 * MODAL_PADDING - 80);

      if (left + MODAL_WIDTH + MODAL_PADDING > vw) {
        const leftScreenPos = flowToScreenPosition({
          x: bounds.x - MODAL_WIDTH - 20,
          y: bounds.y,
        });
        left = Math.max(MODAL_PADDING, leftScreenPos.x);
      }

      // Clamp top so modal bottom stays above viewport bottom
      const topMin = MODAL_PADDING + 60;
      const topMax = vh - MODAL_PADDING - modalMaxHeight;
      top = Math.max(topMin, Math.min(top, topMax));
      left = Math.max(MODAL_PADDING, left);

      setModalPos({ top, left, maxHeight: modalMaxHeight });
    } catch {
      const vh = window.innerHeight;
      const modalMaxHeight = Math.min(640, vh - 2 * MODAL_PADDING - 80);
      setModalPos({
        top: 100,
        left: window.innerWidth - MODAL_WIDTH - 40,
        maxHeight: modalMaxHeight,
      });
    }
  }, [isConfigModalOpen, node, getNodesBounds, flowToScreenPosition]);

  // Sync local state when selected node changes
  useEffect(() => {
    if (node) {
      setProvider(node.data.modelProvider ?? "");
      setModel(node.data.modelName ?? "");
      setContext(node.data.context ?? "");
      setMaxSteps((node.data.maxSteps as number | null | undefined) ?? null);
      setToolCategory(node.data.toolCategory ?? "");
      setToolId(node.data.toolId ?? "");
      setTaskType(node.data.taskType ?? "");
      setExpectedOutputSize(node.data.expectedOutputSize ?? "");
      setExpectedCallsPerRun((node.data.expectedCallsPerRun as number | null | undefined) ?? null);
      setAllowedActions((node.data.allowedActions as string[] | undefined) ?? []);
      setConditionExpression((node.data.conditionExpression as string | undefined) ?? "");
      setProbability((node.data.probability as number | undefined) ?? 50);
      setIdealStateDescription((node.data.idealStateDescription as string | undefined) ?? "");
      setIdealStateSchema((node.data.idealStateSchema as Record<string, unknown> | null | undefined) ?? null);
      setIsEditingSchema(false);
      setSchemaErrors([]);
    }
  }, [node]);

  // Modal only for agent and tool nodes
  if (!isConfigModalOpen || !node || (node.type !== "agentNode" && node.type !== "toolNode" && node.type !== "conditionNode" && node.type !== "idealStateNode")) {
    return null;
  }

  const handleSave = () => {
    if (isToolNode) {
      updateNodeData(node.id, {
        toolCategory,
        toolId,
        label: selectedTool?.display_name || node.data.label,
      });
    } else if (isConditionNode) {
      updateNodeData(node.id, {
        conditionExpression,
        probability,
      });
    } else if (isIdealStateNode) {
      updateNodeData(node.id, {
        idealStateDescription,
        idealStateSchema,
      });
    } else {
      updateNodeData(node.id, {
        modelProvider: provider,
        modelName: model,
        context,
        maxSteps: maxSteps,
        taskType: taskType || undefined,
        expectedOutputSize: expectedOutputSize || undefined,
        expectedCallsPerRun: expectedCallsPerRun,
        allowedActions: allowedActions.length > 0 ? allowedActions : undefined,
      });
    }
    closeConfigModal();
  };

  /** Format price like "$2.50" or "$0.075" */
  const fmtPrice = (val: number) =>
    val < 0.01 ? `$${val.toFixed(4)}` : `$${val.toFixed(2)}`;

  const fmtCtx = (w: number | null) => {
    if (!w) return "—";
    if (w >= 1_000_000) return `${(w / 1_000_000).toFixed(1)}M`;
    return `${(w / 1_000).toFixed(0)}K`;
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: modalPos?.top ?? 100,
          left: modalPos?.left ?? window.innerWidth - MODAL_WIDTH - 40,
          width: MODAL_WIDTH,
          maxHeight: modalPos?.maxHeight ?? 600,
        }}
        className={`flex flex-col rounded-lg shadow-2xl border transition-colors pointer-events-auto overflow-hidden ${
          isDark
            ? "bg-slate-800 border-slate-600"
            : "bg-white border-gray-200"
        }`}
      >
        {/* ── Draggable header bar ─────────────────────── */}
        <div
          onMouseDown={onDragStart}
          className={`shrink-0 flex items-center justify-between px-5 py-3 rounded-t-lg cursor-grab active:cursor-grabbing select-none border-b ${
            isDark
              ? "bg-slate-750 border-slate-600"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {/* Drag grip icon */}
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={isDark ? "text-slate-500" : "text-gray-400"}
            >
              <circle cx="3" cy="3" r="1.2" fill="currentColor" />
              <circle cx="9" cy="3" r="1.2" fill="currentColor" />
              <circle cx="3" cy="9" r="1.2" fill="currentColor" />
              <circle cx="9" cy="9" r="1.2" fill="currentColor" />
              <circle cx="3" cy="6" r="1.2" fill="currentColor" />
              <circle cx="9" cy="6" r="1.2" fill="currentColor" />
            </svg>
            <h2
              className={`text-sm font-bold ${
                isDark ? "text-slate-100" : "text-gray-800"
              }`}
            >
              Configure: {node.data.label}
            </h2>
          </div>
          <button
            onClick={closeConfigModal}
            className={`rounded-md p-1 transition-colors ${
              isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-400"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────── */}
        <div className="flex-1 min-h-0 px-5 pt-4 pb-5 overflow-y-auto">

        {isIdealStateNode ? (
          /* ═══════════════ IDEAL STATE NODE CONFIG ═══════════════ */
          <>
            {/* NL Success Description */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Success Description
            </label>
            <p className={`text-[10px] mb-1.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              Describe what a successful workflow output looks like
            </p>
            <textarea
              value={idealStateDescription}
              onChange={(e) =>
                e.target.value.length <= 500 && setIdealStateDescription(e.target.value)
              }
              rows={3}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 resize-none ${
                isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                  : "bg-white border-gray-300 text-gray-800 placeholder-gray-400"
              }`}
              placeholder="e.g., The workflow produces a summary with sentiment score > 0.7 and key topics extracted"
            />

            {/* Generate Schema Button */}
            <button
              onClick={async () => {
                if (!idealStateDescription.trim()) return;
                setIsGenerating(true);
                setSchemaErrors([]);
                try {
                  const res = await fetch("http://localhost:8000/api/generate-schema", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ description: idealStateDescription }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({ detail: "Schema generation failed" }));
                    setSchemaErrors([err.detail || "Schema generation failed"]);
                    return;
                  }
                  const data = await res.json();
                  setIdealStateSchema(data.schema);
                  setIsEditingSchema(false);
                } catch {
                  setSchemaErrors(["Failed to connect to backend"]);
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating || !idealStateDescription.trim()}
              className={`w-full rounded-md px-3 py-2 text-sm font-medium transition mb-3 flex items-center justify-center gap-2 ${
                isGenerating || !idealStateDescription.trim()
                  ? isDark
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  Generate Schema
                </>
              )}
            </button>

            {/* Schema errors */}
            {schemaErrors.length > 0 && (
              <div className={`rounded border p-2 mb-3 text-xs ${
                isDark ? "bg-red-900/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-600"
              }`}>
                {schemaErrors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}

            {/* Schema display / editor */}
            {idealStateSchema && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                    Schema
                  </label>
                  <button
                    onClick={() => {
                      if (!isEditingSchema) {
                        setSchemaEditText(JSON.stringify(idealStateSchema, null, 2));
                      }
                      setIsEditingSchema(!isEditingSchema);
                      setSchemaErrors([]);
                    }}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded transition ${
                      isDark
                        ? "text-teal-400 hover:bg-slate-700"
                        : "text-teal-600 hover:bg-teal-50"
                    }`}
                  >
                    {isEditingSchema ? "Cancel Edit" : "Edit Schema"}
                  </button>
                </div>

                {isEditingSchema ? (
                  <>
                    <textarea
                      value={schemaEditText}
                      onChange={(e) => setSchemaEditText(e.target.value)}
                      rows={8}
                      className={`w-full rounded border px-3 py-2 text-xs font-mono mb-2 resize-none ${
                        isDark
                          ? "bg-slate-700 border-slate-500 text-slate-100"
                          : "bg-white border-gray-300 text-gray-800"
                      }`}
                    />
                    <button
                      onClick={async () => {
                        setSchemaErrors([]);
                        try {
                          const parsed = JSON.parse(schemaEditText);
                          const res = await fetch("http://localhost:8000/api/validate-schema", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ schema: parsed }),
                          });
                          const data = await res.json();
                          if (data.valid) {
                            setIdealStateSchema(parsed);
                            setIsEditingSchema(false);
                          } else {
                            setSchemaErrors(data.errors || ["Invalid schema"]);
                          }
                        } catch {
                          setSchemaErrors(["Invalid JSON"]);
                        }
                      }}
                      className="w-full rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition"
                    >
                      Validate & Apply
                    </button>
                  </>
                ) : (
                  <pre
                    className={`rounded border p-3 text-[10px] font-mono leading-relaxed overflow-auto max-h-48 ${
                      isDark
                        ? "bg-slate-900/50 border-slate-600 text-slate-300"
                        : "bg-gray-50 border-gray-200 text-gray-700"
                    }`}
                  >
                    {JSON.stringify(idealStateSchema, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </>
        ) : isConditionNode ? (
          /* ═══════════════ CONDITION NODE CONFIG ═══════════════ */
          <>
            {/* Condition Expression */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Condition
            </label>
            <p className={`text-[10px] mb-1.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              Human-readable branch logic
            </p>
            <input
              type="text"
              value={conditionExpression}
              onChange={(e) => setConditionExpression(e.target.value)}
              placeholder="e.g., sentiment > 0.7"
              className={`w-full rounded border px-3 py-2 text-sm mb-4 ${
                isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                  : "bg-white border-gray-300 text-gray-800 placeholder-gray-400"
              }`}
            />

            {/* Probability Slider */}
            <div className="flex items-center gap-1.5 mb-2">
              <label
                className={`block text-xs font-medium ${
                  isDark ? "text-slate-400" : "text-gray-600"
                }`}
              >
                Branch Probability
              </label>
              <div className="relative group">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-3.5 h-3.5 cursor-help ${isDark ? "text-slate-500" : "text-gray-400"}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.345a.75.75 0 0 1-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 1 0 8.94 6.94ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
                <div
                  className={`
                    absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-56 px-3 py-2 rounded-lg shadow-lg
                    text-[11px] leading-relaxed pointer-events-none
                    opacity-0 group-hover:opacity-100 transition-opacity z-50
                    ${isDark ? "bg-slate-700 text-slate-200 border border-slate-600" : "bg-white text-gray-700 border border-gray-200"}
                  `}
                >
                  Sets the estimated likelihood each branch is taken during a workflow run. Used for cost and latency projections -- not runtime routing. A 70/30 split means the estimator weights the True path at 70% probability.
                </div>
              </div>
            </div>

            {/* Probability display */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                True: {probability}%
              </span>
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                False: {100 - probability}%
              </span>
            </div>

            {/* Visual probability bar */}
            <div className="relative h-8 rounded-lg border overflow-hidden mb-3 ${isDark ? 'border-slate-600' : 'border-gray-300'}">
              <div
                className="absolute inset-y-0 left-0 bg-green-500/30 dark:bg-green-600/30 transition-all"
                style={{ width: `${probability}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-red-500/30 dark:bg-red-600/30 transition-all"
                style={{ width: `${100 - probability}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-medium ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
                  {probability}% / {100 - probability}%
                </span>
              </div>
            </div>

            {/* Range slider */}
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="w-full h-2 accent-purple-500 cursor-pointer"
            />
          </>
        ) : isToolNode ? (
          /* ═══════════════ TOOL NODE CONFIG ═══════════════ */
          <>
            {/* Tool Category */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Tool Category
            </label>
            <select
              value={toolCategory}
              onChange={(e) => {
                setToolCategory(e.target.value);
                setToolId("");
              }}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 ${
                isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
              disabled={registryLoading}
            >
              <option value="">
                {registryLoading ? "Loading categories…" : "— select category —"}
              </option>
              {toolCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.tools.length} tools)
                </option>
              ))}
            </select>

            {/* Tool */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Tool
            </label>
            <select
              value={toolId}
              onChange={(e) => setToolId(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 ${
                isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
              disabled={!toolCategory}
            >
              <option value="">— select tool —</option>
              {toolsForCategory.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.display_name}
                </option>
              ))}
            </select>

            {/* Tool info card */}
            {selectedTool && (
              <div
                className={`rounded-lg border p-3 mb-4 text-xs ${
                  isDark
                    ? "bg-slate-700/50 border-slate-600"
                    : "bg-amber-50 border-amber-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    {selectedTool.display_name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      selectedTool.latency_type === "local"
                        ? isDark
                          ? "bg-green-900/50 text-green-400"
                          : "bg-green-100 text-green-700"
                        : isDark
                        ? "bg-amber-900/50 text-amber-400"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selectedTool.latency_type}
                  </span>
                </div>
                <p className={`mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  {selectedTool.description}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className={isDark ? "text-slate-400" : "text-gray-500"}>
                    Schema tokens:
                  </div>
                  <div className={`font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    ~{selectedTool.schema_tokens}
                  </div>
                  <div className={isDark ? "text-slate-400" : "text-gray-500"}>
                    Avg response:
                  </div>
                  <div className={`font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    ~{selectedTool.avg_response_tokens} tokens
                  </div>
                  <div className={isDark ? "text-slate-400" : "text-gray-500"}>
                    Exec latency:
                  </div>
                  <div className={`font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    ~{selectedTool.latency_ms} ms
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ═══════════════ AGENT NODE CONFIG ══════════════ */
          <>
            {/* Provider */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Model Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setModel("");
              }}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 ${
                isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
              disabled={registryLoading}
            >
              <option value="">
                {registryLoading ? "Loading providers…" : "— select provider —"}
              </option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.models.length} models)
                </option>
              ))}
            </select>

            {/* Model */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Model Name
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 ${
                isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
              disabled={!provider}
            >
              <option value="">— select model —</option>
              {modelsForProvider.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>

            {/* Pricing info card (shown when a model is selected) */}
            {selectedModel && (
              <div
                className={`rounded-lg border p-3 mb-4 text-xs ${
                  isDark
                    ? "bg-slate-700/50 border-slate-600"
                    : "bg-blue-50 border-blue-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    {selectedModel.display_name}
                  </span>
                  <span className={`${isDark ? "text-slate-400" : "text-gray-400"}`}>
                    {selectedModel.family}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className={isDark ? "text-slate-400" : "text-gray-500"}>
                    Input:
                  </div>
                  <div className={`font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    {fmtPrice(selectedModel.input_per_million)}/1M tokens
                  </div>
                  <div className={isDark ? "text-slate-400" : "text-gray-500"}>
                    Output:
                  </div>
                  <div className={`font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    {fmtPrice(selectedModel.output_per_million)}/1M tokens
                  </div>
                  <div className={isDark ? "text-slate-400" : "text-gray-500"}>
                    Speed:
                  </div>
                  <div className={`font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    ~{selectedModel.tokens_per_sec} tok/s
                  </div>
                  <div className={isDark ? "text-slate-400" : "text-gray-500"}>
                    Context:
                  </div>
                  <div className={`font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                    {fmtCtx(selectedModel.context_window)}
                  </div>
                </div>
              </div>
            )}

            {/* Context */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Context{" "}
              <span className={isDark ? "text-slate-500" : "text-gray-400"}>
                ({context.length}/500)
              </span>
            </label>
            <textarea
              value={context}
              onChange={(e) =>
                e.target.value.length <= 500 && setContext(e.target.value)
              }
              rows={4}
              className={`w-full rounded border px-3 py-2 text-sm mb-4 resize-none ${
                isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
              placeholder="Provide context for this agent node…"
            />

            {/* Allowed Actions */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Allowed Actions{" "}
              <span className={isDark ? "text-slate-500" : "text-gray-400"}>
                (optional)
              </span>
            </label>
            <div className="mb-4">
              <TagInput
                value={allowedActions}
                onChange={setAllowedActions}
                placeholder="Type action, press Enter..."
                maxTags={20}
              />
            </div>

            {/* Max Steps (loop control) */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Max Loop Steps{" "}
              <span className={isDark ? "text-slate-500" : "text-gray-400"}>
                (for cyclic workflows)
              </span>
            </label>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                min={1}
                max={100}
                value={maxSteps ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setMaxSteps(v === "" ? null : Math.max(1, Math.min(100, parseInt(v, 10) || 1)));
                }}
                className={`w-24 rounded border px-3 py-2 text-sm ${
                  isDark
                    ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                    : "bg-white border-gray-300 text-gray-800"
                }`}
                placeholder="10"
              />
              <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                Default: 10 · Max: 100
              </span>
            </div>

            {/* ── Context-Aware Estimation ─────────────────── */}
            <div className={`border-t pt-3 mt-1 mb-3 ${isDark ? "border-slate-600" : "border-gray-200"}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <BrainCircuit className="inline w-3.5 h-3.5 mr-1" /> Context-Aware Estimation
              </p>
            </div>

            {/* Task Type */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Task Type
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 ${
                isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
            >
              <option value="">— none (generic) —</option>
              <option value="classification">Classification</option>
              <option value="summarization">Summarization</option>
              <option value="code_generation">Code Generation</option>
              <option value="rag_answer">RAG Answering</option>
              <option value="tool_orchestration">Tool Orchestration</option>
              <option value="routing">Routing</option>
            </select>

            {/* Expected Output Size */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Expected Output Size
            </label>
            <select
              value={expectedOutputSize}
              onChange={(e) => setExpectedOutputSize(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 ${
                isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
            >
              <option value="">— auto (1.5× heuristic) —</option>
              <option value="short">Short (≤ 200 tokens)</option>
              <option value="medium">Medium (200–600 tokens)</option>
              <option value="long">Long (600–1500 tokens)</option>
              <option value="very_long">Very Long (&gt; 1500 tokens)</option>
            </select>

            {/* Expected Calls per Run */}
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-slate-400" : "text-gray-600"
              }`}
            >
              Expected Calls per Run{" "}
              <span className={isDark ? "text-slate-500" : "text-gray-400"}>
                (for orchestrators)
              </span>
            </label>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                min={1}
                max={50}
                value={expectedCallsPerRun ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setExpectedCallsPerRun(v === "" ? null : Math.max(1, Math.min(50, parseInt(v, 10) || 1)));
                }}
                className={`w-24 rounded border px-3 py-2 text-sm ${
                  isDark
                    ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                    : "bg-white border-gray-300 text-gray-800"
                }`}
                placeholder="1"
              />
              <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                Default: 1 · Max: 50
              </span>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={closeConfigModal}
            className={`rounded-md border px-4 py-1.5 text-sm transition ${
              isDark
                ? "border-slate-500 text-slate-300 hover:bg-slate-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Save
          </button>
        </div>
        </div>
        {/* end scrollable body */}
      </div>
      {/* end modal card */}
    </div>
  );
}
