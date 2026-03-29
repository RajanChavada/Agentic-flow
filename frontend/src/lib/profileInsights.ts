import { supabase } from "@/lib/supabase";
import type {
  ProfileCanvasSummary,
  ProfileHeatmapPoint,
  ProfileImpactStats,
  ProfileModelUsage,
  ProfileTemplateSummary,
} from "@/types/profile";
import type { WorkflowEstimation } from "@/types/workflow";

type EstimateRunRow = {
  id: string;
  created_at: string;
  total_cost: number | null;
  canvas_id: string | null;
  node_count: number | null;
};

type CanvasRow = {
  id: string;
  name: string;
  updated_at: string;
  thumbnail_url: string | null;
  is_public: boolean;
  public_uuid: string | null;
  is_pinned: boolean;
  pin_order: number;
  last_estimation_report: WorkflowEstimation | null;
};

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export interface ProfileDashboardPayload {
  stats: ProfileImpactStats;
  heatmapValues: ProfileHeatmapPoint[];
  topModels: ProfileModelUsage[];
  canvases: ProfileCanvasSummary[];
  pinnedCanvases: ProfileCanvasSummary[];
  recentCanvases: ProfileCanvasSummary[];
  templates: ProfileTemplateSummary[];
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function buildHeatmap(estimates: EstimateRunRow[]): ProfileHeatmapPoint[] {
  const now = new Date();
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);

  const grouped = new Map<string, number>();
  for (const row of estimates) {
    if (!row.created_at) continue;
    const date = new Date(row.created_at);
    if (date < start || date > now) continue;
    const key = dateKey(row.created_at);
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  return [...grouped.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildModelUsage(workflowGraphs: Array<Record<string, unknown>>): ProfileModelUsage[] {
  const counts = new Map<string, { provider: string; model: string; count: number }>();
  let total = 0;

  for (const graph of workflowGraphs) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const candidate = node as Record<string, unknown>;
      const provider =
        typeof candidate.model_provider === "string"
          ? candidate.model_provider
          : typeof candidate.modelProvider === "string"
            ? candidate.modelProvider
            : null;
      const model =
        typeof candidate.model_name === "string"
          ? candidate.model_name
          : typeof candidate.modelName === "string"
            ? candidate.modelName
            : null;
      if (!provider || !model) continue;
      const key = `${provider}::${model}`;
      const current = counts.get(key);
      if (current) {
        current.count += 1;
      } else {
        counts.set(key, { provider, model, count: 1 });
      }
      total += 1;
    }
  }

  if (total === 0) return [];

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((entry) => ({
      provider: entry.provider,
      model: entry.model,
      count: entry.count,
      pct: Math.max(1, Math.round((entry.count / total) * 100)),
    }));
}

function buildCanvasSummaries(canvases: CanvasRow[], estimates: EstimateRunRow[]): ProfileCanvasSummary[] {
  const lastEstimateByCanvas = new Map<
    string,
    { createdAt: string; totalCost: number | null; nodeCount: number | null }
  >();

  for (const row of estimates) {
    if (!row.canvas_id) continue;
    const previous = lastEstimateByCanvas.get(row.canvas_id);
    if (!previous || row.created_at > previous.createdAt) {
      lastEstimateByCanvas.set(row.canvas_id, {
        createdAt: row.created_at,
        totalCost: row.total_cost ?? null,
        nodeCount: row.node_count ?? null,
      });
    }
  }

  return canvases.map((canvas) => {
    const estimate = lastEstimateByCanvas.get(canvas.id);
    const fallbackCost =
      canvas.last_estimation_report && typeof canvas.last_estimation_report.total_cost === "number"
        ? canvas.last_estimation_report.total_cost
        : null;
    return {
      id: canvas.id,
      name: canvas.name,
      updatedAt: canvas.updated_at,
      thumbnailUrl: canvas.thumbnail_url,
      isPublic: canvas.is_public,
      publicUuid: canvas.public_uuid ?? null,
      isPinned: canvas.is_pinned,
      pinOrder: canvas.pin_order ?? 0,
      lastEstimateCost: estimate?.totalCost ?? fallbackCost,
      lastEstimateNodeCount: estimate?.nodeCount ?? null,
    };
  });
}

export function buildProfileDashboardPayload(input: {
  workflowCount: number;
  canvasCount: number;
  templateCount: number;
  estimateRows: EstimateRunRow[];
  canvases: CanvasRow[];
  templates: TemplateRow[];
  workflowGraphs: Array<Record<string, unknown>>;
}): ProfileDashboardPayload {
  const totalCost = input.estimateRows.reduce((sum, row) => sum + (row.total_cost ?? 0), 0);
  const canvases = buildCanvasSummaries(input.canvases, input.estimateRows);
  const pinnedCanvases = canvases
    .filter((canvas) => canvas.isPinned)
    .sort((a, b) => a.pinOrder - b.pinOrder || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return {
    stats: {
      workflows: input.workflowCount,
      canvases: input.canvasCount,
      templates: input.templateCount,
      estimates: input.estimateRows.length,
      totalCostModelled: totalCost,
    },
    heatmapValues: buildHeatmap(input.estimateRows),
    topModels: buildModelUsage(input.workflowGraphs),
    canvases,
    pinnedCanvases,
    recentCanvases: [...canvases]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6),
    templates: input.templates
      .map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description ?? null,
        createdAt: template.created_at,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8),
  };
}

