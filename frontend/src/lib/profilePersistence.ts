/**
 * Profile persistence — fetch, upsert, and avatar upload.
 * Uses Supabase profiles table and avatars storage bucket.
 */

import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/profile";

function formatSupabaseError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string; details?: string };
    const parts = [e.message, e.code, e.details].filter(Boolean);
    return parts.length > 0 ? parts.join(" | ") : JSON.stringify(err);
  }
  return String(err);
}

/** Thrown by upsertProfile; preserves Supabase error code for user-friendly messages. */
export class ProfileError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username_handle, display_name, bio, location, website, avatar_url, avatar_type, created_at, updated_at"
    )
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    console.error("fetchProfile error:", formatSupabaseError(error));
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    username_handle: data.username_handle,
    display_name: data.display_name ?? null,
    bio: data.bio ?? null,
    location: data.location ?? null,
    website: data.website ?? null,
    avatar_url: data.avatar_url ?? null,
    avatar_type: data.avatar_type as Profile["avatar_type"],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export type UpsertProfileData = {
  username_handle?: string;
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  avatar_url?: string | null;
  avatar_type?: "upload" | "preset" | null;
};

function defaultHandle(userId: string): string {
  const suffix = userId.replace(/-/g, "").slice(0, 8);
  return `user_${suffix}`;
}

export async function upsertProfile(
  userId: string,
  data: UpsertProfileData
): Promise<Profile> {
  const hasUsername = data.username_handle != null && data.username_handle !== "";

  if (hasUsername) {
    const { data: row, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          ...data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select(
        "id, username_handle, display_name, bio, location, website, avatar_url, avatar_type, created_at, updated_at"
      )
      .single();

    if (error)
      throw new ProfileError(formatSupabaseError(error), (error as { code?: string }).code);

    return {
      id: row.id,
      username_handle: row.username_handle,
      display_name: row.display_name ?? null,
      bio: row.bio ?? null,
      location: row.location ?? null,
      website: row.website ?? null,
      avatar_url: row.avatar_url ?? null,
      avatar_type: row.avatar_type as Profile["avatar_type"],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  const existing = await fetchProfile(userId);
  const payload = {
    display_name: data.display_name,
    bio: data.bio,
    location: data.location,
    website: data.website,
    avatar_url: data.avatar_url,
    avatar_type: data.avatar_type,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data: row, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select(
        "id, username_handle, display_name, bio, location, website, avatar_url, avatar_type, created_at, updated_at"
      )
      .single();

    if (error)
      throw new ProfileError(formatSupabaseError(error), (error as { code?: string }).code);

    return {
      id: row.id,
      username_handle: row.username_handle,
      display_name: row.display_name ?? null,
      bio: row.bio ?? null,
      location: row.location ?? null,
      website: row.website ?? null,
      avatar_url: row.avatar_url ?? null,
      avatar_type: row.avatar_type as Profile["avatar_type"],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username_handle: defaultHandle(userId),
      ...payload,
    })
    .select(
      "id, username_handle, display_name, bio, location, website, avatar_url, avatar_type, created_at, updated_at"
    )
    .single();

  if (error)
    throw new ProfileError(formatSupabaseError(error), (error as { code?: string }).code);

  return {
    id: row.id,
    username_handle: row.username_handle,
    display_name: row.display_name ?? null,
    bio: row.bio ?? null,
    location: row.location ?? null,
    website: row.website ?? null,
    avatar_url: row.avatar_url ?? null,
    avatar_type: row.avatar_type as Profile["avatar_type"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const ALLOWED_EXT = ["jpg", "jpeg", "png", "gif", "webp"];

function getExt(file: File): string {
  const name = file.name.toLowerCase();
  const ext = name.split(".").pop() ?? "png";
  return ALLOWED_EXT.includes(ext) ? ext : "png";
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = getExt(file);
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function checkUsernameAvailable(
  handle: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase
    .from("profiles")
    .select("id")
    .ilike("username_handle", handle);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("checkUsernameAvailable error:", formatSupabaseError(error));
    return false;
  }

  return data === null;
}
