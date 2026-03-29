"use client";

import Link from "next/link";
import CalendarHeatmap from "react-calendar-heatmap";
import { MapPin, Link as LinkIcon, Pin, PinOff, GitBranch, LayoutGrid, LayoutTemplate, Zap, DollarSign } from "lucide-react";
import type { Profile, ProfileCanvasSummary } from "@/types/profile";
import type { ProfileDashboardPayload } from "@/lib/profileInsights";
import { ProviderIcon } from "@/lib/providerIcons";

interface ProfileDashboardViewProps {
  profile: Profile;
  data: ProfileDashboardPayload | null;
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  onEditProfile?: () => void;
  onOpenAvatarPicker?: () => void;
  onTogglePin?: (canvas: ProfileCanvasSummary) => void;
}

const numberFormat = new Intl.NumberFormat("en-US");
const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type HeatmapValue = {
  date?: string;
  count?: number;
} | null;

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function profileName(profile: Profile): string {
  return profile.display_name?.trim() || profile.username_handle;
}

function normalizeWebsite(url: string | null): string | null {
  if (!url?.trim()) return null;
  const value = url.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export default function ProfileDashboardView({
  profile,
  data,
  loading,
  error,
  isOwner,
  onEditProfile,
  onOpenAvatarPicker,
  onTogglePin,
}: ProfileDashboardViewProps) {
  const website = normalizeWebsite(profile.website);
  const pinned = data?.pinnedCanvases ?? [];
  const recent = data?.recentCanvases ?? [];
  const templates = data?.templates ?? [];
  const heatmap = data?.heatmapValues ?? [];
  const totalYear = heatmap.reduce((sum, point) => sum + point.count, 0);
  const heatmapStart = new Date();
  heatmapStart.setFullYear(heatmapStart.getFullYear() - 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <button
              type="button"
              onClick={() => onOpenAvatarPicker?.()}
              disabled={!isOwner}
              className={`group ${isOwner ? "cursor-pointer" : "cursor-default"}`}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
                  {profileName(profile).slice(0, 2).toUpperCase()}
                </div>
              )}
            </button>
            <div className="mt-3">
              <h1 className="text-xl font-semibold">{profileName(profile)}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username_handle}</p>
            </div>
            {profile.bio ? <p className="mt-3 text-sm text-muted-foreground">{profile.bio}</p> : null}
            {profile.location ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </div>
            ) : null}
            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                <span className="truncate">{profile.website}</span>
              </a>
            ) : null}
            {isOwner ? (
              <button
                type="button"
                onClick={() => onEditProfile?.()}
                className="mt-4 text-sm font-medium text-blue-600 hover:underline"
              >
                Edit profile
              </button>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your impact</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{numberFormat.format(data?.stats.workflows ?? 0)}</span>
                <span className="text-muted-foreground">workflows</span>
              </div>
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{numberFormat.format(data?.stats.canvases ?? 0)}</span>
                <span className="text-muted-foreground">canvases</span>
              </div>
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{numberFormat.format(data?.stats.templates ?? 0)}</span>
                <span className="text-muted-foreground">templates</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{numberFormat.format(data?.stats.estimates ?? 0)}</span>
                <span className="text-muted-foreground">estimates</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold">{moneyFormat.format(data?.stats.totalCostModelled ?? 0)}</span>
                <span className="text-muted-foreground">modelled</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Most used models</h3>
            <div className="mt-3 space-y-2">
              {(data?.topModels.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No model usage yet.</p>
              ) : (
                data?.topModels.map((item) => (
                  <div key={`${item.provider}-${item.model}`} className="flex items-center gap-2">
                    <ProviderIcon provider={item.provider} size={14} />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{item.model}</span>
                    <span className="text-xs font-medium">{item.pct}%</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{numberFormat.format(totalYear)} estimates in the last year</h2>
              <span className="text-xs text-muted-foreground">Less → More</span>
            </div>
            <div className="overflow-x-auto">
              <CalendarHeatmap
                classForValue={(value: HeatmapValue) => {
                  if (!value || !value.count) return "color-empty";
                  if (value.count >= 10) return "color-scale-4";
                  if (value.count >= 5) return "color-scale-3";
                  if (value.count >= 2) return "color-scale-2";
                  return "color-scale-1";
                }}
                startDate={heatmapStart}
                endDate={new Date()}
                values={heatmap}
                showWeekdayLabels={false}
                titleForValue={(value: HeatmapValue) => {
                  if (!value?.date) return "No activity";
                  return `${value.count ?? 0} estimate${(value.count ?? 0) === 1 ? "" : "s"} on ${value.date}`;
                }}
                gutterSize={3}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Pinned Workflows</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pinned.map((canvas) => (
                <article key={canvas.id} className="overflow-hidden rounded-lg border border-border bg-background">
                  <Link href={isOwner ? `/editor/${canvas.id}` : canvas.publicUuid ? `/view/${canvas.publicUuid}` : "#"}>
                    {canvas.thumbnailUrl ? (
                      <img src={canvas.thumbnailUrl} alt="" className="h-28 w-full object-cover" />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                        No thumbnail
                      </div>
                    )}
                    <div className="space-y-1 p-3">
                      <div className="line-clamp-1 text-sm font-medium">{canvas.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {canvas.lastEstimateNodeCount ?? 0} nodes
                        {canvas.lastEstimateCost != null ? ` · ${moneyFormat.format(canvas.lastEstimateCost)}/run` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">Updated {formatRelativeTime(canvas.updatedAt)}</div>
                    </div>
                  </Link>
                  {isOwner ? (
                    <div className="border-t border-border px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onTogglePin?.(canvas)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <PinOff className="h-3.5 w-3.5" />
                        Unpin
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
              {isOwner && pinned.length < 6 ? (
                <div className="flex min-h-[170px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  Pin up to {6 - pinned.length} more canvases from My Canvases.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Recent Canvases</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recent.map((canvas) => (
                <article key={canvas.id} className="overflow-hidden rounded-lg border border-border bg-background">
                  <Link href={isOwner ? `/editor/${canvas.id}` : canvas.publicUuid ? `/view/${canvas.publicUuid}` : "#"}>
                    {canvas.thumbnailUrl ? (
                      <img src={canvas.thumbnailUrl} alt="" className="h-24 w-full object-cover" />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                        No thumbnail
                      </div>
                    )}
                    <div className="p-3">
                      <div className="line-clamp-1 text-sm font-medium">{canvas.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Updated {formatRelativeTime(canvas.updatedAt)}</div>
                    </div>
                  </Link>
                  {isOwner ? (
                    <div className="border-t border-border px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onTogglePin?.(canvas)}
                        disabled={!canvas.isPinned && pinned.length >= 6}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                      >
                        <Pin className="h-3.5 w-3.5" />
                        {canvas.isPinned ? "Unpin" : "Pin to profile"}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Published Templates</h2>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates published yet.</p>
            ) : (
              <ul className="space-y-2">
                {templates.map((template) => (
                  <li key={template.id} className="rounded-lg border border-border px-3 py-2">
                    <div className="text-sm font-medium">{template.name}</div>
                    {template.description ? (
                      <div className="line-clamp-2 text-xs text-muted-foreground">{template.description}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      </div>

      {loading ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">Loading profile…</div>
        </div>
      ) : null}
    </div>
  );
}
