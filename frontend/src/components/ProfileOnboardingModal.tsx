/**
 * ProfileOnboardingModal — shown when a new user (no profile) signs in via OAuth.
 * Prompts them to choose avatar and username before continuing to the app.
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useUIState } from "@/store/useWorkflowStore";
import AvatarPicker from "@/components/profile/AvatarPicker";
import { ProfileError } from "@/lib/profilePersistence";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

interface ProfileOnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export default function ProfileOnboardingModal({ open, onComplete }: ProfileOnboardingModalProps) {
  const router = useRouter();
  const user = useUser();
  const { theme } = useUIState();
  const isDark = theme === "dark";

  const [handleValue, setHandleValue] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<"available" | "taken" | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarType, setAvatarType] = useState<"upload" | "preset" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const handleInputRef = useRef<HTMLInputElement>(null);

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
      const available = await useProfileStore.getState().checkUsernameAvailable(trimmed, user.id);
      setAvailabilityStatus(available ? "available" : "taken");
      if (!available) setHandleError("This handle is already taken.");
      return available;
    } finally {
      setCheckingAvailability(false);
    }
  }, [handleValue, user]);

  const handleContinue = useCallback(async () => {
    if (!user) return;
    setHandleError(null);
    setAvailabilityStatus(null);
    const trimmed = handleValue.trim().toLowerCase();
    if (!trimmed) {
      setHandleError("Please enter a username.");
      return;
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      setHandleError("3–30 characters, letters, numbers, and underscores only.");
      return;
    }
    const available = await checkAvailability();
    if (!available) return;

    setSubmitting(true);
    try {
      await useProfileStore.getState().completeOnboarding(
        user.id,
        trimmed,
        avatarUrl ?? null,
        avatarType ?? null
      );
      useAuthStore.getState().setNeedsProfileOnboarding(false);
      onComplete();
      router.push("/canvases");
    } catch (err) {
      console.error("[ProfileOnboarding] create failed:", err);
      let msg = "Failed to create profile. Please try again.";
      if (err instanceof ProfileError) {
        if (err.code === "23505") msg = "Username already taken.";
        else if (err.code === "42501") msg = "Session expired. Please sign in again.";
      }
      setHandleError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [user, handleValue, avatarUrl, avatarType, checkAvailability, onComplete, router]);

  const handleSkip = useCallback(async () => {
    if (!user) return;
    setSkipping(true);
    try {
      await useProfileStore.getState().skipOnboarding(user.id);
      useAuthStore.getState().setNeedsProfileOnboarding(false);
      onComplete();
      router.push("/canvases");
    } catch {
      setHandleError("Failed to create profile. Please try again.");
    } finally {
      setSkipping(false);
    }
  }, [user, onComplete, router]);

  const handleAvatarSelect = useCallback((url: string, type: "upload" | "preset") => {
    setAvatarUrl(url);
    setAvatarType(type);
  }, []);

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      if (!user) return;
      await useProfileStore.getState().uploadAvatar(user.id, file);
      const profile = useProfileStore.getState().profile;
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
        setAvatarType("upload");
      }
    },
    [user]
  );

  useEffect(() => {
    if (open) handleInputRef.current?.focus();
  }, [open]);

  if (!open || !user) return null;

  const borderClass = isDark ? "border-slate-700" : "border-gray-200";
  const cardClass = isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-md rounded-xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto ${isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-gray-200 bg-white text-gray-800"}`}
      >
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5" />
          <h2 className="text-lg font-bold">Create your profile</h2>
        </div>
        <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Choose an avatar and username to get started.
        </p>

        {/* Avatar */}
        <section className={`rounded-xl border p-4 mb-6 ${cardClass}`}>
          <h3 className="text-sm font-semibold mb-3">Avatar</h3>
          <AvatarPicker
            currentUrl={avatarUrl}
            onSelect={handleAvatarSelect}
            onUpload={handleAvatarUpload}
            isDark={isDark}
          />
        </section>

        {/* Username */}
        <section className={`rounded-xl border p-4 mb-6 ${cardClass}`}>
          <h3 className="text-sm font-semibold mb-3">Username</h3>
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
            {handleError && <p className="text-sm text-red-500">{handleError}</p>}
            {availabilityStatus === "available" && !handleError && (
              <p className="text-sm text-green-600 dark:text-green-400">Available</p>
            )}
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              3–30 characters, letters, numbers, underscores only
            </p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleContinue}
            disabled={submitting || !handleValue.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue
          </button>
          <button
            onClick={handleSkip}
            disabled={skipping}
            className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${isDark ? "border-slate-600 text-slate-400 hover:bg-slate-800" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
          >
            {skipping ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
