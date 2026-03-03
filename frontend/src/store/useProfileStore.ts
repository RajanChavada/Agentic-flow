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
import type { Profile } from "@/types/profile";

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;

  hydrate: (userId: string | null, email?: string) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateUsername: (userId: string, handle: string) => Promise<void>;
  updateAvatar: (userId: string, url: string, type: "upload" | "preset") => Promise<void>;
  uploadAvatar: (userId: string, file: File) => Promise<void>;
  checkUsernameAvailable: (handle: string, excludeUserId?: string) => Promise<boolean>;
  clearError: () => void;
  clear: () => void;
}

function defaultHandle(userId: string): string {
  const suffix = userId.replace(/-/g, "").slice(0, 8);
  return `user_${suffix}`;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  hydrate: async (userId, email) => {
    if (!userId) {
      set({ profile: null, loading: false, error: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      let profile = await fetchProfile(userId);
      if (!profile) {
        const handle = defaultHandle(userId);
        profile = await upsertProfile(userId, { username_handle: handle });
      }
      set({ profile, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load profile",
        loading: false,
      });
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

  clearError: () => set({ error: null }),

  clear: () => set({ profile: null, loading: false, error: null }),
}));

export const useProfile = () => useProfileStore((s) => s.profile);
export const useProfileLoading = () => useProfileStore((s) => s.loading);
export const useProfileError = () => useProfileStore((s) => s.error);
