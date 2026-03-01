// DEPRECATED — replaced by ContextToolbar.tsx (Lucidchart-style contextual toolbar)
// Kept for reference. Remove in follow-up cleanup commit after toolbar is verified working.
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { BrainCircuit, Square, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LabelPosition, BlankBoxStyle } from "@/types/workflow";
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

  // ── Context-aware agent fields ───────────────────────────
  const [taskType, setTaskType] = useState(node?.data?.taskType ?? "");
  const [expectedOutputSize, setExpectedOutputSize] = useState(node?.data?.expectedOutputSize ?? "");
  const [expectedCallsPerRun, setExpectedCallsPerRun] = useState<number | null>(
    (node?.data?.expectedCallsPerRun as number | null | undefined) ?? null
  );

  const [modalPos, setModalPos] = useState<{ top: number; left: number } | null>(null);

  // ── Dragging state ───────────────────────────────────────
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ── Dynamic registries from backend ──────────────────────
  const [providers, setProviders] = useState<ProviderDetailed[]>([]);
  const [toolCategories, setToolCategories] = useState<ToolCategoryDetailed[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);

  // ── BlankBox node state ──────────────────────────────────
  const bs = node?.data?.blankBoxStyle as Partial<BlankBoxStyle> | undefined;
  const [boxLabel, setBoxLabel] = useState(bs?.label ?? "Group");
  const [boxLabelPos, setBoxLabelPos] = useState<LabelPosition>(bs?.labelPosition ?? "top-left");
  const [boxLabelColor, setBoxLabelColor] = useState(bs?.labelColor ?? "#3b82f6");
  const [boxLabelBg, setBoxLabelBg] = useState<"none" | "pill">(bs?.labelBackground ?? "none");
  const [boxBorderStyle, setBoxBorderStyle] = useState<"dashed" | "solid" | "none">(bs?.borderStyle ?? "dashed");
  const [boxBorderColor, setBoxBorderColor] = useState(bs?.borderColor ?? "#3b82f6");
  const [boxBorderWidth, setBoxBorderWidth] = useState<1 | 2 | 3>(bs?.borderWidth ?? 2);
  const [boxBgColor, setBoxBgColor] = useState(bs?.backgroundColor ?? "#eff6ff");
  const [boxBgOpacity, setBoxBgOpacity] = useState(bs?.backgroundOpacity ?? 40);
  const [boxConnectable, setBoxConnectable] = useState(bs?.connectable ?? false);

  // ── Text node state ────────────────────────────────────
  const [textContent, setTextContent] = useState(
    (node?.data?.textNodeStyle?.content as string) ?? "Text"
  );
  const [textFontSize, setTextFontSize] = useState<"sm" | "md" | "lg" | "heading">(
    (node?.data?.textNodeStyle?.fontSize as "sm" | "md" | "lg" | "heading") ?? "md"
  );
  const [textColor, setTextColor] = useState(
    (node?.data?.textNodeStyle?.color as string) ?? "#374151"
  );
  const [textBg, setTextBg] = useState<"none" | "pill" | "badge">(
    (node?.data?.textNodeStyle?.background as "none" | "pill" | "badge") ?? "none"
  );
  const [textBgColor, setTextBgColor] = useState(
    (node?.data?.textNodeStyle?.backgroundColor as string) ?? ""
  );

  const isDark = theme === "dark";
  const isToolNode = node?.type === "toolNode";
  const isBlankBox = node?.type === "blankBoxNode";
  const isTextNode = node?.type === "textNode";

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
      const newLeft = Math.max(0, Math.min(vw - 80, ev.clientX - dragOffset.current.x));
      const newTop = Math.max(0, Math.min(vh - 80, ev.clientY - dragOffset.current.y));
      setModalPos({ top: newTop, left: newLeft });
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [modalPos]);

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
      setTaskType(node.data.taskType ?? "");
      setExpectedOutputSize(node.data.expectedOutputSize ?? "");
      setExpectedCallsPerRun((node.data.expectedCallsPerRun as number | null | undefined) ?? null);
      // BlankBox
      const bStyle = node.data.blankBoxStyle as Partial<BlankBoxStyle> | undefined;
      if (bStyle) {
        setBoxLabel(bStyle.label ?? "Group");
        setBoxLabelPos(bStyle.labelPosition ?? "top-left");
        setBoxLabelColor(bStyle.labelColor ?? "#3b82f6");
        setBoxLabelBg(bStyle.labelBackground ?? "none");
        setBoxBorderStyle(bStyle.borderStyle ?? "dashed");
        setBoxBorderColor(bStyle.borderColor ?? "#3b82f6");
        setBoxBorderWidth(bStyle.borderWidth ?? 2);
        setBoxBgColor(bStyle.backgroundColor ?? "#eff6ff");
        setBoxBgOpacity(bStyle.backgroundOpacity ?? 40);
        setBoxConnectable(bStyle.connectable ?? false);
      }
      // TextNode
      const ts = node.data.textNodeStyle;
      if (ts) {
        setTextContent((ts.content as string) ?? "Text");
        setTextFontSize((ts.fontSize as "sm" | "md" | "lg" | "heading") ?? "md");
        setTextColor((ts.color as string) ?? "#374151");
        setTextBg((ts.background as "none" | "pill" | "badge") ?? "none");
        setTextBgColor((ts.backgroundColor as string) ?? "");
      }
    }
  }, [node]);

  if (!isConfigModalOpen || !node) return null;

  const handleSave = () => {
    if (isBlankBox) {
      updateNodeData(node.id, {
        blankBoxStyle: {
          label: boxLabel,
          labelPosition: boxLabelPos,
          labelColor: boxLabelColor,
          labelBackground: boxLabelBg,
          borderStyle: boxBorderStyle,
          borderColor: boxBorderColor,
          borderWidth: boxBorderWidth,
          backgroundColor: boxBgColor,
          backgroundOpacity: boxBgOpacity,
          connectable: boxConnectable,
        },
      });
    } else if (isTextNode) {
      updateNodeData(node.id, {
        textNodeStyle: {
          content: textContent,
          fontSize: textFontSize,
          color: textColor,
          background: textBg,
          backgroundColor: textBgColor || undefined,
        },
      });
    } else if (isToolNode) {
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
        taskType: taskType || undefined,
        expectedOutputSize: expectedOutputSize || undefined,
        expectedCallsPerRun: expectedCallsPerRun,
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
        }}
        className={`rounded-lg shadow-2xl border transition-colors pointer-events-auto ${
          isDark
            ? "bg-slate-800 border-slate-600"
            : "bg-white border-gray-200"
        }`}
      >
        {/* ── Draggable header bar ─────────────────────── */}
        <div
          onMouseDown={onDragStart}
          className={`flex items-center justify-between px-5 py-3 rounded-t-lg cursor-grab active:cursor-grabbing select-none border-b ${
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
        <div className="px-5 pt-4 pb-5 max-h-[70vh] overflow-y-auto">

        {isBlankBox ? (
          /* ═══════════════ BLANK BOX NODE CONFIG ══════════ */
          <>
            {/* ── Label ────────────────────────────────────── */}
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Label
            </label>
            <input
              type="text"
              value={boxLabel}
              onChange={(e) => setBoxLabel(e.target.value)}
              placeholder="e.g. Backend"
              className={`w-full rounded border px-3 py-2 text-sm mb-3 ${
                isDark ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500" : "bg-white border-gray-300 text-gray-800"
              }`}
            />

            {/* ── Label Position (3×3 grid) ─────────────── */}
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Label Position
            </label>
            <div className="grid grid-cols-3 gap-1 w-24 mb-3">
              {(
                [
                  ["top-left", "top-center", "top-right"],
                  ["middle-left", "middle-center", "middle-right"],
                  ["bottom-left", "bottom-center", "bottom-right"],
                ] as LabelPosition[][]
              )
                .flat()
                .map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setBoxLabelPos(pos)}
                    className={cn(
                      "w-7 h-7 rounded border transition",
                      boxLabelPos === pos
                        ? "bg-blue-500 border-blue-600"
                        : isDark
                        ? "bg-slate-700 border-slate-600 hover:bg-slate-600"
                        : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                    )}
                  />
                ))}
            </div>

            {/* ── Box Style section ────────────────────────── */}
            <div className={`border-t pt-3 mt-1 mb-3 ${isDark ? "border-slate-600" : "border-gray-200"}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <Square className="inline w-3.5 h-3.5 mr-1" /> Box Style
              </p>
            </div>

            {/* Color Preset swatches */}
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Color Preset
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                { border: "#64748b", bg: "#f1f5f9" },
                { border: "#3b82f6", bg: "#eff6ff" },
                { border: "#8b5cf6", bg: "#f5f3ff" },
                { border: "#22c55e", bg: "#f0fdf4" },
                { border: "#f59e0b", bg: "#fffbeb" },
                { border: "#f43f5e", bg: "#fff1f2" },
                { border: "#f97316", bg: "#fff7ed" },
                { border: "#e5e7eb", bg: "#f9fafb" },
              ].map((preset) => (
                <button
                  key={preset.border}
                  type="button"
                  onClick={() => {
                    setBoxBorderColor(preset.border);
                    setBoxBgColor(preset.bg);
                    setBoxLabelColor(preset.border);
                  }}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition",
                    boxBorderColor === preset.border ? "ring-2 ring-offset-1 ring-blue-400" : ""
                  )}
                  style={{ backgroundColor: preset.bg, borderColor: preset.border }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="color"
                value={boxBorderColor}
                onChange={(e) => setBoxBorderColor(e.target.value)}
                className="w-7 h-7 rounded border-none cursor-pointer"
              />
              <input
                type="text"
                value={boxBorderColor}
                onChange={(e) => setBoxBorderColor(e.target.value)}
                className={`flex-1 rounded border px-2 py-1 text-xs font-mono ${
                  isDark ? "bg-slate-700 border-slate-500 text-slate-100" : "bg-white border-gray-300 text-gray-800"
                }`}
                placeholder="#hex"
              />
            </div>

            {/* Border Style */}
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Border Style
            </label>
            <div className="flex gap-1.5 mb-3">
              {(["solid", "dashed", "none"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setBoxBorderStyle(s)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded border font-medium transition capitalize",
                    boxBorderStyle === s
                      ? "bg-blue-500 text-white border-blue-600"
                      : isDark
                      ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Border Width */}
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Border Width
            </label>
            <div className="flex gap-1.5 mb-3">
              {([1, 2, 3] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setBoxBorderWidth(w)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded border font-medium transition",
                    boxBorderWidth === w
                      ? "bg-blue-500 text-white border-blue-600"
                      : isDark
                      ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  )}
                >
                  {w}px
                </button>
              ))}
            </div>

            {/* Background fill + opacity */}
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Fill Color
            </label>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="color"
                value={boxBgColor}
                onChange={(e) => setBoxBgColor(e.target.value)}
                className="w-7 h-7 rounded border-none cursor-pointer"
              />
              <input
                type="text"
                value={boxBgColor}
                onChange={(e) => setBoxBgColor(e.target.value)}
                className={`flex-1 rounded border px-2 py-1 text-xs font-mono ${
                  isDark ? "bg-slate-700 border-slate-500 text-slate-100" : "bg-white border-gray-300 text-gray-800"
                }`}
              />
            </div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Opacity: {boxBgOpacity}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={boxBgOpacity}
              onChange={(e) => setBoxBgOpacity(Number(e.target.value))}
              className="w-full mb-3 accent-blue-500"
            />

            {/* ── Label Style section ─────────────────────── */}
            <div className={`border-t pt-3 mt-1 mb-3 ${isDark ? "border-slate-600" : "border-gray-200"}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Label Style
              </p>
            </div>

            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Label Color
            </label>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="color"
                value={boxLabelColor}
                onChange={(e) => setBoxLabelColor(e.target.value)}
                className="w-7 h-7 rounded border-none cursor-pointer"
              />
              <input
                type="text"
                value={boxLabelColor}
                onChange={(e) => setBoxLabelColor(e.target.value)}
                className={`flex-1 rounded border px-2 py-1 text-xs font-mono ${
                  isDark ? "bg-slate-700 border-slate-500 text-slate-100" : "bg-white border-gray-300 text-gray-800"
                }`}
              />
            </div>

            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Label Background
            </label>
            <div className="flex gap-1.5 mb-3">
              {(["none", "pill"] as const).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBoxLabelBg(bg)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded border font-medium transition capitalize",
                    boxLabelBg === bg
                      ? "bg-blue-500 text-white border-blue-600"
                      : isDark
                      ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  )}
                >
                  {bg}
                </button>
              ))}
            </div>

            {/* ── Advanced section ─────────────────────────── */}
            <div className={`border-t pt-3 mt-1 mb-3 ${isDark ? "border-slate-600" : "border-gray-200"}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Advanced
              </p>
            </div>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={boxConnectable}
                onChange={(e) => setBoxConnectable(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                Allow edges to connect to this box
              </span>
            </label>
          </>
        ) : isTextNode ? (
          /* ═══════════════ TEXT NODE CONFIG ════════════════ */
          <>
            <p className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              <Type className="inline w-3.5 h-3.5 mr-1" /> Text Appearance
            </p>

            {/* Content */}
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Content
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={3}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 resize-none ${
                isDark ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500" : "bg-white border-gray-300 text-gray-800"
              }`}
              placeholder="Enter annotation text..."
            />

            {/* Font Size */}
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Font Size
            </label>
            <select
              value={textFontSize}
              onChange={(e) => setTextFontSize(e.target.value as "sm" | "md" | "lg" | "heading")}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 ${
                isDark ? "bg-slate-700 border-slate-500 text-slate-100" : "bg-white border-gray-300 text-gray-800"
              }`}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="heading">Heading</option>
            </select>

            {/* Text Color */}
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Text Color
            </label>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-8 rounded border-none cursor-pointer"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className={`flex-1 rounded border px-3 py-1.5 text-xs font-mono ${
                  isDark ? "bg-slate-700 border-slate-500 text-slate-100" : "bg-white border-gray-300 text-gray-800"
                }`}
              />
            </div>

            {/* Background Style */}
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Background
            </label>
            <select
              value={textBg}
              onChange={(e) => setTextBg(e.target.value as "none" | "pill" | "badge")}
              className={`w-full rounded border px-3 py-2 text-sm mb-3 ${
                isDark ? "bg-slate-700 border-slate-500 text-slate-100" : "bg-white border-gray-300 text-gray-800"
              }`}
            >
              <option value="none">None</option>
              <option value="pill">Pill (rounded)</option>
              <option value="badge">Badge (rounded corners)</option>
            </select>

            {/* Background Color (only when bg style is not none) */}
            {textBg !== "none" && (
              <>
                <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  Background Color
                </label>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="color"
                    value={textBgColor || "#f3f4f6"}
                    onChange={(e) => setTextBgColor(e.target.value)}
                    className="w-8 h-8 rounded border-none cursor-pointer"
                  />
                  <input
                    type="text"
                    value={textBgColor}
                    onChange={(e) => setTextBgColor(e.target.value)}
                    className={`flex-1 rounded border px-3 py-1.5 text-xs font-mono ${
                      isDark ? "bg-slate-700 border-slate-500 text-slate-100" : "bg-white border-gray-300 text-gray-800"
                    }`}
                  />
                </div>
              </>
            )}
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
