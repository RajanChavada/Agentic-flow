"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useWorkflowStore,
  useSelectedNodeId,
  useWorkflowNodes,
  useWorkflowEdges,
  useUIState,
  useProviderData,
  useToolCategoryData,
} from "@/store/useWorkflowStore";
import type { ModelInfo, ToolInfoType, WorkflowToolBinding } from "@/types/workflow";
import { useIsMobile } from "@/hooks/useBreakpoint";

const MODAL_WIDTH = 370;
const MODAL_PADDING = 16;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOOL_SELECTION_LIMIT = 8;

type AgentTab = "model" | "estimation" | "tools";

type QuickEstimateResponse = {
  cost_per_call: number;
  latency_ms: number;
};

type QuickEstimateNodeData = {
  quickEstimateCostPerCall: number;
  quickEstimateLatencyMs: number;
  quickEstimateSource: "local" | "api";
  quickEstimateUpdatedAt: string;
};

const QUICK_ESTIMATE_MIDPOINTS: Record<"short" | "medium" | "long" | "very_long", number> = {
  short: 100,
  medium: 400,
  long: 1050,
  very_long: 2000,
};

function getTemperatureHelperText(temp: number) {
  if (temp <= 0.3) return "Deterministic — consistent, predictable outputs";
  if (temp <= 0.8) return "Balanced — slight variation, generally reliable";
  if (temp <= 1.4) return "Creative — more varied responses";
  return "High variance — may increase retry probability";
}

function approximateTokenCount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

function getOutputMidpoint(expectedOutputSize?: string | null) {
  if (
    expectedOutputSize === "short" ||
    expectedOutputSize === "medium" ||
    expectedOutputSize === "long" ||
    expectedOutputSize === "very_long"
  ) {
    return QUICK_ESTIMATE_MIDPOINTS[expectedOutputSize];
  }
  return QUICK_ESTIMATE_MIDPOINTS.medium;
}

function getNodeIdsInCycles(
  nodes: Array<{ id: string }>,
  edges: Array<{ source: string; target: string }>
): Set<string> {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = new Map<string, string[]>();
  nodeIds.forEach((id) => adjacency.set(id, []));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adjacency.get(edge.source)?.push(edge.target);
  }

  const indexMap = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycleIds = new Set<string>();
  let index = 0;

  const strongConnect = (v: string) => {
    indexMap.set(v, index);
    lowlink.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of adjacency.get(v) ?? []) {
      if (!indexMap.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, lowlink.get(w) ?? 0));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, indexMap.get(w) ?? 0));
      }
    }

    if (lowlink.get(v) === indexMap.get(v)) {
      const component: string[] = [];
      let w: string | undefined;
      do {
        w = stack.pop();
        if (!w) break;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);

      const hasSelfLoop = (adjacency.get(v) ?? []).includes(v);
      if (component.length > 1 || hasSelfLoop) {
        component.forEach((id) => cycleIds.add(id));
      }
    }
  };

  for (const id of nodeIds) {
    if (!indexMap.has(id)) strongConnect(id);
  }

  return cycleIds;
}

function HelpTooltip({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full transition-colors ${
            isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"
          }`}
          aria-label={text}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className={`max-w-[260px] text-[11px] leading-relaxed ${
          isDark ? "border-slate-600 bg-slate-800 text-slate-200" : "border-gray-200 bg-white text-gray-700"
        }`}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function TabButton({
  active,
  label,
  onClick,
  isDark,
  showDot,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  isDark: boolean;
  showDot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? isDark
            ? "bg-slate-700 text-slate-100 shadow-sm"
            : "bg-white text-gray-900 shadow-sm"
          : isDark
            ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
            : "text-gray-500 hover:text-gray-800 hover:bg-white/70"
      }`}
    >
      <span>{label}</span>
      {showDot && <span className="text-red-500 leading-none">●</span>}
    </button>
  );
}

function fmtPrice(val: number) {
  return val < 0.01 ? `$${val.toFixed(4)}` : `$${val.toFixed(2)}`;
}

function fmtCtx(w: number | null) {
  if (!w) return "—";
  if (w >= 1_000_000) return `${(w / 1_000_000).toFixed(1)}M`;
  return `${(w / 1_000).toFixed(0)}K`;
}

