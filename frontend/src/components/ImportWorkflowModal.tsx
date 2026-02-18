"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Download, AlertTriangle } from "lucide-react";
import { useWorkflowStore, useUIState } from "@/store/useWorkflowStore";
import type { ImportSource, ImportedWorkflow } from "@/types/workflow";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SOURCE_OPTIONS: { value: ImportSource; label: string; hint: string }[] = [
  { value: "generic", label: "Generic", hint: "{ nodes: [...], edges: [...] }" },
  { value: "langgraph", label: "LangGraph", hint: "StateGraph-style JSON" },
  { value: "custom", label: "Custom", hint: "Internal format passthrough" },
];

const EXAMPLE_GENERIC = `{
  "nodes": [
    { "id": "start", "type": "startNode", "label": "Start" },
    { "id": "researcher", "type": "agentNode", "label": "Researcher", "model_provider": "OpenAI", "model_name": "GPT-4o", "context": "Research the given topic", "task_type": "rag_answer", "expected_output_size": "long" },
    { "id": "end", "type": "finishNode", "label": "Finish" }
  ],
  "edges": [
    { "source": "start", "target": "researcher" },
    { "source": "researcher", "target": "end" }
  ]
}`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportWorkflowModal({ isOpen, onClose }: Props) {
  const { theme } = useUIState();
  const { importWorkflow, setErrorBanner } = useWorkflowStore();
  const isDark = theme === "dark";

  const [source, setSource] = useState<ImportSource>("generic");
  const [jsonText, setJsonText] = useState("");
  const [mode, setMode] = useState<"replace" | "scenario">("scenario");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drag state — initialise with safe defaults, then centre on mount
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 200,
    left: 200,
  });
  const dragging = useRef(false);
  const dragOff = useRef({ x: 0, y: 0 });

  // Centre the modal once we're in the browser
  useEffect(() => {
    setPos({
      top: Math.max(60, window.innerHeight / 2 - 300),
      left: Math.max(20, window.innerWidth / 2 - 250),
    });
  }, []);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragOff.current = { x: e.clientX - pos.left, y: e.clientY - pos.top };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        left: Math.max(0, Math.min(window.innerWidth - 80, ev.clientX - dragOff.current.x)),
        top: Math.max(0, Math.min(window.innerHeight - 80, ev.clientY - dragOff.current.y)),
      });
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [pos]);

  const handleInsertExample = () => {
    setJsonText(EXAMPLE_GENERIC);
    setError(null);
  };

  const handleImport = async () => {
    setError(null);

    // Client-side JSON validation
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      setError("Invalid JSON syntax. Please check your input.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/import-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, payload }),
      });

      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try {
          const parsed = JSON.parse(text);
          detail = parsed.detail || text;
        } catch { /* use raw text */ }
        throw new Error(detail);
      }

      const imported: ImportedWorkflow = await res.json();
      importWorkflow(imported, mode);

      // Always save imported workflow as a separate scenario (user requirement)
      if (mode === "replace") {
        // "replace" mode puts it on canvas — also save a copy as a named scenario
        importWorkflow(imported, "scenario");
      }

      setErrorBanner(undefined);
      onClose();
      setJsonText("");
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className={`pointer-events-auto absolute rounded-xl border shadow-2xl ${
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        }`}
        style={{
          top: pos.top,
          left: pos.left,
          width: 500,
        }}
      >
        {/* Draggable header */}
        <div
          onMouseDown={onDragStart}
          className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl cursor-grab active:cursor-grabbing select-none border-b ${
            isDark ? "bg-slate-700/80 border-slate-600" : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} viewBox="0 0 16 16" fill="currentColor">
              <circle cx="4" cy="3" r="1.5" /><circle cx="12" cy="3" r="1.5" />
              <circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="8" r="1.5" />
              <circle cx="4" cy="13" r="1.5" /><circle cx="12" cy="13" r="1.5" />
            </svg>
            <span className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-gray-800"}`}>
              <Download className="inline w-4 h-4 mr-1 -mt-0.5" /> Import Workflow
            </span>
          </div>
          <button
            onClick={onClose}
            className={`rounded p-1 transition ${isDark ? "hover:bg-slate-600 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {/* Source format */}
          <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
            Source Format
          </label>
          <div className="flex gap-2 mb-3">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSource(opt.value)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                  source === opt.value
                    ? isDark
                      ? "bg-blue-700 border-blue-500 text-white"
                      : "bg-blue-600 border-blue-500 text-white"
                    : isDark
                    ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
                title={opt.hint}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Import mode */}
          <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
            Import Mode
          </label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode("replace")}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                mode === "replace"
                  ? isDark
                    ? "bg-amber-700 border-amber-500 text-white"
                    : "bg-amber-600 border-amber-500 text-white"
                  : isDark
                  ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Replace Canvas
            </button>
            <button
              onClick={() => setMode("scenario")}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                mode === "scenario"
                  ? isDark
                    ? "bg-emerald-700 border-emerald-500 text-white"
                    : "bg-emerald-600 border-emerald-500 text-white"
                  : isDark
                  ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Load as Scenario
            </button>
          </div>

          {/* JSON textarea */}
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Workflow JSON
            </label>
            <button
              onClick={handleInsertExample}
              className={`text-[10px] px-2 py-0.5 rounded border transition ${
                isDark
                  ? "border-slate-600 text-slate-400 hover:bg-slate-700"
                  : "border-gray-300 text-gray-500 hover:bg-gray-50"
              }`}
            >
              Paste Example
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setError(null); }}
            rows={12}
            className={`w-full rounded-md border px-3 py-2 text-xs font-mono mb-3 resize-none ${
              isDark
                ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                : "bg-white border-gray-300 text-gray-800"
            } ${error ? (isDark ? "border-red-500" : "border-red-400") : ""}`}
            placeholder='Paste your workflow JSON here...'
            spellCheck={false}
          />

          {/* Error message */}
          {error && (
            <div className={`rounded-md border px-3 py-2 mb-3 text-xs ${
              isDark ? "bg-red-900/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-700"
            }`}>
              <AlertTriangle className="inline w-3.5 h-3.5 mr-1" /> {error}
            </div>
          )}

          {/* Hint */}
          <p className={`text-[10px] mb-4 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            {source === "generic" && "Expected: { \"nodes\": [...], \"edges\": [...] } with id, type, label, model_provider, model_name, context fields."}
            {source === "langgraph" && "Expected: LangGraph StateGraph JSON with nodes array, edges array, and optional conditional_edges."}
            {source === "custom" && "Expected: Internal format matching the generic schema."}
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className={`rounded-md border px-4 py-1.5 text-sm transition ${
                isDark
                  ? "border-slate-500 text-slate-300 hover:bg-slate-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !jsonText.trim()}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? "Importing…" : `Import → ${mode === "replace" ? "Canvas" : "Scenario"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
