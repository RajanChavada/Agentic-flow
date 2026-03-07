---
applyTo: "frontend/src/**/*supabase*,frontend/src/lib/supabase*,supabase/**/*"
---

# Supabase / Database Rules

## Read first
- `Context/supabase.md` — full schema, table names, RLS policies, and column types
  Do not guess table/column names — they are all documented there.

## Rules
- Never write raw SQL strings in component files — use the Supabase JS client typed helpers
- Row-Level Security is enabled — always test with a non-owner user mentally
- Use `supabase.from('table').select(...)` with explicit column lists — never `select('*')` in production paths
- For auth: use `supabase.auth.getUser()` server-side, `useSession()` client-side
- Migrations go in `supabase/migrations/` with timestamp prefix `YYYYMMDDHHMMSS_description.sql`

## When adding a new table or column
1. Update `Context/supabase.md` with the new schema entry
2. Write the migration SQL
3. Update the TypeScript `Database` type in `frontend/src/types/supabase.ts`
