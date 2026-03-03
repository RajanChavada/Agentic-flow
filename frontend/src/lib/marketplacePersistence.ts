/**
 * Marketplace persistence — list, get, and publish workflow templates.
 * Uses Supabase client; RLS allows anon read, authenticated insert.
 */

import { supabase } from "@/lib/supabase";
import type { WorkflowTemplate } from "@/types/workflow";

/** Extract message/code from Supabase/Postgrest errors for logging (avoids empty {} in console). */
function formatSupabaseError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string; details?: string };
    const parts = [e.message, e.code, e.details].filter(Boolean);
    return parts.length > 0 ? parts.join(" | ") : JSON.stringify(err);
  }
  return String(err);
}

export type TemplateCategory = "rag" | "research" | "orchestration" | "custom" | "";

export type ListTemplatesResult = {
  templates: WorkflowTemplate[];
  error: string | null;
};

export async function listTemplates(
  category?: TemplateCategory
): Promise<ListTemplatesResult> {
  let query = supabase
    .from("workflow_templates")
    .select("id, name, description, graph, category, is_curated, use_count, created_at, updated_at, user_id")
    .order("is_curated", { ascending: false })
    .order("use_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    const errMsg = formatSupabaseError(error);
    console.error("listTemplates error:", errMsg);
    return { templates: [], error: errMsg };
  }

  const templates: WorkflowTemplate[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    graph: row.graph as WorkflowTemplate["graph"],
    category: row.category ?? "custom",
    is_curated: row.is_curated ?? false,
    use_count: row.use_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id ?? null,
    author_name: null,
  }));

  return { templates, error: null };
}

export async function getTemplate(id: string): Promise<WorkflowTemplate | null> {
  const { data, error } = await supabase
    .from("workflow_templates")
    .select("id, name, description, graph, category, is_curated, use_count, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    if (error) console.error("getTemplate error:", formatSupabaseError(error));
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? null,
    graph: data.graph as WorkflowTemplate["graph"],
    category: data.category ?? "custom",
    is_curated: data.is_curated ?? false,
    use_count: data.use_count ?? 0,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function publishTemplate(
  userId: string,
  workflowId: string,
  name: string,
  description: string,
  category: string
): Promise<string | null> {
  const { data: workflow } = await supabase
    .from("workflows")
    .select("graph")
    .eq("id", workflowId)
    .eq("user_id", userId)
    .single();

  if (!workflow?.graph) {
    console.error("Workflow not found or not owned by user");
    return null;
  }

  const { data, error } = await supabase
    .from("workflow_templates")
    .insert({
      user_id: userId,
      name,
      description: description || null,
      graph: workflow.graph,
      category: category || "custom",
      is_curated: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("publishTemplate error:", formatSupabaseError(error));
    return null;
  }

  return data?.id ?? null;
}

export async function incrementUseCount(id: string): Promise<void> {
  try {
    await supabase.rpc("increment_template_use_count", { template_id: id });
  } catch {
    // RPC may not exist; ignore
  }
}

export async function deleteTemplate(templateId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("workflow_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteTemplate error:", formatSupabaseError(error));
    return false;
  }
  return true;
}
