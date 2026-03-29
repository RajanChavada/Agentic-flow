export interface Profile {
  id: string;
  username_handle: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  avatar_type: "upload" | "preset" | null;
  created_at: string;
  updated_at: string;
}

export interface UserMetrics {
  workflows_count: number;
  canvases_count: number;
  templates_published: number;
  last_active_at: string | null;
  estimates_run: number;
}

export interface ProfileHeatmapPoint {
  date: string;
  count: number;
}

export interface ProfileModelUsage {
  provider: string;
  model: string;
  count: number;
  pct: number;
}

export interface ProfileCanvasSummary {
  id: string;
  name: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  isPublic: boolean;
  publicUuid: string | null;
  isPinned: boolean;
  pinOrder: number;
  lastEstimateCost: number | null;
  lastEstimateNodeCount: number | null;
}

export interface ProfileTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface ProfileImpactStats {
  workflows: number;
  canvases: number;
  templates: number;
  estimates: number;
  totalCostModelled: number;
}
