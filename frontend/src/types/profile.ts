export interface Profile {
  id: string;
  username_handle: string;
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
