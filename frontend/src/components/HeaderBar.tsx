"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Sun,
  MoonStar,
  Save,
  SaveAll,
  FilePlus,
  Download,
  LayoutDashboard,
  Check,
  Loader2,
  LayoutTemplate,
  UploadCloud,
  GitBranch,
  LayoutGrid,
  Home,
  Share2,
  HelpCircle,
  PanelLeft,
  MoreHorizontal,

} from "lucide-react";
import {
  useWorkflowStore,
  useWorkflowNodes,
  useWorkflowEdges,
  useUIState,
  useCurrentWorkflowId,
  useCurrentWorkflowName,
  useIsDirty,
  useActiveCanvasId,
} from "@/store/useWorkflowStore";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import NavProfile from "@/components/NavProfile";
import type {
  NodeConfigPayload,
  EdgeConfigPayload,
  WorkflowEstimation,
  EstimateRequestPayload,
} from "@/types/workflow";
import ImportWorkflowModal from "./ImportWorkflowModal";
import PullFromCanvasModal from "./PullFromCanvasModal";
import ConfirmModal from "./ConfirmModal";
import ExportDropdown from "./ExportDropdown";
import MoreDropdown, { type MoreDropdownItem } from "./MoreDropdown";
import PublishModal from "./marketplace/PublishModal";
import ShareWorkflowModal from "./ShareWorkflowModal";
import { useAutoLayout } from "@/hooks/useAutoLayout";
import { openTutorial } from "@/hooks/useTutorial";
import { useGate } from "@/hooks/useGate";
import { supabase } from "@/lib/supabase";
import { recordEstimateRun } from "@/lib/profileInsights";
import { toPng } from "html-to-image";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function HeaderBar() {
  const nodes = useWorkflowNodes();
  const edges = useWorkflowEdges();
  const { theme } = useUIState();
  const { setEstimation, setErrorBanner, toggleTheme } = useWorkflowStore();
  const [loading, setLoading] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPullOpen, setIsPullOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [disconnectedForEstimate, setDisconnectedForEstimate] = useState<
    Array<{ id: string; label: string; type: string }>
  >([]);
  const activeCanvasId = useActiveCanvasId();
  const isDark = theme === "dark";
  const autoLayout = useAutoLayout();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Paywall gates
  const { isGated: shareGated } = useGate("share_links");
  const { isGated: marketplaceGated } = useGate("marketplace_publish");


  // Auth
  const user = useUser();
  const { openAuthModal } = useAuthStore();

  // Current workflow tracking
  const currentWorkflowId = useCurrentWorkflowId();
  const currentWorkflowName = useCurrentWorkflowName();
  const isDirty = useIsDirty();
  const isSaving = useWorkflowStore((s) => s.isSaving);
  const lastSavedAt = useWorkflowStore((s) => s.lastSavedAt);
  const openTemplateLibrary = useWorkflowStore((s) => s.openTemplateLibrary);

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(currentWorkflowName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingName) setNameValue(currentWorkflowName);
  }, [currentWorkflowName, editingName]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  const commitName = useCallback(() => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== currentWorkflowName) {
      useWorkflowStore.getState().setCurrentWorkflowName(trimmed);
    }
  }, [nameValue, currentWorkflowName]);

  // "Saved ✓" flash (auto-dismiss after 1.5s)
  const [showSaved, setShowSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lastSavedAt && !isSaving) {
      setShowSaved(true);
      setSaveError(null);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 1500);
    }
  }, [lastSavedAt, isSaving]);

  // Thumbnail generation mechanism
  const thumbnailCaptureRequested = useWorkflowStore((s) => s.thumbnailCaptureRequested);
  const clearThumbnailCaptureRequest = useWorkflowStore((s) => s.clearThumbnailCaptureRequest);

  useEffect(() => {
    if (!thumbnailCaptureRequested || !user) return;
    
    // Asynchronous capture so it doesn't block the UI
    const captureAndUpload = async () => {
      try {
        const flowEl = document.querySelector<HTMLElement>(".react-flow");
        if (!flowEl) return;
        
        // Wait briefly for UI to settle
        await new Promise(r => setTimeout(r, 600));
        
        const dataUrl = await toPng(flowEl, {
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          width: 800,
          height: 600,
          style: { transform: "scale(1)" },
          filter: (node) => {
            if (node.classList?.contains("react-flow__minimap") ||
                node.classList?.contains("react-flow__controls")) {
              return false;
            }
            return true;
          }
        });
        
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const fileName = `${user.id}/${thumbnailCaptureRequested}-${Date.now()}.png`;
        
        const { error: uploadErr } = await supabase.storage
          .from("thumbnails")
          .upload(fileName, blob, { upsert: true, contentType: "image/png" });
          
        if (uploadErr) {
          console.error("Thumbnail upload error:", uploadErr);
          return;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from("thumbnails")
          .getPublicUrl(fileName);
          
        const { error: updateErr } = await supabase
          .from("canvases")
          .update({ thumbnail_url: publicUrl })
          .eq("id", thumbnailCaptureRequested)
          .eq("user_id", user.id);
          
        if (updateErr) console.error("Canvas thumbnail update error:", updateErr);
      } catch (err) {
        console.error("Failed to capture thumbnail:", err);
      } finally {
        clearThumbnailCaptureRequest();
      }
    };
    
    captureAndUpload();
  }, [thumbnailCaptureRequested, user, isDark, clearThumbnailCaptureRequest]);

  // ── Save (PATCH existing or POST new) ──────────────────────
  const handleSave = async () => {
    if (!user) {
      openAuthModal({
        reason: "Sign in to save your workflow.",
        onSuccess: () => useWorkflowStore.getState().setShowNameWorkflowModal(true),
        postAuthAction: "save",
      });
      return;
    }
    // On guest (no canvas), prompt for name and create new canvas
    if (!activeCanvasId && nodes.length > 0) {
      useWorkflowStore.getState().setShowNameWorkflowModal(true);
      return;
    }
    doSave();
  };

  const doSave = async () => {
    setSaveError(null);
    const name = useWorkflowStore.getState().currentWorkflowName;
    const result = await useWorkflowStore.getState().saveWorkflowToSupabase(name);
    if (!result) {
      setSaveError("Save failed. Please try again.");
    }
  };

  // ── Save As (always POST new) ──────────────────────────────
  const handleSaveAs = async () => {
    if (!user) {
      openAuthModal({
        reason: "Sign in to save your workflow.",
        onSuccess: () => doSaveAs(),
      });
      return;
    }
    doSaveAs();
  };

  const doSaveAs = async () => {
    setSaveError(null);
    const store = useWorkflowStore.getState();
    const name = prompt("New workflow name:", `${store.currentWorkflowName} (copy)`);
    if (!name) return;
    const prevId = store.currentWorkflowId;
    if (prevId) store.clearCurrentWorkflow();
    useWorkflowStore.setState({
      nodes: store.nodes,
      edges: store.edges,
      estimation: store.estimation,
      currentWorkflowName: name,
    });
    const result = await useWorkflowStore.getState().saveWorkflowToSupabase(name);
    if (!result) {
      setSaveError("Save As failed. Please try again.");
    }
  };


  // ── New Workflow ───────────────────────────────────────────
  const handleNew = () => {
    if (nodes.length > 0) {
      setIsNewConfirmOpen(true);
      return;
    }
    useWorkflowStore.getState().clearCurrentWorkflow();
  };

  const handleNewConfirm = () => {
    useWorkflowStore.getState().clearCurrentWorkflow();
  };

  const handleImport = () => {
    if (!user) {
      openAuthModal({
        reason: "Sign in to import workflows.",
        onSuccess: () => setIsImportOpen(true),
      });
      return;
    }
    setIsImportOpen(true);
  };

  const formatNodeType = (type: string) =>
    type
      .replace(/Node$/, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (s) => s.toUpperCase());

  const runEstimateForGraph = async (
    estimateNodes: typeof nodes,
    estimateEdges: typeof edges
  ) => {
    if (estimateNodes.length === 0) return;

    const estimateNodeIds = new Set(estimateNodes.map((n) => n.id));
    const boundedEdges = estimateEdges.filter(
      (e) => estimateNodeIds.has(e.source) && estimateNodeIds.has(e.target)
    );

    setErrorBanner(undefined);
    setLoading(true);

    const payload: EstimateRequestPayload = {
      nodes: estimateNodes.map<NodeConfigPayload>((n) => ({
        id: n.id,
        type: n.data.type,
        label: n.data.label,
        model_provider: n.data.modelProvider,
        model_name: n.data.modelName,
        context: n.data.context,
        tool_id: n.data.toolId,
        tool_category: n.data.toolCategory,
        max_steps: n.data.maxSteps ?? null,
        retry_budget: n.data.retryBudget ?? null,
        task_type: n.data.taskType ?? null,
        expected_output_size: n.data.expectedOutputSize ?? null,
        expected_calls_per_run: n.data.expectedCallsPerRun ?? null,
        condition_expression: n.data.conditionExpression ?? null,
        probability: n.data.probability ?? null,
      })),
      edges: boundedEdges.map<EdgeConfigPayload>((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        source_handle: e.sourceHandle ?? null,
      })),
      recursion_limit: 25,
      runs_per_day: useWorkflowStore.getState().scalingParams.runsPerDay,
      loop_intensity:
        useWorkflowStore.getState().scalingParams.loopIntensity !== 1.0
          ? useWorkflowStore.getState().scalingParams.loopIntensity
          : null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const data: WorkflowEstimation = await res.json();
      setEstimation(data);
      if (user) {
        await recordEstimateRun({
          userId: user.id,
          canvasId: activeCanvasId,
          nodeCount: estimateNodes.length,
          totalCost: data.total_cost,
        });
      }
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Failed to fetch estimation"
      );
    } finally {
      setLoading(false);
    }
  };

  const getDisconnectedNodes = () => {
    return nodes
      .filter((n) => n.type !== "startNode" && n.type !== "finishNode")
      .filter((n) => !edges.some((e) => e.source === n.id || e.target === n.id))
      .map((n) => ({
        id: n.id,
        label: n.data.label ?? n.type ?? "Node",
        type: formatNodeType(n.type ?? n.data.type ?? "node"),
      }));
  };

  const handleEstimate = async () => {
    if (!user) {
      openAuthModal({
        reason: "Sign in to run workflows and generate cost estimates.",
      });
      return;
    }

    const hasStart = nodes.some((n) => n.type === "startNode");
    const hasFinish = nodes.some((n) => n.type === "finishNode");
    if (!hasStart || !hasFinish) {
      setErrorBanner("Workflow must have at least one Start and one Finish node.");
      return;
    }

    const disconnected = getDisconnectedNodes();
    if (disconnected.length > 0) {
      setDisconnectedForEstimate(disconnected);
      return;
    }

    await runEstimateForGraph(nodes, edges);
  };

  const handleProceedWithDisconnected = async () => {
    const disconnectedIds = new Set(disconnectedForEstimate.map((n) => n.id));
    const filteredNodes = nodes.filter((n) => !disconnectedIds.has(n.id));
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    setDisconnectedForEstimate([]);
    await runEstimateForGraph(filteredNodes, filteredEdges);
  };

  const desktopMoreItems: MoreDropdownItem[] = [
    { section: "File operations" },
    { label: "Import workflow", icon: Download, onClick: handleImport },
    { label: "Export", component: <ExportDropdown isDark={isDark} variant="menuItem" /> },
    ...(activeCanvasId && user
      ? [{ label: "Pull from canvas", icon: GitBranch, onClick: () => setIsPullOpen(true) }]
      : []),
    { section: "Canvas management" },
    ...(currentWorkflowId
      ? [{ label: "Save As", icon: SaveAll, onClick: handleSaveAs, disabled: nodes.length === 0 || isSaving }]
      : []),
    ...(currentWorkflowId && user && !marketplaceGated
      ? [{ label: "Publish to marketplace", icon: UploadCloud, onClick: () => setIsPublishOpen(true), disabled: nodes.length === 0 }]
      : []),
    { section: "Preferences" },
    { label: isDark ? "Light mode" : "Dark mode", icon: isDark ? Sun : MoonStar, onClick: toggleTheme },
    { label: "Help & Tutorial", icon: HelpCircle, onClick: openTutorial },
  ];

  return (
    <header
      className={`flex items-center justify-between gap-4 border-b px-3 sm:px-6 h-14 shrink-0 transition-colors ${isDark
        ? "border-slate-700 bg-slate-900"
        : "border-gray-200 bg-white"
        }`}
    >
      {/* ── Left side: brand + workflow name + status ── */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <Link
          href="/canvases"
          className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 -ml-1 transition ${isDark
            ? "text-slate-100 hover:bg-slate-800 hover:text-white"
            : "text-gray-800 hover:bg-gray-100 hover:text-gray-900"
            }`}
          title="Back to My Canvases"
        >
          <Home className="h-4 w-4 shrink-0" />
          <span className="text-lg font-bold tracking-tight">Neurovn</span>
        </Link>

        {activeCanvasId && (
          <span className="hidden sm:contents">
            <span className={`text-sm ${isDark ? "text-slate-600" : "text-gray-300"}`}>/</span>
            <Link
              href="/canvases"
              className={`inline-flex items-center gap-1 text-sm font-medium transition hover:underline ${isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-800"
                }`}
              title="Back to My Canvases"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> My Canvases
            </Link>
          </span>
        )}

        <span className={`text-sm ${isDark ? "text-slate-600" : "text-gray-300"}`}>/</span>

        {/* Inline editable workflow name */}
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") setEditingName(false);
            }}
            className={`text-sm font-medium px-1.5 py-0.5 rounded border outline-none w-24 sm:w-48 transition-shadow ${isDark
              ? "bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              : "bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              }`}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className={`text-sm font-medium px-1.5 py-0.5 rounded hover:bg-opacity-50 transition truncate max-w-24 sm:max-w-48 ${isDark
              ? "text-slate-300 hover:bg-slate-800"
              : "text-gray-600 hover:bg-gray-100"
              }`}
            title="Click to rename workflow"
          >
            {currentWorkflowName}
          </button>
        )}

        {/* Dirty indicator */}
        {isDirty && (
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
        )}

        {/* Save status — fixed-size container prevents layout shift */}
        <span className="hidden sm:inline-flex items-center w-20 shrink-0">
          {isSaving && (
            <span
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${isDark ? "bg-amber-900/30 text-amber-400" : "bg-amber-50 text-amber-600"
                }`}
            >
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          {showSaved && !isSaving && (
            <span
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-50 text-green-700"
                }`}
            >
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {saveError && !isSaving && (
            <span className="text-[10px] text-red-500 whitespace-nowrap truncate">{saveError}</span>
          )}
        </span>
      </div>

      {/* ── Right side: action buttons ── */}
      <div className="flex items-center justify-end gap-1 sm:gap-1.5 min-w-0 flex-1">
        {/* Sidebar toggle (mobile only) */}
        <button
          onClick={() => useWorkflowStore.getState().toggleSidebar()}
          className={`lg:hidden rounded-md border p-1.5 transition shrink-0 ${isDark
            ? "border-slate-600 text-slate-300 hover:bg-slate-700"
            : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          title="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* ── Center: Pill group ── */}
        <div className="hidden md:flex items-center">
          <div
            className={`flex items-center rounded-full border overflow-hidden shadow-sm ${
              isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"
            }`}
          >
            <button
              onClick={openTemplateLibrary}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${
                isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Templates</span>
            </button>
            <span className={`w-px h-4 ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
            <button
              onClick={handleNew}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${
                isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">New</span>
            </button>
            <span className={`w-px h-4 ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
            <button
              onClick={() => autoLayout()}
              disabled={nodes.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
                isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Layout</span>
            </button>
          </div>
        </div>

        {/* ── Desktop core actions ── */}
        <div className="ml-auto hidden md:flex items-center gap-1.5">
          <MoreDropdown isDark={isDark} items={desktopMoreItems} />

          <button
            onClick={handleSave}
            disabled={nodes.length === 0 || isSaving}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 inline-flex items-center gap-1.5 shrink-0 ${
              isDark
                ? "border-emerald-700 text-emerald-300 hover:bg-emerald-800/40"
                : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSaving ? "Saving…" : "Save"}</span>
          </button>

          {activeCanvasId && user && !shareGated && (
            <button
              onClick={() => setIsShareOpen(true)}
              disabled={nodes.length === 0}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 inline-flex items-center gap-1.5 shrink-0 ${
                isDark
                  ? "border-sky-700 text-sky-300 hover:bg-sky-800/40"
                  : "border-sky-300 text-sky-700 hover:bg-sky-50"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          <button
            onClick={handleEstimate}
            disabled={loading}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 shrink-0"
          >
            {loading ? "Running…" : (
              <>
                <span className="hidden xl:inline">Run Workflow & Gen Estimate</span>
                <span className="hidden lg:inline xl:hidden">Run Estimate</span>
                <span className="lg:hidden">Run</span>
              </>
            )}
          </button>

          <div className={`pl-2 border-l ${isDark ? "border-slate-700" : "border-gray-200"}`}>
            <NavProfile />
          </div>
        </div>

        {/* ── Mobile overflow menu (below md) ── */}
        <div className="md:hidden relative ml-auto" ref={overflowRef}>
          <button
            onClick={() => setOverflowOpen((v) => !v)}
            className={`rounded-md border p-1.5 transition ${isDark
              ? "border-slate-600 text-slate-300 hover:bg-slate-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            title="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {overflowOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOverflowOpen(false)} aria-hidden />
              <div
                className={`absolute right-0 top-full mt-1 z-50 min-w-52 rounded-md border py-1 shadow-lg ${isDark ? "border-slate-600 bg-slate-900" : "border-gray-200 bg-white"
                  }`}
              >
                <button
                  onClick={() => { openTutorial(); setOverflowOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  <HelpCircle className="w-4 h-4 shrink-0" /> Help & Tutorial
                </button>
                <button
                  onClick={() => { toggleTheme(); setOverflowOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <MoonStar className="w-4 h-4 shrink-0" />}
                  {isDark ? "Light mode" : "Dark mode"}
                </button>
                <div className={`my-1 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`} />
                <a
                  href="/marketplace"
                  onClick={() => setOverflowOpen(false)}
                  className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  <LayoutTemplate className="w-4 h-4 shrink-0" /> Templates
                </a>
                <button
                  onClick={() => { handleNew(); setOverflowOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  <FilePlus className="w-4 h-4 shrink-0" /> New workflow
                </button>
                <button
                  onClick={() => { handleImport(); setOverflowOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  <Download className="w-4 h-4 shrink-0" /> Import
                </button>
                {activeCanvasId && user && (
                  <button
                    onClick={() => { setIsPullOpen(true); setOverflowOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                  >
                    <GitBranch className="w-4 h-4 shrink-0" /> Pull from canvas
                  </button>
                )}
                <button
                  onClick={() => { autoLayout(); setOverflowOpen(false); }}
                  disabled={nodes.length === 0}
                  className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition disabled:opacity-40 ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" /> Auto-layout
                </button>
                <div className={`my-1 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`} />
                {currentWorkflowId && user && !marketplaceGated && (
                  <button
                    onClick={() => { setIsPublishOpen(true); setOverflowOpen(false); }}
                    disabled={nodes.length === 0}
                    className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition disabled:opacity-40 disabled:pointer-events-none ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                  >
                    <UploadCloud className="w-4 h-4 shrink-0" /> Publish
                  </button>
                )}
                {activeCanvasId && user && (
                  <>
                    <button
                      onClick={() => { setIsShareOpen(true); setOverflowOpen(false); }}
                      disabled={nodes.length === 0}
                      className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition disabled:opacity-40 disabled:pointer-events-none ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                    >
                      <Share2 className="w-4 h-4 shrink-0" /> Share
                    </button>
                  </>
                )}
                {currentWorkflowId && (
                  <button
                    onClick={() => { handleSaveAs(); setOverflowOpen(false); }}
                    disabled={nodes.length === 0 || isSaving}
                    className={`w-full flex items-center gap-2 px-3 py-2 min-h-11 text-left text-sm transition disabled:opacity-40 disabled:pointer-events-none ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-700"}`}
                  >
                    <SaveAll className="w-4 h-4 shrink-0" /> Save As
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={nodes.length === 0 || isSaving}
            className={`rounded-md border px-2 py-1.5 text-sm font-medium transition disabled:opacity-40 inline-flex items-center gap-1 shrink-0 ${
              isDark
                ? "border-emerald-700 text-emerald-300 hover:bg-emerald-800/40"
                : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
          </button>

          {activeCanvasId && user && !shareGated && (
            <button
              onClick={() => setIsShareOpen(true)}
              disabled={nodes.length === 0}
              className={`rounded-md border px-2 py-1.5 text-sm font-medium transition disabled:opacity-40 inline-flex items-center gap-1 shrink-0 ${
                isDark
                  ? "border-sky-700 text-sky-300 hover:bg-sky-800/40"
                  : "border-sky-300 text-sky-700 hover:bg-sky-50"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleEstimate}
            disabled={loading}
            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition shrink-0"
          >
            {loading ? "…" : "Run"}
          </button>

          <div className={`pl-1 border-l ${isDark ? "border-slate-700" : "border-gray-200"}`}>
            <NavProfile />
          </div>
        </div>
      </div>

      {/* Import modal */}
      <ImportWorkflowModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

      {/* New workflow confirmation */}
      <ConfirmModal
        isOpen={isNewConfirmOpen}
        onClose={() => setIsNewConfirmOpen(false)}
        onConfirm={handleNewConfirm}
        title="New workflow"
        message="Start a new workflow? Your current work will be cleared."
        confirmLabel="Start new"
      />

      {/* Pull from canvas modal */}
      <PullFromCanvasModal isOpen={isPullOpen} onClose={() => setIsPullOpen(false)} />

      {/* Publish modal */}
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
      />

      {/* Share modal */}
      {user && (
        <ShareWorkflowModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          canvasId={activeCanvasId ?? undefined}
          canvasName={currentWorkflowName}
        />
      )}

      {disconnectedForEstimate.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDisconnectedForEstimate([])}
        >
          <div
            className={`w-full max-w-md rounded-lg border p-5 shadow-xl ${
              isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-lg font-semibold mb-3 ${isDark ? "text-slate-100" : "text-gray-900"}`}>
              ⚠ Disconnected Nodes Detected
            </h2>
            <p className={`text-sm mb-2 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
              The following nodes are not connected to the workflow and will be excluded from estimation:
            </p>
            <ul className={`mb-5 space-y-1 text-sm ${isDark ? "text-slate-200" : "text-gray-700"}`}>
              {disconnectedForEstimate.map((node) => (
                <li key={node.id}>{`• ${node.label} (${node.type})`}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDisconnectedForEstimate([])}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
                  isDark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Go Back
              </button>
              <button
                onClick={handleProceedWithDisconnected}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}


    </header>
  );
}
