"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Download, AlertTriangle, UploadCloud } from "lucide-react";
import { useWorkflowStore, useUIState } from "@/store/useWorkflowStore";
import type { ImportedWorkflow } from "@/types/workflow";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Re-map internal SOURCE_OPTIONS to UI tabs
const uiTabs = [
  { id: "my_workflow", label: "My Workflow", hint: "Upload .agenticflow.json" },
  { id: "estimate", label: "Quick Estimate", hint: "Structured external import" },
  { id: "langgraph", label: "LangGraph (beta)", hint: "StateGraph-style JSON" },
] as const;
type TabId = typeof uiTabs[number]["id"];

const EXAMPLE_LANGGRAPH = `{
  "nodes": [
    { "id": "agent" },
    { "id": "tools" }
  ],
  "edges": [
    { "source": "agent", "target": "tools" },
    { "source": "tools", "target": "agent" }
  ]
}`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportWorkflowModal({ isOpen, onClose }: Props) {
  const { theme } = useUIState();
  const { importWorkflow, loadAgenticFlow, setErrorBanner } = useWorkflowStore();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<TabId>("my_workflow");
  const [jsonText, setJsonText] = useState("");

  // File upload state for My Workflow
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Structured form state for Quick Estimate (placeholder logic)
  const [estimateNodeCount, setEstimateNodeCount] = useState(3);
  const [estimateAvgTokens, setEstimateAvgTokens] = useState(1000);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 200,
    left: 200,
  });
  const dragging = useRef(false);
  const dragOff = useRef({ x: 0, y: 0 });

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
    setJsonText(EXAMPLE_LANGGRAPH);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleImport = async () => {
    setError(null);
    setLoading(true);

    try {
      if (activeTab === "my_workflow") {
        if (!selectedFile) {
          throw new Error("Please select a .agenticflow.json file to upload.");
        }

        const text = await selectedFile.text();
        const payload = JSON.parse(text);

        if (payload.schema_version !== "1.0" || !payload.nodes || !payload.edges) {
          throw new Error("Invalid AgenticFlow schema. Expected schema_version 1.0 with nodes and edges.");
        }

        // Direct load bypassing external formatting
        loadAgenticFlow(payload);

      } else if (activeTab === "estimate") {
        // Mock generic payload based on structured form
        const genericPayload = {
          nodes: Array.from({ length: estimateNodeCount }, (_, i) => ({
            id: `node-${i}`,
            type: "agentNode",
            label: `Agent ${i + 1}`,
            expected_output_size: estimateAvgTokens > 1000 ? "long" : "short"
          })),
          edges: Array.from({ length: Math.max(0, estimateNodeCount - 1) }, (_, i) => ({
            source: `node-${i}`,
            target: `node-${i + 1}`
          }))
        };

        const res = await fetch(`${API_BASE}/api/import-workflow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "generic", payload: genericPayload }),
        });

        if (!res.ok) throw new Error(await res.text());
        const imported: ImportedWorkflow = await res.json();
        // Since Quick Estimate is an external concept, always load into canvas and test
        importWorkflow(imported, "replace");

      } else if (activeTab === "langgraph") {
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(jsonText);
        } catch {
          throw new Error("Invalid JSON syntax. Please check your input.");
        }

        const res = await fetch(`${API_BASE}/api/import-workflow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "langgraph", payload }),
        });

        if (!res.ok) throw new Error(await res.text());
        const imported: ImportedWorkflow = await res.json();
        // Always load langgraph imports to current canvas
        importWorkflow(imported, "replace");
      }

      setErrorBanner(undefined);
      onClose();
      setJsonText("");
      setSelectedFile(null);
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
        className={`pointer-events-auto absolute rounded-xl border shadow-2xl ${isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
          }`}
        style={{ top: pos.top, left: pos.left, width: 500 }}
      >
        {/* Draggable header */}
        <div
          onMouseDown={onDragStart}
          className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl cursor-grab active:cursor-grabbing select-none border-b ${isDark ? "bg-slate-700/80 border-slate-600" : "bg-gray-50 border-gray-200"
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
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b pb-3 border-gray-200 dark:border-slate-700">
            {uiTabs.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveTab(opt.id)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${activeTab === opt.id
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

          {/* Tab Content: My Workflow */}
          {activeTab === "my_workflow" && (
            <div className="mb-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition ${isDark
                  ? "border-slate-600 hover:border-slate-400 bg-slate-800/50"
                  : "border-gray-300 hover:border-blue-400 bg-gray-50/50"
                  }`}
              >
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <UploadCloud className={`mx-auto mb-2 w-8 h-8 ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                <p className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                  {selectedFile ? selectedFile.name : "Click to upload .agenticflow.json"}
                </p>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  Restores a previously exported workflow exactly as it was.
                </p>
              </div>
            </div>
          )}

          {/* Tab Content: Quick Estimate */}
          {activeTab === "estimate" && (
            <div className="mb-4 space-y-3">
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Provide details about an external workflow to quickly generate an estimated graph layout.
              </p>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300">
                Number of Nodes
                <input
                  type="number"
                  value={estimateNodeCount}
                  onChange={(e) => setEstimateNodeCount(Number(e.target.value))}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${isDark ? "bg-slate-700 border-slate-600 focus:border-blue-500" : "border-gray-300 focus:border-blue-500"}`}
                />
              </label>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300">
                Average Tokens per Node
                <input
                  type="number"
                  value={estimateAvgTokens}
                  onChange={(e) => setEstimateAvgTokens(Number(e.target.value))}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${isDark ? "bg-slate-700 border-slate-600 focus:border-blue-500" : "border-gray-300 focus:border-blue-500"}`}
                />
              </label>
            </div>
          )}

          {/* Tab Content: LangGraph */}
          {activeTab === "langgraph" && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  LangGraph JSON
                </label>
                <button
                  onClick={handleInsertExample}
                  className={`text-[10px] px-2 py-0.5 rounded border transition ${isDark
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
                rows={8}
                className={`w-full rounded-md border px-3 py-2 text-xs font-mono mb-1 resize-none ${isDark
                  ? "bg-slate-700 border-slate-500 text-slate-100 placeholder-slate-500"
                  : "bg-white border-gray-300 text-gray-800"
                  } ${error ? (isDark ? "border-red-500" : "border-red-400") : ""}`}
                placeholder='Paste your StateGraph JSON here...'
                spellCheck={false}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className={`rounded-md border px-3 py-2 mb-3 text-xs ${isDark ? "bg-red-900/30 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-700"
              }`}>
              <AlertTriangle className="inline w-3.5 h-3.5 mr-1" /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className={`rounded-md border px-4 py-1.5 text-sm transition ${isDark
                ? "border-slate-500 text-slate-300 hover:bg-slate-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || (activeTab === "my_workflow" && !selectedFile) || (activeTab === "langgraph" && !jsonText.trim())}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? "Importing…" : "Import to Canvas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
