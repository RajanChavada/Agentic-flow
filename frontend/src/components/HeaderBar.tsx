"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sun,
  MoonStar,
  Save,
  SaveAll,
  FilePlus,
  Download,
  LayoutDashboard,
  LogIn,
  LogOut,
  User,
  Check,
  Loader2,
} from "lucide-react";
import {
  useWorkflowStore,
  useWorkflowNodes,
  useWorkflowEdges,
  useUIState,
  useCurrentWorkflowId,
  useCurrentWorkflowName,
  useIsDirty,
} from "@/store/useWorkflowStore";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import type {
  NodeConfigPayload,
  EdgeConfigPayload,
  WorkflowEstimation,
  EstimateRequestPayload,
} from "@/types/workflow";
import ImportWorkflowModal from "./ImportWorkflowModal";
import ExportDropdown from "./ExportDropdown";
import { useAutoLayout } from "@/hooks/useAutoLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function HeaderBar() {
  const nodes = useWorkflowNodes();
  const edges = useWorkflowEdges();
  const { theme } = useUIState();
  const { setEstimation, setErrorBanner, toggleTheme } = useWorkflowStore();
  const [loading, setLoading] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const isDark = theme === "dark";
  const autoLayout = useAutoLayout();

  // Auth
  const user = useUser();
  const { openAuthModal, signOut } = useAuthStore();

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
        onSuccess: () => doSave(),
      });
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
      })),
      edges: edges.map<EdgeConfigPayload>((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
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
      className={`flex items-center justify-between border-b px-6 py-3 transition-colors ${
        isDark
          ? "border-slate-700 bg-slate-900"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* ── Left side: brand + workflow name + status ── */}
      <div className="flex items-center gap-3">
        <h1
          className={`text-lg font-bold tracking-tight ${
            isDark ? "text-slate-100" : "text-gray-800"
          }`}
        >
          Agentic Flow Designer
        </h1>

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

        {/* Save status */}
        {isSaving && (
          <span
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
              isDark ? "bg-amber-900/30 text-amber-400" : "bg-amber-50 text-amber-600"
            }`}
          >
            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
          </span>
        )}
        {showSaved && !isSaving && (
          <span
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-opacity ${
              isDark ? "bg-green-900/30 text-green-400" : "bg-green-50 text-green-700"
            }`}
          >
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
        {saveError && !isSaving && (
          <span className="text-[10px] text-red-500 px-2">{saveError}</span>
        )}
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

        {/* Auto-layout */}
        <button
          onClick={autoLayout}
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
          className={`ml-2 pl-2 border-l flex items-center gap-2 ${
            isDark ? "border-slate-700" : "border-gray-200"
          }`}
        >
          {user ? (
            <>
              <span
                className={`flex items-center gap-1 text-xs truncate max-w-30 ${
                  isDark ? "text-slate-300" : "text-gray-600"
                }`}
                title={user.email ?? "Signed in"}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                {user.email?.split("@")[0]}
              </span>
              <button
                onClick={signOut}
                className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                  isDark
                    ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-100"
                }`}
                title="Sign out"
              >
                <LogOut className="inline w-3 h-3 mr-0.5" /> Out
              </button>
            </>
          ) : (
            <button
              onClick={() => openAuthModal()}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                isDark
                  ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
              title="Sign in"
            >
              <LogIn className="inline w-3.5 h-3.5 mr-1" /> Sign In
            </button>
          )}
        </div>
      </div>

      {/* Import modal */}
      <ImportWorkflowModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </header>
  );
}
