/**
 * Supabase browser client singleton.
 *
 * Uses the publishable API key – all data access is gated by RLS policies
 * that check `auth.uid() = user_id`.
 *
 * If the env vars are not yet configured (placeholder values), the client
 * is still created to avoid import-time crashes — but all calls will fail
 * gracefully at runtime.
 */

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder";

/** True if Supabase is configured with real credentials (not placeholder). */
export const isSupabaseConfigured =
  !SUPABASE_URL.includes("placeholder") && SUPABASE_KEY !== "placeholder";

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "[Supabase] Not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (or Vercel env vars)."
  );
}

/**
 * Single shared Supabase client for the browser.
 * Safe to import from any client component.
 */
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
