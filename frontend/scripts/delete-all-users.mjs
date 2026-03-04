#!/usr/bin/env node
/**
 * Delete all users from Supabase (auth.users).
 * Cascades to: profiles, canvases, workflows, scenarios, user_preferences.
 * Also clears avatars storage for each user.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (in .env.local or env).
 * Run from frontend/: node scripts/delete-all-users.mjs
 *
 * Usage:
 *   cd frontend && node scripts/delete-all-users.mjs
 * Or with env:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/delete-all-users.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.local if present
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = value;
      }
    });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xizuzffxeknsbeljaqyk.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY required.");
  console.error("   Get it from Supabase Dashboard → Settings → API → service_role key");
  console.error("   Run: cd frontend && SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/delete-all-users.mjs");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function deleteAllUsers() {
  try {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (listError) {
      console.error("❌ Failed to list users:", listError.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log("✅ No users to delete.");
      return;
    }

    console.log(`Found ${users.length} user(s). Deleting...`);

    for (const user of users) {
      // Delete avatars in storage (path: {user_id}/...)
      const { data: files } = await supabase.storage.from("avatars").list(user.id);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from("avatars").remove(paths);
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`  ❌ Failed to delete ${user.email ?? user.id}:`, deleteError.message);
      } else {
        console.log(`  ✓ Deleted ${user.email ?? user.id}`);
      }
    }

    console.log("✅ All users deleted.");
  } catch (err) {
    console.error("Error:", err?.message || err);
    process.exit(1);
  }
}

deleteAllUsers();
