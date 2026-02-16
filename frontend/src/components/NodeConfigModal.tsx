"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  useWorkflowStore,
  useSelectedNodeId,
  useWorkflowNodes,
  useUIState,
} from "@/store/useWorkflowStore";
import type { ProviderDetailed, ModelInfo, ToolCategoryDetailed, ToolInfoType } from "@/types/workflow";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

  const [modalPos, setModalPos] = useState<{ top: number; left: number } | null>(null);

  // ── Dynamic registries from backend ──────────────────────
  const [providers, setProviders] = useState<ProviderDetailed[]>([]);
  const [toolCategories, setToolCategories] = useState<ToolCategoryDetailed[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);

  const isDark = theme === "dark";
  const isToolNode = node?.type === "toolNode";

  // Fetch registries on first open
  const fetchRegistries = useCallback(async () => {
    setRegistryLoading(true);
    try {
      const [provRes, toolRes] = await Promise.all([
        providers.length > 0 ? Promise.resolve(null) : fetch(`${API_BASE}/api/providers/detailed`),
        toolCategories.length > 0 ? Promise.resolve(null) : fetch(`${API_BASE}/api/tools/categories/detailed`),
      ]);
      if (provRes?.ok) {
        setProviders(await provRes.json());
      }
      if (toolRes?.ok) {
        setToolCategories(await toolRes.json());
      }
    } catch {
      // Silently fail — user can still type manually
    } finally {
      setRegistryLoading(false);
    }
  }, [providers.length, toolCategories.length]);

  useEffect(() => {
    if (isConfigModalOpen) fetchRegistries();
  }, [isConfigModalOpen, fetchRegistries]);

  // ── Derived: models for selected provider / tools for selected category ──
  const currentProvider = providers.find((p) => p.id === provider);
  const modelsForProvider: ModelInfo[] = currentProvider?.models ?? [];
  const selectedModel = modelsForProvider.find((m) => m.id === model);

  const currentToolCategory = toolCategories.find((c) => c.id === toolCategory);
  const toolsForCategory: ToolInfoType[] = currentToolCategory?.tools ?? [];
  const selectedTool = toolsForCategory.find((t) => t.id === toolId);

  // Calculate position next to the selected node
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

      if (left + MODAL_WIDTH + MODAL_PADDING > vw) {
        const leftScreenPos = flowToScreenPosition({
          x: bounds.x - MODAL_WIDTH - 20,
          y: bounds.y,
        });
        left = Math.max(MODAL_PADDING, leftScreenPos.x);
      }

      top = Math.max(MODAL_PADDING + 60, Math.min(top, vh - 500));
      left = Math.max(MODAL_PADDING, left);

      setModalPos({ top, left });
    } catch {
      setModalPos({ top: 100, left: window.innerWidth - MODAL_WIDTH - 40 });
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
    }
  }, [node]);

  if (!isConfigModalOpen || !node) return null;

  const handleSave = () => {
    if (isToolNode) {
      updateNodeData(node.id, {
        toolCategory,
        toolId,
        label: selectedTool?.display_name || node.data.label,
      });
    } else {
      updateNodeData(node.id, {
        modelProvider: provider,
        modelName: model,
        context,
        maxSteps: maxSteps,
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
    <div className="fixed inset-0 z-50" onClick={closeConfigModal}>
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: modalPos?.top ?? 100,
          left: modalPos?.left ?? window.innerWidth - MODAL_WIDTH - 40,
          width: MODAL_WIDTH,
        }}
        className={`rounded-lg p-5 shadow-2xl border transition-colors ${
          isDark
            ? "bg-slate-800 border-slate-600"
            : "bg-white border-gray-200"
        }`}
      >
        <h2
          className={`text-base font-bold mb-4 ${
            isDark ? "text-slate-100" : "text-gray-800"
          }`}
        >
          Configure: {node.data.label}
        </h2>

        {isToolNode ? (
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
    </div>
  );
}
