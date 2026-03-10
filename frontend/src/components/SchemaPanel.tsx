"use client";

import React, { useState } from "react";
import { Loader2, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowStore, useWorkflowNodes } from "@/store/useWorkflowStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface SchemaPanelProps {
  nodeId: string;
  schemaType: "output" | "input";
  onClose: () => void;
}

export default function SchemaPanel({ nodeId, schemaType, onClose }: SchemaPanelProps) {
  const isDark = useWorkflowStore((s) => s.ui.theme === "dark");
  const nodes = useWorkflowNodes();
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const node = nodes.find((n) => n.id === nodeId);

  const schemaKey = schemaType === "output" ? "outputSchema" : "inputSchema";
  const currentSchema =
    (node?.data?.[schemaKey] as Record<string, unknown> | null | undefined) ?? null;
  const nodeContext = (node?.data?.context as string | undefined) ?? "";

  const [nlDescription, setNlDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!nlDescription.trim()) return;
    setIsGenerating(true);
    setErrors([]);
    try {
      const description =
        schemaType === "output"
          ? `What this node produces: ${nlDescription}`
          : `What this node expects as input: ${nlDescription}`;
      const res = await fetch(`${API_BASE}/api/generate-schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, context: nodeContext || undefined }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ detail: "Schema generation failed" }));
        setErrors([err.detail || "Schema generation failed"]);
        return;
      }
      const data = await res.json();
      updateNodeData(nodeId, { [schemaKey]: data.schema });
      setIsEditing(false);
    } catch {
      setErrors(["Failed to connect to backend"]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleValidateAndApply = async () => {
    setErrors([]);
    try {
      const parsed = JSON.parse(editText);
      const res = await fetch(`${API_BASE}/api/validate-schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: parsed }),
      });
      const data = await res.json();
      if (data.valid) {
        updateNodeData(nodeId, { [schemaKey]: parsed });
        setIsEditing(false);
      } else {
        setErrors(data.errors || ["Invalid schema"]);
      }
    } catch {
      setErrors(["Invalid JSON"]);
    }
  };

  const handleClear = () => {
    updateNodeData(nodeId, { [schemaKey]: null });
    setIsEditing(false);
    setErrors([]);
  };

  if (!node) return null;

  return (
    <div
      className={cn(
        "border-t px-4 py-3",
        isDark ? "border-slate-700" : "border-stone-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              schemaType === "output" ? "bg-blue-500" : "bg-amber-500"
            )}
          />
          <span
            className={cn(
              "text-xs font-medium",
              isDark ? "text-slate-300" : "text-stone-700"
            )}
          >
            {schemaType === "output" ? "Output Schema" : "Input Schema"}
          </span>
          {currentSchema && (
            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-stone-400 dark:text-slate-500" />
        </button>
      </div>

      {/* NL Description + Generate */}
      <div className="flex gap-1.5 mb-2">
        <input
          type="text"
          value={nlDescription}
          onChange={(e) => setNlDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder={
            schemaType === "output"
              ? "Describe what this node produces..."
              : "Describe what this node expects..."
          }
          className={cn(
            "flex-1 h-7 rounded border px-2 text-xs outline-none",
            "bg-stone-50 border-stone-300 text-stone-800 placeholder:text-stone-400 focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
            "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
          )}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !nlDescription.trim()}
          className={cn(
            "h-7 px-2.5 rounded text-xs font-medium transition-colors flex items-center gap-1 shrink-0",
            isGenerating || !nlDescription.trim()
              ? "bg-stone-100 text-stone-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {isGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
          Generate
        </button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div
          className={cn(
            "rounded border p-1.5 mb-2 text-[10px]",
            isDark
              ? "bg-red-900/30 border-red-800 text-red-300"
              : "bg-red-50 border-red-200 text-red-600"
          )}
        >
          {errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      {/* Schema display / editor */}
      {currentSchema && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span
              className={cn(
                "text-[10px] font-medium",
                isDark ? "text-slate-400" : "text-stone-500"
              )}
            >
              Schema
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (!isEditing)
                    setEditText(JSON.stringify(currentSchema, null, 2));
                  setIsEditing(!isEditing);
                  setErrors([]);
                }}
                className={cn(
                  "text-[10px] font-medium px-2 py-1 rounded transition",
                  isDark
                    ? "text-blue-400 hover:bg-slate-700"
                    : "text-blue-600 hover:bg-blue-50"
                )}
              >
                {isEditing ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={handleClear}
                className={cn(
                  "text-[10px] font-medium px-2 py-1 rounded transition",
                  isDark
                    ? "text-red-400 hover:bg-slate-700"
                    : "text-red-600 hover:bg-red-50"
                )}
              >
                Clear
              </button>
            </div>
          </div>

          {isEditing ? (
            <>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                className={cn(
                  "w-full rounded border px-2 py-1.5 text-[10px] font-mono mb-1.5 resize-none",
                  isDark
                    ? "bg-slate-800 border-slate-600 text-slate-100"
                    : "bg-white border-stone-300 text-stone-800"
                )}
              />
              <button
                onClick={handleValidateAndApply}
                className="w-full h-8 rounded bg-blue-600 text-[10px] font-medium text-white hover:bg-blue-700 transition"
              >
                Validate & Apply
              </button>
            </>
          ) : (
            <pre
              className={cn(
                "rounded border p-2 text-[10px] font-mono leading-relaxed overflow-auto max-h-32",
                isDark
                  ? "bg-slate-900/50 border-slate-600 text-slate-300"
                  : "bg-white border-stone-200 text-stone-700"
              )}
            >
              {JSON.stringify(currentSchema, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
