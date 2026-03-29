"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import { useProfile, useProfileLoading, useProfileStore } from "@/store/useProfileStore";
import { fetchProfileDashboardData, type ProfileDashboardPayload } from "@/lib/profileInsights";
import ProfileDashboardView from "@/components/profile/ProfileDashboardView";
import AvatarPicker from "@/components/profile/AvatarPicker";
import type { ProfileCanvasSummary } from "@/types/profile";
import { supabase } from "@/lib/supabase";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

type EditProfileForm = {
  displayName: string;
  handle: string;
  bio: string;
  location: string;
  website: string;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function ProfileSettingsPage() {
  const user = useUser();
  const profile = useProfile();
  const profileLoading = useProfileLoading();

  const [dashboard, setDashboard] = useState<ProfileDashboardPayload | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [form, setForm] = useState<EditProfileForm>({
    displayName: "",
    handle: "",
    bio: "",
    location: "",
    website: "",
  });

  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  useEffect(() => {
    if (!user) return;
    useProfileStore.getState().hydrate(user.id, user.email ?? undefined);
  }, [user]);

  const reloadDashboard = useCallback(async () => {
    if (!user) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const next = await fetchProfileDashboardData(user.id);
      setDashboard(next);
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setDashboardLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void reloadDashboard();
  }, [user, reloadDashboard]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.display_name ?? "",
      handle: profile.username_handle ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      website: profile.website ?? "",
    });
  }, [profile]);

  const overallLoading = profileLoading || dashboardLoading;
  const combinedError = dashboardError;

  const showSavedBadge = useMemo(() => saveSuccess && !savingEdit, [saveSuccess, savingEdit]);

  const handleAvatarSelect = useCallback(
    async (url: string, type: "upload" | "preset") => {
      if (!user) return;
      await useProfileStore.getState().updateAvatar(user.id, url, type);
      setShowAvatarPicker(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1800);
    },
    [user]
  );

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      if (!user) return;
      await useProfileStore.getState().uploadAvatar(user.id, file);
      setShowAvatarPicker(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1800);
    },
    [user]
  );

  const handleTogglePin = useCallback(
    async (canvas: ProfileCanvasSummary) => {
      if (!user || !dashboard) return;
      if (!canvas.isPinned && dashboard.pinnedCanvases.length >= 6) return;

      const nextPinned = !canvas.isPinned;
      const nextOrder = nextPinned ? dashboard.pinnedCanvases.length + 1 : 0;
      const { error } = await supabase
        .from("canvases")
        .update({ is_pinned: nextPinned, pin_order: nextOrder })
        .eq("id", canvas.id)
        .eq("user_id", user.id);

      if (error) {
        setDashboardError("Failed to update pinned canvas.");
        return;
      }
      await reloadDashboard();
    },
    [dashboard, user, reloadDashboard]
  );

  const handleSaveProfile = useCallback(async () => {
    if (!user || !profile) return;
    setSavingEdit(true);
    setEditError(null);
    const nextHandle = form.handle.trim().toLowerCase();
    if (!USERNAME_REGEX.test(nextHandle)) {
      setEditError("Handle must be 3-30 characters (letters, numbers, underscores).");
      setSavingEdit(false);
      return;
    }

    try {
      if (nextHandle !== profile.username_handle) {
        const available = await useProfileStore.getState().checkUsernameAvailable(nextHandle, user.id);
        if (!available) {
          setEditError("That handle is already taken.");
          return;
        }
        await useProfileStore.getState().updateUsername(user.id, nextHandle);
      }

      await useProfileStore.getState().updateProfileDetails(user.id, {
        display_name: emptyToNull(form.displayName),
        bio: emptyToNull(form.bio)?.slice(0, 160) ?? null,
        location: emptyToNull(form.location),
        website: emptyToNull(form.website),
      });

      setEditOpen(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1800);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSavingEdit(false);
    }
  }, [form, profile, user]);

  if (!user) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Sign in to view your profile.</p>
          <button
            onClick={() =>
              useAuthStore.getState().openAuthModal({
                reason: "Sign in to manage your profile.",
              })
            }
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/canvases" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-sm font-semibold">Profile</span>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Edit Profile
          </button>
        </div>
      </nav>

      {profile ? (
        <ProfileDashboardView
          profile={profile}
          data={dashboard}
          loading={overallLoading}
          error={combinedError}
          isOwner
          onEditProfile={() => setEditOpen(true)}
          onOpenAvatarPicker={() => setShowAvatarPicker((v) => !v)}
          onTogglePin={handleTogglePin}
        />
      ) : null}

      {showAvatarPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Update avatar</h2>
              <button type="button" onClick={() => setShowAvatarPicker(false)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <AvatarPicker
              currentUrl={profile?.avatar_url ?? null}
              onSelect={handleAvatarSelect}
              onUpload={handleAvatarUpload}
              isDark={false}
            />
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Edit profile</h2>
              <button type="button" onClick={() => setEditOpen(false)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Display name</span>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Handle</span>
                <input
                  type="text"
                  value={form.handle}
                  onChange={(e) => setForm((prev) => ({ ...prev, handle: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Bio (max 160)</span>
                <textarea
                  rows={3}
                  maxLength={160}
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Location</span>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Website</span>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>
            {editError ? <p className="mt-3 text-sm text-red-600">{editError}</p> : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingEdit}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSavedBadge ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-lg">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Saved</span>
        </div>
      ) : null}

      {!profile && overallLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </main>
  );
}
