/**
 * Share workflow/canvas helpers.
 * Uses Supabase workflow_shares table; no backend API.
 */

import { supabase } from "@/lib/supabase";
import type { Node } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";
import { nodesToPayload } from "@/store/utils";

/** Generate a URL-safe share token (12 hex chars). */
export function generateShareToken(): string {
  const arr = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type ShareType = "workflow" | "canvas";

/** Snapshot for a single workflow. */
export interface WorkflowSnapshot {
  nodes: Node<WorkflowNodeData>[];
  edges: { id?: string; source: string; target: string; data?: Record<string, unknown> }[];
  name: string;
  recursionLimit?: number;
}

/** Snapshot for canvas share (multiple workflows). */
export interface CanvasShareSnapshot {
  workflows: WorkflowSnapshot[];
  canvasName: string;
}

export type ShareSnapshot = WorkflowSnapshot | CanvasShareSnapshot;

function isCanvasSnapshot(s: ShareSnapshot): s is CanvasShareSnapshot {
  return "workflows" in s && Array.isArray((s as CanvasShareSnapshot).workflows);
}

export interface WorkflowShareRow {
  id: string;
  share_token: string;
  user_id: string;
  share_type: ShareType;
  workflow_id: string | null;
  canvas_id: string | null;
  snapshot: ShareSnapshot;
  expires_at: string | null;
  created_at: string;
}

export async function getShareForEntity(
  shareType: ShareType,
  options: { workflowId?: string; canvasId?: string }
): Promise<WorkflowShareRow | null> {
  let query = supabase
    .from("workflow_shares")
    .select("*")
    .eq("share_type", shareType);

  if (options.workflowId) {
    query = query.eq("workflow_id", options.workflowId);
  }
  if (options.canvasId) {
    query = query.eq("canvas_id", options.canvasId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    console.error("Failed to look up share:", error);
    return null;
  }
  return (data as WorkflowShareRow | null) ?? null;
}

export async function deleteShareById(id: string): Promise<boolean> {
  const { error } = await supabase.from("workflow_shares").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete share:", error);
    return false;
  }
  return true;
}

/**
 * Create a share record. Caller must be authenticated.
 */
export async function createShare(
  userId: string,
  shareType: ShareType,
  snapshot: ShareSnapshot,
  options?: { workflowId?: string; canvasId?: string; expiresAt?: Date }
): Promise<{ shareToken: string; shareUrl: string } | null> {
  const shareToken = generateShareToken();

  const { data, error } = await supabase
    .from("workflow_shares")
    .insert({
      share_token: shareToken,
      user_id: userId,
      share_type: shareType,
      workflow_id: options?.workflowId ?? null,
      canvas_id: options?.canvasId ?? null,
      snapshot: snapshot as unknown as Record<string, unknown>,
      expires_at: options?.expiresAt?.toISOString() ?? null,
    })
    .select("share_token")
    .single();

  if (error) {
    console.error("Failed to create share:", error);
    return null;
  }

  const token = (data as { share_token: string }).share_token;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    shareToken: token,
    shareUrl: `${origin}/share/${token}`,
  };
}

/**
 * Fetch a share by token. Uses RPC for anon/public access.
 */
export async function getShareByToken(token: string): Promise<WorkflowShareRow | null> {
  const { data, error } = await supabase.rpc("get_share_by_token", { token });

  if (error) {
    console.error("Failed to fetch share:", error);
    return null;
  }

  const rows = data as WorkflowShareRow[] | null;
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

/**
 * Copy shared workflow(s) into the user's canvas. Creates a new canvas if needed.
 * Returns the canvas ID to redirect to.
 */
export async function copyWorkflowToCanvas(
  userId: string,
  snapshot: ShareSnapshot
): Promise<string | null> {
  if (isCanvasSnapshot(snapshot)) {
    const { data: newCanvas, error: canvasErr } = await supabase
      .from("canvases")
      .insert({ user_id: userId, name: snapshot.canvasName || "Shared Canvas" })
      .select("id")
      .single();

    if (canvasErr || !newCanvas) {
      console.error("Failed to create canvas:", canvasErr);
      return null;
    }

    for (const wf of snapshot.workflows) {
      const graph = {
        nodes: nodesToPayload(wf.nodes),
        edges: wf.edges.map((e) => ({
          id: e.id ?? `${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
        })),
        recursionLimit: wf.recursionLimit ?? 25,
      };

      const { error: wfErr } = await supabase.from("workflows").insert({
        user_id: userId,
        canvas_id: newCanvas.id,
        name: wf.name,
        graph,
      });

      if (wfErr) {
        console.error("Failed to create workflow:", wfErr);
      }
    }

    return newCanvas.id;
  } else {
    const { data: newCanvas, error: canvasErr } = await supabase
      .from("canvases")
      .insert({ user_id: userId, name: "Shared Workflows" })
      .select("id")
      .single();

    if (canvasErr || !newCanvas) {
      console.error("Failed to create canvas:", canvasErr);
      return null;
    }

    const graph = {
      nodes: nodesToPayload(snapshot.nodes),
      edges: snapshot.edges.map((e) => ({
        id: e.id ?? `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
      })),
      recursionLimit: snapshot.recursionLimit ?? 25,
    };

    const { error: wfErr } = await supabase.from("workflows").insert({
      user_id: userId,
      canvas_id: newCanvas.id,
      name: snapshot.name,
      graph,
    });

    if (wfErr) {
      console.error("Failed to create workflow:", wfErr);
      return null;
    }

    return newCanvas.id;
  }
}
