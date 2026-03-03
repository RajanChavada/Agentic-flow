/**
 * User metrics — aggregate counts from workflows, canvases, templates.
 * Uses Supabase; RLS ensures user sees only their own data.
 */

import { supabase } from "@/lib/supabase";
import type { UserMetrics } from "@/types/profile";

export async function fetchUserMetrics(userId: string): Promise<UserMetrics> {
  const [
    workflowsRes,
    canvasesRes,
    templatesRes,
    wfMaxRes,
    cvMaxRes,
    estimatesRes,
  ] = await Promise.all([
    supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("canvases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("workflow_templates")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("workflows")
      .select("updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("canvases")
      .select("updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("last_estimate", "is", null),
  ]);

  const workflowsCount = workflowsRes.count ?? 0;
  const canvasesCount = canvasesRes.count ?? 0;
  const templatesCount = templatesRes.count ?? 0;
  const estimatesRun = estimatesRes.count ?? 0;

  const wfTs = wfMaxRes.data?.updated_at ?? null;
  const cvTs = cvMaxRes.data?.updated_at ?? null;

  let lastActiveAt: string | null = null;
  if (wfTs && cvTs) {
    lastActiveAt = wfTs > cvTs ? wfTs : cvTs;
  } else {
    lastActiveAt = wfTs ?? cvTs;
  }

  return {
    workflows_count: workflowsCount,
    canvases_count: canvasesCount,
    templates_published: templatesCount,
    last_active_at: lastActiveAt,
    estimates_run: estimatesRun,
  };
}
