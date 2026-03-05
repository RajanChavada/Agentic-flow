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
  ChevronDown,
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
import PublishModal from "./marketplace/PublishModal";
import ShareWorkflowModal from "./ShareWorkflowModal";
import { useAutoLayout } from "@/hooks/useAutoLayout";

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
  const [shareMode, setShareMode] = useState<"workflow" | "canvas" | null>(null);
  const shareDropdownRef = React.useRef<HTMLDivElement>(null);
  const activeCanvasId = useActiveCanvasId();
  const isDark = theme === "dark";
  const autoLayout = useAutoLayout();

  // Auth
  const user = useUser();
  const { openAuthModal } = useAuthStore();

  // Current workflow tracking
  const currentWorkflowId = useCurrentWorkflowId();
  const currentWorkflowName = useCurrentWorkflowName();
  const isDirty = useIsDirty();
  const isSaving = useWorkflowStore((s) => s.isSaving);
  const lastSavedAt = useWorkflowStore((s) => s.lastSavedAt);

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

  const handleEstimate = async () => {
    const hasStart = nodes.some((n) => n.type === "startNode");
    const hasFinish = nodes.some((n) => n.type === "finishNode");
    if (!hasStart || !hasFinish) {
      setErrorBanner("Workflow must have at least one Start and one Finish node.");
      return;
    }

    setErrorBanner(undefined);
    setLoading(true);

    const payload: EstimateRequestPayload = {
      nodes: nodes.map<NodeConfigPayload>((n) => ({
        id: n.id,
        type: n.data.type,
        label: n.data.label,
        model_provider: n.data.modelProvider,
        model_name: n.data.modelName,
        context: n.data.context,
        tool_id: n.data.toolId,
        tool_category: n.data.toolCategory,
        max_steps: n.data.maxSteps ?? null,
        task_type: n.data.taskType ?? null,
        expected_output_size: n.data.expectedOutputSize ?? null,
        expected_calls_per_run: n.data.expectedCallsPerRun ?? null,
        condition_expression: n.data.conditionExpression ?? null,
        probability: n.data.probability ?? null,
      })),
      edges: edges.map<EdgeConfigPayload>((e) => ({
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
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Failed to fetch estimation"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <header
      className={`flex items-center justify-between border-b px-6 h-14 shrink-0 transition-colors ${
        isDark
          ? "border-slate-700 bg-slate-900"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* ── Left side: brand + workflow name + status ── */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/canvases"
          className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 -ml-1 transition ${
            isDark
              ? "text-slate-100 hover:bg-slate-800 hover:text-white"
              : "text-gray-800 hover:bg-gray-100 hover:text-gray-900"
          }`}
          title="Back to My Canvases"
        >
          <Home className="h-4 w-4 shrink-0" />
          <span className="text-lg font-bold tracking-tight">Neurovn</span>
        </Link>

        {activeCanvasId && (
          <>
            <span className={`text-sm ${isDark ? "text-slate-600" : "text-gray-300"}`}>/</span>
            <Link
              href="/canvases"
              className={`inline-flex items-center gap-1 text-sm font-medium transition hover:underline ${
                isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-800"
              }`}
              title="Back to My Canvases"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> My Canvases
            </Link>
          </>
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
            className={`text-sm font-medium px-1.5 py-0.5 rounded border outline-none w-48 ${
              isDark
                ? "bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500"
                : "bg-white border-gray-300 text-gray-800 focus:border-blue-500"
            }`}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className={`text-sm font-medium px-1.5 py-0.5 rounded hover:bg-opacity-50 transition truncate max-w-48 ${
              isDark
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
        <span className="inline-flex items-center w-20 shrink-0">
          {isSaving && (
            <span
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                isDark ? "bg-amber-900/30 text-amber-400" : "bg-amber-50 text-amber-600"
              }`}
            >
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          {showSaved && !isSaving && (
            <span
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                isDark ? "bg-green-900/30 text-green-400" : "bg-green-50 text-green-700"
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
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            isDark
              ? "border-slate-600 text-slate-300 hover:bg-slate-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          }`}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <><Sun className="inline w-3.5 h-3.5 mr-1" /> Light</> : <><MoonStar className="inline w-3.5 h-3.5 mr-1" /> Dark</>}
        </button>

        {/* Templates */}
        <Link
          href="/marketplace"
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition inline-flex items-center ${
            isDark
              ? "border-slate-600 text-slate-300 hover:bg-slate-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          }`}
          title="Browse workflow templates"
        >
          <LayoutTemplate className="inline w-3.5 h-3.5 mr-1" /> Templates
        </Link>

        {/* New Workflow */}
        <button
          onClick={handleNew}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            isDark
              ? "border-slate-600 text-slate-300 hover:bg-slate-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          }`}
          title="New blank workflow"
        >
          <FilePlus className="inline w-3.5 h-3.5 mr-1" /> New
        </button>

        {/* Publish to Marketplace (only when user has a saved workflow) */}
        {currentWorkflowId && user && (
          <button
            onClick={() => setIsPublishOpen(true)}
            disabled={nodes.length === 0}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
              isDark
                ? "border-amber-700 text-amber-300 hover:bg-amber-800/40"
                : "border-amber-300 text-amber-700 hover:bg-amber-50"
            }`}
            title="Publish this workflow to the marketplace"
          >
            <UploadCloud className="inline w-3.5 h-3.5 mr-1" /> Publish
          </button>
        )}

        {/* Share (workflow or canvas) */}
        {activeCanvasId && user && (
          <div className="relative" ref={shareDropdownRef}>
            <button
              onClick={() => setIsShareOpen((o) => !o)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition inline-flex items-center gap-1 ${
                isDark
                  ? "border-sky-700 text-sky-300 hover:bg-sky-800/40"
                  : "border-sky-300 text-sky-700 hover:bg-sky-50"
              }`}
              title="Share workflow or canvas"
            >
              <Share2 className="inline w-3.5 h-3.5" /> Share <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {isShareOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsShareOpen(false)}
                  aria-hidden
                />
                <div
                  className={`absolute right-0 top-full mt-1 z-50 min-w-48 rounded-md border py-1 shadow-lg ${
                    isDark ? "border-slate-600 bg-slate-900" : "border-gray-200 bg-white"
                  }`}
                >
                  <button
                    onClick={() => {
                      setShareMode("workflow");
                      setIsShareOpen(false);
                    }}
                    disabled={nodes.length === 0}
                    className={`w-full px-3 py-2 text-left text-sm transition disabled:opacity-40 ${
                      isDark ? "hover:bg-slate-800" : "hover:bg-gray-100"
                    }`}
                  >
                    Share this workflow
                  </button>
                  <button
                    onClick={() => {
                      setShareMode("canvas");
                      setIsShareOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition ${
                      isDark ? "hover:bg-slate-800" : "hover:bg-gray-100"
                    }`}
                  >
                    Share this canvas
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={nodes.length === 0 || isSaving}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
            isDark
              ? "border-emerald-700 text-emerald-300 hover:bg-emerald-800/40"
              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          }`}
          title={currentWorkflowId ? "Save changes to current workflow" : "Save as new workflow"}
        >
          <Save className="inline w-3.5 h-3.5 mr-1" />
          {isSaving ? "Saving\u2026" : "Save"}
        </button>

        {/* Save As (only show when we have a current workflow) */}
        {currentWorkflowId && (
          <button
            onClick={handleSaveAs}
            disabled={nodes.length === 0 || isSaving}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
              isDark
                ? "border-teal-700 text-teal-300 hover:bg-teal-800/40"
                : "border-teal-300 text-teal-700 hover:bg-teal-50"
            }`}
            title="Save a copy as a new workflow"
          >
            <SaveAll className="inline w-3.5 h-3.5 mr-1" /> Save As
          </button>
        )}

        {/* Import */}
        <button
          onClick={handleImport}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            isDark
              ? "border-violet-700 text-violet-300 hover:bg-violet-800/40"
              : "border-violet-300 text-violet-700 hover:bg-violet-50"
          }`}
          title="Import a workflow from JSON (Generic / LangGraph)"
        >
          <Download className="inline w-3.5 h-3.5 mr-1" /> Import
        </button>

        {/* Pull from canvas */}
        {activeCanvasId && user && (
          <button
            onClick={() => setIsPullOpen(true)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              isDark
                ? "border-violet-700 text-violet-300 hover:bg-violet-800/40"
                : "border-violet-300 text-violet-700 hover:bg-violet-50"
            }`}
            title="Pull workflows from another canvas"
          >
            <GitBranch className="inline w-3.5 h-3.5 mr-1" /> Pull from canvas
          </button>
        )}

        {/* Auto-layout */}
        <button
          onClick={() => autoLayout()}
          disabled={nodes.length === 0}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
            isDark
              ? "border-cyan-700 text-cyan-300 hover:bg-cyan-800/40"
              : "border-cyan-300 text-cyan-700 hover:bg-cyan-50"
          }`}
          title="Auto-arrange nodes using dagre layout"
        >
          <LayoutDashboard className="inline w-3.5 h-3.5 mr-1" /> Layout
        </button>

        {/* Export */}
        <ExportDropdown isDark={isDark} />

        {/* Estimate */}
        <button
          onClick={handleEstimate}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "Running\u2026" : "Run Workflow & Gen Estimate"}
        </button>

        {/* ── Auth controls ── */}
        <div
          className={`ml-2 pl-2 border-l flex items-center ${
            isDark ? "border-slate-700" : "border-gray-200"
          }`}
        >
          <NavProfile />
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
          isOpen={shareMode !== null}
          onClose={() => setShareMode(null)}
          shareType={shareMode ?? "workflow"}
          workflowId={currentWorkflowId ?? undefined}
          canvasId={activeCanvasId ?? undefined}
          workflowName={currentWorkflowName}
          canvasName={undefined}
          nodes={shareMode === "workflow" ? nodes : undefined}
          edges={shareMode === "workflow" ? edges : undefined}
          userId={user.id}
        />
      )}
    </header>
  );
}