export async function fetchProfileDashboardData(userId: string): Promise<ProfileDashboardPayload> {
  const [
    workflowCountRes,
    canvasRowsRes,
    templateRowsRes,
    estimateRowsRes,
    workflowGraphsRes,
  ] = await Promise.all([
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("canvases")
      .select("id, name, updated_at, thumbnail_url, is_public, public_uuid, is_pinned, pin_order, last_estimation_report")
      .eq("user_id", userId),
    supabase
      .from("workflow_templates")
      .select("id, name, description, created_at")
      .eq("user_id", userId),
    supabase
      .from("estimate_runs")
      .select("id, created_at, total_cost, canvas_id, node_count")
      .eq("user_id", userId),
    supabase.from("workflows").select("graph").eq("user_id", userId),
  ]);

  if (canvasRowsRes.error) throw canvasRowsRes.error;
  if (templateRowsRes.error) throw templateRowsRes.error;
  if (estimateRowsRes.error) throw estimateRowsRes.error;
  if (workflowGraphsRes.error) throw workflowGraphsRes.error;

  return buildProfileDashboardPayload({
    workflowCount: workflowCountRes.count ?? 0,
    canvasCount: (canvasRowsRes.data ?? []).length,
    templateCount: (templateRowsRes.data ?? []).length,
    estimateRows: (estimateRowsRes.data ?? []) as EstimateRunRow[],
    canvases: (canvasRowsRes.data ?? []) as CanvasRow[],
    templates: (templateRowsRes.data ?? []) as TemplateRow[],
    workflowGraphs: (workflowGraphsRes.data ?? [])
      .map((row) => row.graph)
      .filter((graph): graph is Record<string, unknown> => Boolean(graph) && typeof graph === "object"),
  });
}

export async function fetchPublicProfileDashboardData(handle: string): Promise<ProfileDashboardPayload> {
  const res = await fetch(`/api/profile/public/${encodeURIComponent(handle)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error("Unable to load public profile.");
  }
  const json = (await res.json()) as ProfileDashboardPayload;
  return json;
}

export async function recordEstimateRun(params: {
  userId: string;
  canvasId: string | null;
  nodeCount: number;
  totalCost: number;
}): Promise<void> {
  const { error } = await supabase.from("estimate_runs").insert({
    user_id: params.userId,
    canvas_id: params.canvasId,
    node_count: params.nodeCount,
    total_cost: params.totalCost,
  });
  if (error) {
    console.error("Failed to store estimate run:", error.message);
  }
}
