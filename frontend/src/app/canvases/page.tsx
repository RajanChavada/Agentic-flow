"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, LayoutGrid, Loader2, LogIn, UserPlus, Trash2, Info, Share2 } from "lucide-react";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import AuthModal from "@/components/AuthModal";
import CanvasesInfoModal from "@/components/CanvasesInfoModal";
import ShareWorkflowModal from "@/components/ShareWorkflowModal";
import NavProfile from "@/components/NavProfile";
import { supabase } from "@/lib/supabase";
import type { Canvas } from "@/types/workflow";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}

export default function CanvasesPage() {
  const user = useUser();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingCanvasId, setDeletingCanvasId] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [shareCanvas, setShareCanvas] = useState<Canvas | null>(null);

  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  useEffect(() => {
    if (!user) {
      setCanvases([]);
      setLoading(false);
      return;
    }

    async function fetchCanvases() {
      setLoading(true);
      const { data, error } = await supabase
        .from("canvases")
        .select("id, name, created_at, updated_at, thumbnail_url")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch canvases:", error);
        setCanvases([]);
      } else {
        const withCounts = await Promise.all(
          (data ?? []).map(async (c) => {
            const { count } = await supabase
              .from("workflows")
              .select("*", { count: "exact", head: true })
              .eq("canvas_id", c.id);
            return {
              id: c.id,
              name: c.name,
              createdAt: c.created_at,
              updatedAt: c.updated_at,
              workflowCount: count ?? 0,
              thumbnailUrl: c.thumbnail_url ?? null,
            };
          })
        );
        setCanvases(withCounts);
      }
      setLoading(false);
    }

    fetchCanvases();
  }, [user]);

  const handleUpdateCanvasName = useCallback(
    async (canvasId: string, newName: string) => {
      if (!user) return;
      const trimmed = newName.trim();
      if (!trimmed) return;

      const { error } = await supabase
        .from("canvases")
        .update({ name: trimmed })
        .eq("id", canvasId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to update canvas name:", error);
      } else {
        setCanvases((prev) =>
          prev.map((c) =>
            c.id === canvasId ? { ...c, name: trimmed, updatedAt: new Date().toISOString() } : c
          )
        );
      }
      setEditingCanvasId(null);
    },
    [user]
  );

  const startEditCanvas = (canvas: Canvas) => {
    setEditingCanvasId(canvas.id);
    setEditingName(canvas.name);
  };

  const handleDeleteCanvas = useCallback(
    async (canvas: Canvas) => {
      if (!user) return;
      const count = canvas.workflowCount ?? 0;
      const msg =
        count > 0
          ? `Delete "${canvas.name}" and its ${count} workflow${count === 1 ? "" : "s"}? This cannot be undone.`
          : `Delete "${canvas.name}"?`;
      if (!confirm(msg)) return;

      setDeletingCanvasId(canvas.id);

      // Delete workflows in this canvas first (otherwise they become orphaned)
      const { error: workflowsError } = await supabase
        .from("workflows")
        .delete()
        .eq("canvas_id", canvas.id)
        .eq("user_id", user.id);

      if (workflowsError) {
        console.error("Failed to delete workflows:", workflowsError);
        setDeletingCanvasId(null);
        return;
      }

      const { error: canvasError } = await supabase
        .from("canvases")
        .delete()
        .eq("id", canvas.id)
        .eq("user_id", user.id);

      if (canvasError) {
        console.error("Failed to delete canvas:", canvasError);
      } else {
        setCanvases((prev) => prev.filter((c) => c.id !== canvas.id));
      }
      setDeletingCanvasId(null);
    },
    [user]
  );

  const handleCreateCanvas = async () => {
    if (!user) return;
    setCreating(true);
    const name = newName.trim() || "Untitled Canvas";

    const { data, error } = await supabase
      .from("canvases")
      .insert({ user_id: user.id, name })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create canvas:", error);
      setCreating(false);
      return;
    }

    setNewName("");
    setCreating(false);
    window.location.href = `/editor/${data.id}`;
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-[10px] font-bold text-background">
              NV
            </div>
            <span className="hidden sm:inline">Neurovn</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              Home
            </Link>
            <NavProfile />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">My Canvases</h1>
            <button
              onClick={() => setIsInfoOpen(true)}
              title="What are canvases?"
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Canvas name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCanvas()}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleCreateCanvas}
                disabled={creating}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                New canvas
              </button>
            </div>
          )}
        </div>

        {!user ? (
          <div className="mt-12 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Sign in to create and manage your canvases.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() =>
                  useAuthStore.getState().openAuthModal({
                    reason: "Sign in to create and manage your canvases.",
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
              <button
                onClick={() =>
                  useAuthStore.getState().openAuthModal({
                    reason: "Create an account to save your canvases and workflows.",
                    mode: "signup",
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium transition hover:bg-muted/50"
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </button>
            </div>
            <Link
              href="/editor/guest"
              className="mt-6 inline-block text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Continue to editor without signing in
            </Link>
            <AuthModal />
          </div>
        ) : loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : canvases.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              No canvases yet. Create one to get started.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <input
                type="text"
                placeholder="Canvas name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCanvas()}
                className="h-9 w-full sm:w-48 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleCreateCanvas}
                disabled={creating}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition hover:border-foreground/20 hover:shadow-md"
              >
                <div
                  className="flex items-start justify-between gap-2 px-5 pt-5 pb-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <div className="min-w-0 flex-1">
                    {editingCanvasId === canvas.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleUpdateCanvasName(canvas.id, editingName)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateCanvasName(canvas.id, editingName);
                          }
                          if (e.key === "Escape") setEditingCanvasId(null);
                        }}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : (
                      <h3
                        className="cursor-pointer font-medium text-foreground hover:underline"
                        onClick={() => startEditCanvas(canvas)}
                      >
                        {canvas.name}
                      </h3>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShareCanvas(canvas);
                      }}
                      title="Share canvas"
                      className="rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteCanvas(canvas);
                      }}
                      disabled={deletingCanvasId === canvas.id}
                      title="Delete canvas and its workflows"
                      className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      {deletingCanvasId === canvas.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Link
                  href={`/editor/${canvas.id}`}
                  className="flex flex-1 flex-col"
                >
                  {canvas.thumbnailUrl ? (
                    <div className="relative h-24 w-full shrink-0 overflow-hidden bg-muted">
                      <img
                        src={canvas.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 px-5 pb-5 pt-2 text-sm text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {canvas.workflowCount ?? 0} workflow{(canvas.workflowCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span>{formatRelativeTime(canvas.updatedAt)}</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
        <CanvasesInfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
        {user && (
          <ShareWorkflowModal
            isOpen={!!shareCanvas}
            onClose={() => setShareCanvas(null)}
            canvasId={shareCanvas?.id}
            canvasName={shareCanvas?.name}
          />
        )}
      </div>
    </main>
  );
}