function fmtProviderUpdated(isoDate?: string) {
  if (!isoDate) return "unknown";
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function isProviderPricingStale(isoDate?: string) {
  if (!isoDate) return true;
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return true;
  const daysOld = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
  return daysOld > 30;
}

export default function NodeConfigModal() {
  const { isConfigModalOpen, theme } = useUIState();
  const selectedNodeId = useSelectedNodeId();
  const nodes = useWorkflowNodes();
  const edges = useWorkflowEdges();
  const { updateNodeData, closeConfigModal } = useWorkflowStore();
  const { getNodesBounds, flowToScreenPosition } = useReactFlow();
  const modalRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const node = nodes.find((n) => n.id === selectedNodeId);

  // ── Agent node state ─────────────────────────────────────
  const [provider, setProvider] = useState(node?.data?.modelProvider ?? "");
  const [model, setModel] = useState(node?.data?.modelName ?? "");
  const [context, setContext] = useState(node?.data?.context ?? "");
  const [maxSteps, setMaxSteps] = useState<number | null>(
    (node?.data?.maxSteps as number | null | undefined) ?? null
  );
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | null>(
    (node?.data?.maxOutputTokens as number | null | undefined) ?? null
  );
  const [temperature, setTemperature] = useState<number>(
    (node?.data?.temperature as number | undefined) ?? 1.0
  );
  const [retryBudget, setRetryBudget] = useState<number>(
    (node?.data?.retryBudget as number | undefined) ?? 1
  );
  const [activeTab, setActiveTab] = useState<AgentTab>("model");

  // ── Tool node state ──────────────────────────────────────
  const [toolCategory, setToolCategory] = useState(node?.data?.toolCategory ?? "");
  const [toolId, setToolId] = useState(node?.data?.toolId ?? "");

  // ── Context-aware agent fields ───────────────────────────
  const [taskType, setTaskType] = useState(node?.data?.taskType ?? "");
  const [expectedOutputSize, setExpectedOutputSize] = useState(node?.data?.expectedOutputSize ?? "");
  const [expectedCallsPerRun, setExpectedCallsPerRun] = useState<number | null>(
    (node?.data?.expectedCallsPerRun as number | null | undefined) ?? null
  );
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(() => {
    const nodeTools = Array.isArray(node?.data?.tools)
      ? (node?.data?.tools as WorkflowToolBinding[]).map((tool) => tool.id)
      : [];
    const legacyToolId = typeof node?.data?.toolId === "string" ? node.data.toolId : null;
    const initialTools = nodeTools.length > 0 ? nodeTools : legacyToolId ? [legacyToolId] : [];
    return initialTools.slice(0, TOOL_SELECTION_LIMIT);
  });
  const [toolSearch, setToolSearch] = useState("");

  // ── Condition node state ─────────────────────────────────
  const [conditionExpression, setConditionExpression] = useState(
    (node?.data?.conditionExpression as string | undefined) ?? ""
  );
  const [probability, setProbability] = useState<number>(
    (node?.data?.probability as number | undefined) ?? 50
  );

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
  const isAgentNode = node?.type === "agentNode";

  const currentProvider = providers.find((p) => p.id === provider);
  const modelsForProvider: ModelInfo[] = currentProvider?.models ?? [];
  const selectedModel = modelsForProvider.find((m) => m.id === model);

  const toolLookup = useMemo(() => {
    const map = new Map<string, ToolInfoType>();
    toolCategories.forEach((category) => {
      category.tools.forEach((tool) => {
        map.set(tool.id, tool);
      });
    });
    return map;
  }, [toolCategories]);

  const selectedToolDetails = useMemo(
    () => selectedToolIds.map((toolId) => toolLookup.get(toolId)).filter((tool): tool is ToolInfoType => Boolean(tool)),
    [selectedToolIds, toolLookup]
  );
  const selectedToolSchemaTokens = selectedToolDetails.reduce((sum, tool) => sum + tool.schema_tokens, 0);
  const selectedToolResponseTokens = selectedToolDetails.reduce((sum, tool) => sum + tool.avg_response_tokens, 0);
  const selectedToolLatencyMs = selectedToolDetails.reduce((sum, tool) => sum + tool.latency_ms, 0);

  const filteredToolCategories = useMemo(() => {
    const query = toolSearch.trim().toLowerCase();
    if (!query) return toolCategories;
    return toolCategories
      .map((category) => ({
        ...category,
        tools: category.tools.filter((tool) => {
          const haystack = `${category.name} ${tool.display_name} ${tool.description}`.toLowerCase();
          return haystack.includes(query);
        }),
      }))
      .filter((category) => category.tools.length > 0);
  }, [toolCategories, toolSearch]);

  const cycleNodeIds = useMemo(() => getNodeIdsInCycles(nodes, edges), [nodes, edges]);
  const isCurrentAgentInCycle = isAgentNode && node ? cycleNodeIds.has(node.id) : false;
  const isModelTabMissingRequired = isAgentNode && (!provider || !model);

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

      // Strict clamp on left to prevent off-screen cutoff
      left = Math.max(MODAL_PADDING, Math.min(left, vw - MODAL_WIDTH - MODAL_PADDING));

      setModalPos({ top, left, maxHeight: modalMaxHeight });
    } catch {
      const vh = window.innerHeight;
      const modalMaxHeight = Math.min(640, vh - 2 * MODAL_PADDING - 80);
      setModalPos({
        top: 100,
        left: Math.max(MODAL_PADDING, window.innerWidth - MODAL_WIDTH - 40),
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
      setMaxOutputTokens((node.data.maxOutputTokens as number | null | undefined) ?? null);
      setTemperature((node.data.temperature as number | undefined) ?? 1.0);
      setRetryBudget((node.data.retryBudget as number | undefined) ?? 1);
      setToolCategory(node.data.toolCategory ?? "");
      setToolId(node.data.toolId ?? "");
      setTaskType(node.data.taskType ?? "");
      setExpectedOutputSize(node.data.expectedOutputSize ?? "");
      setExpectedCallsPerRun((node.data.expectedCallsPerRun as number | null | undefined) ?? null);
      setConditionExpression((node.data.conditionExpression as string | undefined) ?? "");
      setProbability((node.data.probability as number | undefined) ?? 50);
      const nodeTools = Array.isArray(node.data.tools)
        ? (node.data.tools as WorkflowToolBinding[]).map((tool) => tool.id)
        : [];
      const legacyToolId = typeof node.data.toolId === "string" ? node.data.toolId : null;
      const initialTools = nodeTools.length > 0 ? nodeTools : legacyToolId ? [legacyToolId] : [];
      setSelectedToolIds(initialTools.slice(0, TOOL_SELECTION_LIMIT));
      setToolSearch("");
      setActiveTab("model");
    }
  }, [node]);

  // Modal only for agent and tool nodes
  if (!isConfigModalOpen || !node || (node.type !== "agentNode" && node.type !== "toolNode" && node.type !== "conditionNode")) {
    return null;
  }

  const buildQuickEstimateRequest = () => ({
    model_provider: provider,
    model_name: model,
    context,
    expected_output_size: expectedOutputSize || null,
    max_output_tokens: maxOutputTokens ?? null,
    tools: selectedToolIds,
  });

  const buildLocalQuickEstimate = () => {
    if (!selectedModel) return null;

    const systemTokens = approximateTokenCount(context);
    const outputTokens = maxOutputTokens !== null
      ? Math.min(maxOutputTokens, getOutputMidpoint(expectedOutputSize || null))
      : getOutputMidpoint(expectedOutputSize || null);
    const inputTokens = systemTokens + 500 + selectedToolSchemaTokens + selectedToolResponseTokens;
    const cost =
      (inputTokens / 1_000_000) * selectedModel.input_per_million +
      (outputTokens / 1_000_000) * selectedModel.output_per_million;
    const latencyMs = Math.round((outputTokens / Math.max(1, selectedModel.tokens_per_sec)) * 1000) + selectedToolLatencyMs;

    return {
      quickEstimateCostPerCall: Number(cost.toFixed(8)),
      quickEstimateLatencyMs: latencyMs,
      quickEstimateSource: "local",
      quickEstimateUpdatedAt: new Date().toISOString(),
    } satisfies QuickEstimateNodeData;
  };

  const buildAgentToolBindings = (): WorkflowToolBinding[] => {
    return selectedToolDetails.slice(0, TOOL_SELECTION_LIMIT).map((tool) => ({
      id: tool.id,
      displayName: tool.display_name,
      schemaTokens: tool.schema_tokens,
      avgResponseTokens: tool.avg_response_tokens,
      latencyMs: tool.latency_ms,
    }));
  };

  const handleSave = () => {
    if (isToolNode) {
      updateNodeData(node.id, {
        toolCategory,
        toolId,
        label: selectedToolDetails[0]?.display_name || node.data.label,
      });
      closeConfigModal();
      return;
    }

    if (isConditionNode) {
      updateNodeData(node.id, {
        conditionExpression,
        probability,
      });
      closeConfigModal();
      return;
    }

    updateNodeData(node.id, {
      modelProvider: provider,
      modelName: model,
      context,
      maxSteps,
      maxOutputTokens: maxOutputTokens ?? undefined,
      temperature,
      retryBudget,
      taskType: taskType || undefined,
      expectedOutputSize: expectedOutputSize || undefined,
      expectedCallsPerRun,
      tools: buildAgentToolBindings(),
    });

    const localPreview = buildLocalQuickEstimate();
    if (localPreview) {
      updateNodeData(node.id, {
        quickEstimateCostPerCall: localPreview.quickEstimateCostPerCall,
        quickEstimateLatencyMs: localPreview.quickEstimateLatencyMs,
        quickEstimateSource: localPreview.quickEstimateSource,
        quickEstimateUpdatedAt: localPreview.quickEstimateUpdatedAt,
      });
    }

    closeConfigModal();

    if (!provider || !model) return;

    const requestBody = buildQuickEstimateRequest();
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/quick-estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (!res.ok) return;
        const data = (await res.json()) as QuickEstimateResponse;
        updateNodeData(node.id, {
          quickEstimateCostPerCall: data.cost_per_call,
          quickEstimateLatencyMs: data.latency_ms,
          quickEstimateSource: "api",
          quickEstimateUpdatedAt: new Date().toISOString(),
        });
      } catch {
        // Best-effort preview only; keep the optimistic preview if the request fails.
      }
    })();
  };

  const isToolSelected = (toolIdValue: string) => selectedToolIds.includes(toolIdValue);

  const toggleToolSelection = (tool: ToolInfoType) => {
    setSelectedToolIds((prev) => {
      if (prev.includes(tool.id)) {
        return prev.filter((id) => id !== tool.id);
      }
      if (prev.length >= TOOL_SELECTION_LIMIT) {
        return prev;
      }
      return [...prev, tool.id];
    });
  };

  const headerButtonBase = `rounded-md min-h-11 min-w-11 flex items-center justify-center transition-colors ${
    isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-400"
  }`;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
          style={isMobile ? undefined : {
            position: "fixed",
            top: modalPos?.top ?? 100,
            left: modalPos?.left ?? Math.max(MODAL_PADDING, window.innerWidth - MODAL_WIDTH - 40),
            width: Math.min(MODAL_WIDTH, window.innerWidth - 2 * MODAL_PADDING),
            maxHeight: modalPos?.maxHeight ?? 600,
          }}
          className={`flex flex-col shadow-2xl border transition-colors pointer-events-auto overflow-hidden ${isMobile
            ? "fixed inset-0 rounded-none"
            : "rounded-lg"
            } ${isDark
              ? "bg-slate-800 border-slate-600"
              : "bg-white border-gray-200"
            }`}
        >
          {/* ── Draggable header bar ─────────────────────── */}
          <div
            onMouseDown={(e) => {
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
                const newLeft = Math.max(MODAL_PADDING, Math.min(vw - MODAL_WIDTH - MODAL_PADDING, ev.clientX - dragOffset.current.x));
                const newTop = Math.max(MODAL_PADDING, Math.min(vh - MODAL_PADDING - modalHeight, ev.clientY - dragOffset.current.y));
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
            }}
            className={`shrink-0 flex items-center justify-between px-5 py-3 rounded-t-lg cursor-grab active:cursor-grabbing select-none border-b ${isDark ? "bg-slate-750 border-slate-600" : "bg-gray-50 border-gray-200"
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
                className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-gray-800"
                  }`}
              >
                Configure: {node.data.label}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeConfigModal}
              className={headerButtonBase}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {/* ── Scrollable body ──────────────────────────── */}
            <div className="flex-1 min-h-0 px-5 pt-4 pb-4 overflow-y-auto">
              {isConditionNode ? (
                /* ═══════════════ CONDITION NODE CONFIG ═══════════════ */
                <>
                  {/* Condition Expression */}
                  <label
                    className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"
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
                    className={`w-full rounded border px-3 py-2 text-sm mb-4 ${isDark
                      ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                      : "bg-white border-gray-300 text-gray-800 placeholder-gray-400"
                      }`}
                  />

                  {/* Probability Slider */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <label
                      className={`block text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"
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
                  <div className={`relative h-8 rounded-lg border overflow-hidden mb-3 ${isDark ? "border-slate-600" : "border-gray-300"}`}>
                    <div
                      className="absolute inset-y-0 left-0 bg-green-500/30 dark:bg-green-600/30 transition-all"
                      style={{ width: `${probability}%` }}
                    />
                    <div
                      className="absolute inset-y-0 right-0 bg-red-500/30 dark:bg-red-600/30 transition-all"
                      style={{ width: `${100 - probability}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-medium ${isDark ? "text-slate-100" : "text-gray-800"}`}>
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
                    className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"
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
                    className={`w-full rounded border px-3 py-2 text-sm mb-3 ${isDark
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
                    className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"
                      }`}
                  >
                    Tool
                  </label>
                  <select
                    value={toolId}
                    onChange={(e) => setToolId(e.target.value)}
                    className={`w-full rounded border px-3 py-2 text-sm mb-3 ${isDark
                      ? "bg-slate-700 border-slate-500 text-slate-100"
                      : "bg-white border-gray-300 text-gray-800"
                      }`}
                    disabled={!toolCategory}
                  >
                    <option value="">— select tool —</option>
                    {toolCategories.find((c) => c.id === toolCategory)?.tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.display_name}
                      </option>
                    ))}
                  </select>

                  {/* Tool info card */}
                  {toolCategories.find((c) => c.id === toolCategory)?.tools.find((t) => t.id === toolId) && (
                    <div
                      className={`rounded-lg border p-3 mb-4 text-xs ${isDark
                        ? "bg-slate-700/50 border-slate-600"
                        : "bg-amber-50 border-amber-100"
                        }`}
                    >
                      {(() => {
                        const selectedTool = toolCategories.find((c) => c.id === toolCategory)?.tools.find((t) => t.id === toolId);
                        if (!selectedTool) return null;
                        return (
                          <>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`font-semibold ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                                {selectedTool.display_name}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${selectedTool.latency_type === "local"
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
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                /* ═══════════════ AGENT NODE CONFIG ══════════════ */
                <TooltipProvider delayDuration={100}>
                  <div className="space-y-4">
                    <div
                      className={`grid grid-cols-3 rounded-lg border p-1 ${isDark ? "border-slate-600 bg-slate-700/60" : "border-gray-200 bg-gray-100"}`}
                    >
                      <TabButton
                        active={activeTab === "model"}
                        label="Model"
                        isDark={isDark}
                        showDot={isModelTabMissingRequired}
                        onClick={() => setActiveTab("model")}
                      />
                      <TabButton
                        active={activeTab === "estimation"}
                        label="Estimation"
                        isDark={isDark}
                        onClick={() => setActiveTab("estimation")}
                      />
                      <TabButton
                        active={activeTab === "tools"}
                        label="Tools"
                        isDark={isDark}
                        onClick={() => setActiveTab("tools")}
                      />
                    </div>

                    {activeTab === "model" && (
                      <div className="space-y-3">
                        {/* Provider */}
                        <div>
                          <label
                            className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"
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
                            className={`w-full rounded border px-3 py-2 text-sm ${isDark
                              ? "bg-slate-700 border-slate-500 text-slate-100"
                              : "bg-white border-gray-300 text-gray-800"
                              }`}
                            disabled={registryLoading}
                          >
                            <option value="">
                              {registryLoading ? "Loading providers…" : "— select provider —"}
                            </option>
                            {providers.map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                title={isProviderPricingStale(p.last_updated) ? "Pricing data may be outdated" : undefined}
                              >
                                {`${isProviderPricingStale(p.last_updated) ? "⚠ " : ""}${p.name} (${p.models.length} models · updated ${fmtProviderUpdated(p.last_updated)})`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Model */}
                        <div>
                          <label
                            className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"
                              }`}
                          >
                            Model Name
                          </label>
                          <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className={`w-full rounded border px-3 py-2 text-sm ${isDark
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
                        </div>

                        {/* Pricing info card (shown when a model is selected) */}
                        {selectedModel && (
                          <div
                            className={`rounded-lg border p-3 text-xs ${isDark
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
                        <div>
                          <label
                            className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"
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
                            className={`w-full rounded border px-3 py-2 text-sm resize-none ${isDark
                              ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                              : "bg-white border-gray-300 text-gray-800"
                              }`}
                            placeholder="Provide context for this agent node…"
                          />
                        </div>

                        {isCurrentAgentInCycle && (
                          <div>
                            <label
                              className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"
                                }`}
                            >
                              Max Loop Steps{" "}
                              <span className={isDark ? "text-slate-500" : "text-gray-400"}>
                                (for cyclic workflows)
                              </span>
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={maxSteps ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setMaxSteps(v === "" ? null : Math.max(1, Math.min(100, parseInt(v, 10) || 1)));
                                }}
                                className={`w-24 rounded border px-3 py-2 text-sm ${isDark
                                  ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                                  : "bg-white border-gray-300 text-gray-800"
                                  }`}
                                placeholder="10"
                              />
                              <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                Default: 10 · Max: 100
                              </span>
                            </div>
                          </div>
                        )}

                        <div>
                          <label
                            className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"
                              }`}
                          >
                            Max Output Tokens
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={maxOutputTokens ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setMaxOutputTokens(v === "" ? null : Math.max(1, parseInt(v, 10) || 1));
                            }}
                            className={`w-full rounded border px-3 py-2 text-sm ${isDark
                              ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                              : "bg-white border-gray-300 text-gray-800"
                              }`}
                            placeholder="Unset"
                          />
                          <p className={`mt-1 text-[11px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            Hard ceiling on output length. Overrides Expected Output Size when set.
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <label className={`block text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              Temperature
                            </label>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={2}
                            step={0.1}
                            value={temperature}
                            onChange={(e) => setTemperature(Number(e.target.value))}
                            className="w-full h-2 accent-blue-500 cursor-pointer"
                          />
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className={isDark ? "text-slate-500" : "text-gray-400"}>0.0</span>
                            <span className={`font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                              {temperature.toFixed(1)} · {getTemperatureHelperText(temperature)}
                            </span>
                            <span className={isDark ? "text-slate-500" : "text-gray-400"}>2.0</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "estimation" && (
                      <div className="space-y-3">
                        <div className={`border-t pt-3 ${isDark ? "border-slate-600" : "border-gray-200"}`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            ESTIMATION INPUTS
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <label className={`block text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              Task Type
                            </label>
                            <HelpTooltip
                              isDark={isDark}
                              text="Classifies the node's job so the estimator can choose a smarter output profile."
                            />
                          </div>
                          <select
                            value={taskType}
                            onChange={(e) => setTaskType(e.target.value)}
                            className={`w-full rounded border px-3 py-2 text-sm ${isDark
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
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <label className={`block text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              Expected Output Size
                            </label>
                            <HelpTooltip
                              isDark={isDark}
                              text="Hints how large the node's output will be so the estimator can choose a representative token count."
                            />
                          </div>
                          <select
                            value={expectedOutputSize}
                            onChange={(e) => setExpectedOutputSize(e.target.value)}
                            className={`w-full rounded border px-3 py-2 text-sm ${isDark
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
                          {maxOutputTokens !== null && (
                            <p className={`mt-1 text-[11px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                              Max Output Tokens is set — used as fallback only.
                            </p>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <label className={`block text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              Expected Calls per Run
                            </label>
                            <HelpTooltip
                              isDark={isDark}
                              text="How many LLM calls this agent makes in one workflow execution."
                            />
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={expectedCallsPerRun ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setExpectedCallsPerRun(v === "" ? null : Math.max(1, Math.min(50, parseInt(v, 10) || 1)));
                            }}
                            className={`w-full rounded border px-3 py-2 text-sm ${isDark
                              ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                              : "bg-white border-gray-300 text-gray-800"
                              }`}
                            placeholder="1"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <label className={`block text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              Retry Budget
                            </label>
                            <HelpTooltip
                              isDark={isDark}
                              text="Max retries before this node fails. Multiplies worst-case cost."
                            />
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={retryBudget}
                            onChange={(e) => {
                              const v = e.target.value;
                              setRetryBudget(v === "" ? 1 : Math.max(1, Math.min(5, parseInt(v, 10) || 1)));
                            }}
                            className={`w-full rounded border px-3 py-2 text-sm ${isDark
                              ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                              : "bg-white border-gray-300 text-gray-800"
                              }`}
                            placeholder="1"
                          />
                          <p className={`mt-1 text-[11px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            Max retries before this node fails. Multiplies worst-case cost.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === "tools" && (
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            value={toolSearch}
                            onChange={(e) => setToolSearch(e.target.value)}
                            placeholder="Search tools..."
                            className={`w-full rounded border px-3 py-2 text-sm ${isDark
                              ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                              : "bg-white border-gray-300 text-gray-800 placeholder-gray-400"
                              }`}
                          />
                        </div>

                        <div className={`rounded-lg border px-3 py-2 text-xs ${isDark ? "border-slate-600 bg-slate-700/50 text-slate-300" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span>{selectedToolIds.length} tools selected</span>
                            <span>Max {TOOL_SELECTION_LIMIT}</span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            <p>Adds ~{selectedToolSchemaTokens} schema tokens to input</p>
                            <p>Adds ~{selectedToolResponseTokens} avg response tokens to input</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {filteredToolCategories.length === 0 ? (
                            <div className={`rounded-lg border px-3 py-4 text-center text-xs ${isDark ? "border-slate-600 text-slate-400" : "border-gray-200 text-gray-500"}`}>
                              {registryLoading ? "Loading tools…" : "No tools match your search."}
                            </div>
                          ) : (
                            filteredToolCategories.map((category) => (
                              <div
                                key={category.id}
                                className={`rounded-lg border ${isDark ? "border-slate-700 bg-slate-800/40" : "border-gray-200 bg-white"}`}
                              >
                                <div className={`border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${isDark ? "border-slate-700 text-slate-400" : "border-gray-100 text-gray-500"}`}>
                                  {category.name}
                                </div>
                                <div className="divide-y divide-inherit">
                                  {category.tools.map((tool) => {
                                    const selected = isToolSelected(tool.id);
                                    const disabled = !selected && selectedToolIds.length >= TOOL_SELECTION_LIMIT;
                                    return (
                                      <label
                                        key={tool.id}
                                        className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 text-left ${disabled ? "opacity-60" : ""}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selected}
                                          onChange={() => toggleToolSelection(tool)}
                                          disabled={disabled}
                                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-gray-800"}`}>
                                              {tool.display_name}
                                            </span>
                                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-500"}`}>
                                              {tool.latency_type}
                                            </span>
                                          </div>
                                          <p className={`mt-0.5 line-clamp-2 text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                            {tool.description}
                                          </p>
                                          <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                            <span>~{tool.schema_tokens} schema</span>
                                            <span>~{tool.avg_response_tokens} avg resp</span>
                                            <span>~{tool.latency_ms} ms</span>
                                          </div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipProvider>
              )}
            </div>

            {/* ── Sticky footer actions ─────────────────────── */}
            <div className={`shrink-0 flex justify-end gap-2 border-t px-5 py-3 ${isDark ? "border-slate-600 bg-slate-800/95" : "border-gray-200 bg-white/95"}`}>
              <button
                type="button"
                onClick={closeConfigModal}
                className={`rounded-md border px-4 py-1.5 text-sm transition ${isDark
                  ? "border-slate-500 text-slate-300 hover:bg-slate-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
