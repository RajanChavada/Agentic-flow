/**
 * Profile store — user profile (username, avatar) and actions.
 * Hydrated when user is authenticated; creates profile if missing.
 */

import { create } from "zustand";
import {
  fetchProfile,
  upsertProfile,
  uploadAvatar as persistUploadAvatar,
  checkUsernameAvailable,
} from "@/lib/profilePersistence";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/profile";

export function defaultHandle(userId: string): string {
  const suffix = userId.replace(/-/g, "").slice(0, 8);
  return `user_${suffix}`;
}

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;

  /** Hydrate profile. For new users (no profile), does NOT auto-create — leaves profile null and calls onComplete(true). */
  hydrate: (
    userId: string | null,
    email?: string,
    opts?: { onComplete?: (needsOnboarding: boolean) => void }
  ) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateUsername: (userId: string, handle: string) => Promise<void>;
  updateAvatar: (userId: string, url: string, type: "upload" | "preset") => Promise<void>;
  uploadAvatar: (userId: string, file: File) => Promise<void>;
  checkUsernameAvailable: (handle: string, excludeUserId?: string) => Promise<boolean>;
  /** Create profile with user-chosen values; used by onboarding modal. */
  completeOnboarding: (
    userId: string,
    username_handle: string,
    avatar_url?: string | null,
    avatar_type?: "upload" | "preset" | null
  ) => Promise<void>;
  /** Create profile with default handle; used when user skips onboarding. */
  skipOnboarding: (userId: string) => Promise<void>;
  clearError: () => void;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  hydrate: async (userId, email, opts) => {
    if (!userId) {
      set({ profile: null, loading: false, error: null });
      opts?.onComplete?.(false);
      return;
    }

    set({ loading: true, error: null });
    try {
      const profile = await fetchProfile(userId);
      if (!profile) {
        set({ profile: null, loading: false });
        opts?.onComplete?.(true);
        return;
      }
      set({ profile, loading: false });
      opts?.onComplete?.(false);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load profile",
        loading: false,
      });
      opts?.onComplete?.(false);
    }
  },

  fetchProfile: async (userId) => {
    set({ loading: true, error: null });
    try {
      const profile = await fetchProfile(userId);
      set({ profile });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load profile",
      });
    } finally {
      set({ loading: false });
    }
  },

  updateUsername: async (userId, handle) => {
    set({ error: null });
    try {
      const profile = await upsertProfile(userId, { username_handle: handle });
      set({ profile });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update username",
      });
      throw err;
    }
  },

  updateAvatar: async (userId, url, type) => {
    set({ error: null });
    try {
      const profile = await upsertProfile(userId, { avatar_url: url, avatar_type: type });
      set({ profile });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update avatar",
      });
      throw err;
    }
  },

  uploadAvatar: async (userId, file) => {
    set({ error: null });
    try {
      const url = await persistUploadAvatar(userId, file);
      const profile = await upsertProfile(userId, { avatar_url: url, avatar_type: "upload" });
      set({ profile });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to upload avatar",
      });
      throw err;
    }
  },

  checkUsernameAvailable: async (handle, excludeUserId) => {
    return checkUsernameAvailable(handle, excludeUserId);
  },

  completeOnboarding: async (userId, username_handle, avatar_url, avatar_type) => {
    set({ error: null });
    try {
      // Ensure session is fresh (helps new OAuth users where auth.uid() may not be ready yet)
      await supabase.auth.refreshSession();
      const profile = await upsertProfile(userId, {
        username_handle,
        avatar_url: avatar_url ?? null,
        avatar_type: avatar_type ?? null,
      });
      set({ profile });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to create profile",
      });
      throw err;
    }
  },

  skipOnboarding: async (userId) => {
    set({ error: null });
    try {
      await supabase.auth.refreshSession();
      const profile = await upsertProfile(userId, {
        username_handle: defaultHandle(userId),
      });
      set({ profile });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to create profile",
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  clear: () => set({ profile: null, loading: false, error: null }),
}));

export const useProfile = () => useProfileStore((s) => s.profile);
export const useProfileLoading = () => useProfileStore((s) => s.loading);
export const useProfileError = () => useProfileStore((s) => s.error);
