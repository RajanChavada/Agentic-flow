"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  ArrowLeft,
  Activity,
} from "lucide-react";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import {
  useProfileStore,
  useProfile,
  useProfileLoading,
  useProfileError,
} from "@/store/useProfileStore";
import { useUIState } from "@/store/useWorkflowStore";
import { fetchUserMetrics } from "@/lib/userMetrics";
import type { UserMetrics } from "@/types/profile";
import AvatarPicker from "@/components/profile/AvatarPicker";
import MetricGauge from "@/components/profile/MetricGauge";
import ActivityDonutChart from "@/components/profile/ActivityDonutChart";
import AuthModal from "@/components/AuthModal";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

function getInitials(handle: string, email?: string): string {
  if (handle && handle.length >= 2) {
    return handle.slice(0, 2).toUpperCase();
  }
  if (email) {
    const part = email.split("@")[0];
    return part.slice(0, 2).toUpperCase();
  }
  return "??";
}

function formatLastActive(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const user = useUser();
  const profile = useProfile();
  const profileLoading = useProfileLoading();
  const profileError = useProfileError();
  const { theme } = useUIState();
  const isDark = theme === "dark";

  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleValue, setHandleValue] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [savingHandle, setSavingHandle] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<"available" | "taken" | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const handleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  useEffect(() => {
    if (!user) return;
    useProfileStore.getState().hydrate(user.id, user.email ?? undefined);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setMetricsLoading(true);
    fetchUserMetrics(user.id)
      .then(setMetrics)
      .finally(() => setMetricsLoading(false));
  }, [user]);

  useEffect(() => {
    if (profile) setHandleValue(profile.username_handle);
  }, [profile?.username_handle]);

  useEffect(() => {
    if (editingHandle) handleInputRef.current?.select();
  }, [editingHandle]);

  const checkAvailability = useCallback(async (): Promise<boolean> => {
    const trimmed = handleValue.trim().toLowerCase();
    if (!trimmed || !user) return false;
    if (!USERNAME_REGEX.test(trimmed)) {
      setHandleError("3–30 characters, letters, numbers, and underscores only.");
      setAvailabilityStatus(null);
      return false;
    }
    setHandleError(null);
    setCheckingAvailability(true);
    setAvailabilityStatus(null);
    try {
      const available = await useProfileStore.getState().checkUsernameAvailable(
        trimmed,
        user.id
      );
      setAvailabilityStatus(available ? "available" : "taken");
      if (!available) setHandleError("This handle is already taken.");
      return available;
    } finally {
      setCheckingAvailability(false);
    }
  }, [handleValue, user]);

  const commitHandle = useCallback(async () => {
    setHandleError(null);
    setAvailabilityStatus(null);
    const trimmed = handleValue.trim().toLowerCase();
    if (!trimmed || !user || !profile) {
      setEditingHandle(false);
      return;
    }
    if (trimmed === profile.username_handle) {
      setEditingHandle(false);
      return;
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      setHandleError("3–30 characters, letters, numbers, and underscores only.");
      return;
    }
    const available = await checkAvailability();
    if (!available) return;
    setSavingHandle(true);
    try {
      await useProfileStore.getState().updateUsername(user.id, trimmed);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setEditingHandle(false);
      setAvailabilityStatus(null);
    } catch {
      setHandleError("Failed to update. Please try again.");
    } finally {
      setSavingHandle(false);
    }
  }, [handleValue, user, profile, checkAvailability]);

  const handleAvatarSelect = useCallback(
    async (url: string, type: "upload" | "preset") => {
      if (!user) return;
      await useProfileStore.getState().updateAvatar(user.id, url, type);
      setShowAvatarPicker(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
    [user]
  );

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      if (!user) return;
      await useProfileStore.getState().uploadAvatar(user.id, file);
      setShowAvatarPicker(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
    [user]
  );

  const borderClass = isDark ? "border-slate-700" : "border-gray-200";
  const bgClass = isDark ? "bg-slate-900" : "bg-white";
  const cardClass = isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200";

  if (!user) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <AuthModal />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Sign in to view your profile.</p>
          <button
            onClick={() =>
              useAuthStore.getState().openAuthModal({
                reason: "Sign in to manage your profile.",
              })
            }
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Sign In
          </button>
          <Link
            href="/canvases"
            className="text-sm font-medium text-muted-foreground hover:underline"
          >
            Back to My Canvases
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/canvases"
            className={`flex items-center gap-2 text-sm font-medium transition ${isDark ? "text-slate-400 hover:text-slate-100" : "text-gray-500 hover:text-gray-900"}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-sm font-semibold">Profile Settings</span>
          <div className="w-20" />
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {profileLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            {profileError && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${isDark ? "border-red-800 bg-red-900/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}
              >
                {profileError}
              </div>
            )}

            {/* Avatar section */}
            <section className={`rounded-xl border p-6 ${cardClass}`}>
              <h2 className="text-sm font-semibold mb-4">Avatar</h2>
              <div className="flex items-start gap-6">
                <div className="shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-24 w-24 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
                    />
                  ) : (
                    <div
                      className={`flex h-24 w-24 items-center justify-center rounded-full border-2 ${borderClass} ${isDark ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}
                    >
                      <span className="text-2xl font-bold">
                        {getInitials(
                          profile?.username_handle ?? "",
                          user?.email ?? undefined
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className={`text-sm font-medium ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                  >
                    {showAvatarPicker ? "Hide options" : "Change avatar"}
                  </button>
                  {showAvatarPicker && (
                    <div className="mt-4">
                      <AvatarPicker
                        currentUrl={profile?.avatar_url ?? null}
                        onSelect={handleAvatarSelect}
                        onUpload={handleAvatarUpload}
                        isDark={isDark}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Username handle */}
            <section className={`rounded-xl border p-6 ${cardClass}`}>
              <h2 className="text-sm font-semibold mb-4">Username handle</h2>
              {editingHandle ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      ref={handleInputRef}
                      type="text"
                      value={handleValue}
                      onChange={(e) => {
                        setHandleValue(e.target.value);
                        setAvailabilityStatus(null);
                        setHandleError(null);
                      }}
                      onBlur={() => commitHandle()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitHandle();
                        if (e.key === "Escape") {
                          setEditingHandle(false);
                          setHandleValue(profile?.username_handle ?? "");
                          setHandleError(null);
                          setAvailabilityStatus(null);
                        }
                      }}
                      placeholder="username"
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition ${isDark ? "border-slate-600 bg-slate-800 text-slate-100 focus:border-blue-500" : "border-gray-300 bg-white text-gray-800 focus:border-blue-500"}`}
                    />
                    <button
                      type="button"
                      onClick={checkAvailability}
                      disabled={checkingAvailability || !handleValue.trim()}
                      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                    >
                      {checkingAvailability ? "Checking..." : "Check"}
                    </button>
                  </div>
                  {handleError && (
                    <p className="text-sm text-red-500">{handleError}</p>
                  )}
                  {availabilityStatus === "available" && !handleError && (
                    <p className="text-sm text-green-600 dark:text-green-400">Available</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    3–30 characters, letters, numbers, underscores only
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg">
                    @{profile?.username_handle ?? "..."}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingHandle(true)}
                    disabled={savingHandle}
                    className={`text-sm ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                  >
                    Edit
                  </button>
                </div>
              )}
            </section>

            {/* Metrics */}
            <section className={`rounded-xl border p-6 ${cardClass}`}>
              <h2 className="text-sm font-semibold mb-4">Your activity</h2>
              {metricsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : metrics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MetricGauge
                      label="Workflows"
                      value={metrics.workflows_count}
                      max={50}
                      isDark={isDark}
                    />
                    <MetricGauge
                      label="Canvases"
                      value={metrics.canvases_count}
                      max={50}
                      isDark={isDark}
                    />
                    <MetricGauge
                      label="Templates"
                      value={metrics.templates_published}
                      max={20}
                      isDark={isDark}
                    />
                    <MetricGauge
                      label="Estimates run"
                      value={metrics.estimates_run}
                      max={100}
                      isDark={isDark}
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <p className={`text-xs font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Content distribution
                      </p>
                      <ActivityDonutChart
                        data={[
                          { name: "Workflows", value: metrics.workflows_count },
                          { name: "Canvases", value: metrics.canvases_count },
                          { name: "Templates", value: metrics.templates_published },
                        ]}
                        isDark={isDark}
                      />
                    </div>
                    <div
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                        isDark ? "border-slate-600 bg-slate-800/60" : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <Activity className={`h-5 w-5 shrink-0 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                      <div>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Last active
                        </p>
                        <p className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                          {formatLastActive(metrics.last_active_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No activity yet. Create workflows to see your stats.
                </p>
              )}
            </section>

            {saveSuccess && (
              <div
                className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg ${isDark ? "bg-emerald-900/90 text-emerald-100" : "bg-emerald-600 text-white"}`}
              >
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Saved</span>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

