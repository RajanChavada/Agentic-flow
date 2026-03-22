"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Copy, Loader2, Check, Link as LinkIcon } from "lucide-react";
import { useUIState } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface ShareWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId?: string;
  canvasName?: string;
}

export default function ShareWorkflowModal({
  isOpen,
  onClose,
  canvasId,
  canvasName,
}: ShareWorkflowModalProps) {
  const { theme } = useUIState();
  const isDark = theme === "dark";
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [publicUuid, setPublicUuid] = useState<string | null>(null);
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadExisting = useCallback(async () => {
    if (!canvasId) return;
    const { data, error: fetchError } = await supabase
      .from("canvases")
      .select("is_public, public_uuid")
      .eq("id", canvasId)
      .single();

    if (fetchError || !data) {
      setError("Failed to load share settings.");
      return;
    }

    setPublicEnabled(Boolean(data.is_public));
    setPublicUuid(data.public_uuid ?? null);
    if (data.is_public && data.public_uuid) {
      setShareUrl(`${window.location.origin}/view/${data.public_uuid}`);
    } else {
      setShareUrl(null);
    }
  }, [canvasId]);

  useEffect(() => {
    if (isOpen && !loading && !error) {
      if (canvasId) {
        void loadExisting();
      }
    }
  }, [isOpen, canvasId, loadExisting, loading, error]);

  useEffect(() => {
    if (!isOpen) {
      setShareUrl(null);
      setPublicUuid(null);
      setPublicEnabled(false);
      setError(null);
      setCopied(false);
      setLoading(false);
    }
  }, [isOpen]);

  const handleTogglePublic = async () => {
    if (!canvasId) return;
    setLoading(true);
    setError(null);
    try {
      if (publicEnabled) {
        const { error: updateError } = await supabase
          .from("canvases")
          .update({ is_public: false })
          .eq("id", canvasId);
        if (updateError) {
          setError("Failed to disable public link.");
          return;
        }
        setPublicEnabled(false);
        setPublicUuid(null);
        setShareUrl(null);
        return;
      }

      const { data, error: updateError } = await supabase
        .from("canvases")
        .update({ is_public: true })
        .eq("id", canvasId)
        .select("public_uuid, is_public")
        .single();

      if (updateError || !data) {
        setError("Failed to enable public link.");
        return;
      }

      setPublicEnabled(true);
      setPublicUuid(data.public_uuid ?? null);
      if (data.public_uuid) {
        setShareUrl(`${window.location.origin}/view/${data.public_uuid}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn(
          "w-full max-w-md rounded-lg border p-6 shadow-xl",
          isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Share Workflow</h2>
          <button onClick={onClose} className={cn("rounded p-1 transition-colors", isDark ? "hover:bg-gray-800" : "hover:bg-gray-100")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Updating public link...</span>
          </div>
        )}

        {error && <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <div className="mb-4 rounded-md border px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Public link</p>
              <p className="text-xs text-muted-foreground">Anyone with the link can view this workflow (read-only).</p>
            </div>
            <button
              onClick={handleTogglePublic}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                publicEnabled ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {publicEnabled ? "On" : "Off"}
            </button>
          </div>
        </div>

        {publicEnabled && shareUrl && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm break-all">{shareUrl}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleCopy} className={cn("inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition", isDark ? "bg-gray-700 text-gray-100 hover:bg-gray-600" : "bg-gray-100 text-gray-800 hover:bg-gray-200")}>
                {copied ? (<><Check className="h-4 w-4" />Copied</>) : (<><Copy className="h-4 w-4" />Copy link</>)}
              </button>
              <span className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground">
                <LinkIcon className="h-4 w-4" /> Shareable link
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className={cn("rounded-md px-4 py-2 text-sm font-medium transition", isDark ? "bg-gray-700 text-gray-100 hover:bg-gray-600" : "bg-gray-100 text-gray-800 hover:bg-gray-200")}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
