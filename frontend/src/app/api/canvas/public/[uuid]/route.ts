import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Canvas lookup is not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: canvas, error } = await supabase
    .from("canvases")
    .select("id, name, created_at, updated_at, is_public, public_uuid, last_estimation_report")
    .eq("public_uuid", uuid)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !canvas) {
    return NextResponse.json({ error: "Canvas not found." }, { status: 404 });
  }

  const { data: workflows, error: workflowsError } = await supabase
    .from("workflows")
    .select("id, name, graph, last_estimate, updated_at")
    .eq("canvas_id", canvas.id)
    .order("updated_at", { ascending: false });

  if (workflowsError) {
    return NextResponse.json({ error: "Failed to load workflows." }, { status: 500 });
  }

  return NextResponse.json({
    id: canvas.id,
    name: canvas.name,
    createdAt: canvas.created_at,
    updatedAt: canvas.updated_at,
    isPublic: canvas.is_public,
    publicUuid: canvas.public_uuid,
    lastEstimationReport: canvas.last_estimation_report ?? null,
    workflows: workflows ?? [],
  });
}
