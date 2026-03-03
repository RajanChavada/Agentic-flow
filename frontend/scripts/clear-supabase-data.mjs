#!/usr/bin/env node
/**
 * Clear all data from workflows, scenarios, user_preferences.
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 *
 * Run from frontend/: node scripts/clear-supabase-data.mjs
 * Ensure .env.local has: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xizuzffxeknsbeljaqyk.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY required. Get it from Supabase Dashboard → Settings → API.");
  console.error("   Run: SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/clear-supabase-data.mjs");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function clear() {
  try {
    // Order: child tables first (user_preferences, scenarios) then workflows
    const { error: e1 } = await supabase.from("user_preferences").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    const { error: e2 } = await supabase.from("scenarios").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: e3 } = await supabase.from("workflows").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (e1) {
      console.error("user_preferences:", e1.message);
      throw e1;
    }
    if (e2) {
      console.error("scenarios:", e2.message);
      throw e2;
    }
    if (e3) {
      console.error("workflows:", e3.message);
      throw e3;
    }
    console.log("✅ Cleared user_preferences, scenarios, workflows");
  } catch (err) {
    console.error("Error:", err?.message || err);
    console.error("\nRun manually in Supabase SQL Editor:");
    console.error("  DELETE FROM public.user_preferences;");
    console.error("  DELETE FROM public.scenarios;");
    console.error("  DELETE FROM public.workflows;");
    process.exit(1);
  }
}

clear();
