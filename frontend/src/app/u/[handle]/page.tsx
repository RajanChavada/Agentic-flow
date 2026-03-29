"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import ProfileDashboardView from "@/components/profile/ProfileDashboardView";
import type { Profile } from "@/types/profile";
import type { ProfileDashboardPayload } from "@/lib/profileInsights";

type PublicProfileResponse = ProfileDashboardPayload & {
  profile: Profile;
};

export default function PublicProfilePage({ params }: { params: { handle: string } }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<ProfileDashboardPayload | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/profile/public/${encodeURIComponent(params.handle)}`);
        if (!res.ok) {
          throw new Error("Profile not found.");
        }
        const json = (await res.json()) as PublicProfileResponse;
        setProfile(json.profile);
        setData({
          stats: json.stats,
          heatmapValues: json.heatmapValues,
          topModels: json.topModels,
          canvases: json.canvases,
          pinnedCanvases: json.pinnedCanvases,
          recentCanvases: json.recentCanvases,
          templates: json.templates,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load public profile.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.handle]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-sm font-semibold">Public Profile</span>
          <div className="w-10" />
        </div>
      </nav>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : profile && data ? (
        <ProfileDashboardView profile={profile} data={data} loading={false} error={error} isOwner={false} />
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-lg font-medium">Profile unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "The profile you requested does not exist."}</p>
        </div>
      )}
    </main>
  );
}
