import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/store/useWorkflowStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ModelRequestModalProps {
  onClose: () => void;
  isDark?: boolean;
}

export function ModelRequestModal({ onClose, isDark }: ModelRequestModalProps) {
  const [providerName, setProviderName] = useState("");
  const [modelName, setModelName] = useState("");
  const [pricing, setPricing] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { setSuccessMessage, setErrorBanner } = useWorkflowStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim() || !modelName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/model-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerName.trim(),
          model_name: modelName.trim(),
          pricing: pricing.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Submission failed");
      }

      setSuccessMessage("Request submitted — thank you! We review these weekly.");
      onClose();
    } catch (err) {
      setErrorBanner("Submission failed — please try again or open a GitHub issue directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div
        className={`relative w-full max-w-md rounded-lg shadow-2xl ${
          isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
        }`}
      >
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark ? "border-slate-700" : "border-gray-200"
          }`}
        >
          <h2 className={`font-bold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
            Request a Model
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              className={`block text-xs font-semibold mb-1 cursor-pointer ${
                isDark ? "text-slate-300" : "text-gray-700"
              }`}
            >
              Provider Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="e.g. Anthropic"
              className={`w-full rounded border px-3 py-2 text-sm ${
                isDark
                  ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              } outline-none transition-shadow`}
            />
          </div>

          <div>
            <label
              className={`block text-xs font-semibold mb-1 cursor-pointer ${
                isDark ? "text-slate-300" : "text-gray-700"
              }`}
            >
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. Claude 3.5 Sonnet"
              className={`w-full rounded border px-3 py-2 text-sm ${
                isDark
                  ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              } outline-none transition-shadow`}
            />
          </div>

          <div>
            <label
              className={`block text-xs font-semibold mb-1 cursor-pointer ${
                isDark ? "text-slate-300" : "text-gray-700"
              }`}
            >
              Pricing (optional)
            </label>
            <input
              type="text"
              value={pricing}
              onChange={(e) => setPricing(e.target.value)}
              placeholder="e.g. $0.15/$0.60 per 1M tokens"
              className={`w-full rounded border px-3 py-2 text-sm ${
                isDark
                  ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              } outline-none transition-shadow`}
            />
          </div>

          <div>
            <label
              className={`block text-xs font-semibold mb-1 cursor-pointer ${
                isDark ? "text-slate-300" : "text-gray-700"
              }`}
            >
              Notes (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context or documentation links..."
              className={`w-full rounded border px-3 py-2 text-sm ${
                isDark
                  ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              } outline-none transition-shadow resize-none`}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                isDark
                  ? "text-slate-300 hover:text-slate-100 hover:bg-slate-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !providerName.trim() || !modelName.trim()}
              className="px-4 py-2 text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
