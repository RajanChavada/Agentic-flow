import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildProfileDashboardPayload } from "@/lib/profileInsights";
import type { WorkflowEstimation } from "@/types/workflow";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const normalizedHandle = handle.trim().toLowerCase();

  if (!normalizedHandle) {
    return NextResponse.json({ error: "Invalid handle." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Public profile lookup is not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, username_handle, display_name, bio, location, website, avatar_url, avatar_type, created_at, updated_at"
    )
    .ilike("username_handle", normalizedHandle)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const { data: canvases, error: canvasesError } = await supabase
    .from("canvases")
    .select("id, name, updated_at, thumbnail_url, is_public, public_uuid, is_pinned, pin_order, last_estimation_report")
    .eq("user_id", profile.id)
    .eq("is_public", true);

  if (canvasesError) {
    return NextResponse.json({ error: "Failed to load public canvases." }, { status: 500 });
  }

  const canvasIds = (canvases ?? []).map((canvas) => canvas.id);

  const workflowQuery = supabase.from("workflows").select("id, graph");
  const workflowFiltered = canvasIds.length > 0 ? workflowQuery.in("canvas_id", canvasIds) : workflowQuery.eq("id", "__none__");
  const estimateQuery = supabase
    .from("estimate_runs")
    .select("id, created_at, total_cost, canvas_id, node_count")
    .eq("user_id", profile.id);
  const estimateFiltered = canvasIds.length > 0 ? estimateQuery.in("canvas_id", canvasIds) : estimateQuery.eq("id", "__none__");

  const [{ data: templates, error: templatesError }, { data: workflows, error: workflowsError }, { data: estimates, error: estimatesError }] =
    await Promise.all([
      supabase
        .from("workflow_templates")
        .select("id, name, description, created_at")
        .eq("user_id", profile.id),
      workflowFiltered,
      estimateFiltered,
    ]);

  if (templatesError || workflowsError || estimatesError) {
    return NextResponse.json({ error: "Failed to load profile details." }, { status: 500 });
  }

  const dashboard = buildProfileDashboardPayload({
    workflowCount: (workflows ?? []).length,
    canvasCount: (canvases ?? []).length,
    templateCount: (templates ?? []).length,
    estimateRows: (estimates ?? []) as Array<{
      id: string;
      created_at: string;
      total_cost: number | null;
      canvas_id: string | null;
      node_count: number | null;
    }>,
    canvases: (canvases ?? []) as Array<{
      id: string;
      name: string;
      updated_at: string;
      thumbnail_url: string | null;
      is_public: boolean;
      public_uuid: string | null;
      is_pinned: boolean;
      pin_order: number;
      last_estimation_report: WorkflowEstimation | null;
    }>,
    templates: (templates ?? []) as Array<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
    }>,
    workflowGraphs: (workflows ?? [])
      .map((row) => row.graph)
      .filter((graph): graph is Record<string, unknown> => Boolean(graph) && typeof graph === "object"),
  });

  return NextResponse.json({
    profile: {
      id: profile.id,
      username_handle: profile.username_handle,
      display_name: profile.display_name ?? null,
      bio: profile.bio ?? null,
      location: profile.location ?? null,
      website: profile.website ?? null,
      avatar_url: profile.avatar_url ?? null,
      avatar_type: profile.avatar_type ?? null,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    },
    ...dashboard,
  });
}
