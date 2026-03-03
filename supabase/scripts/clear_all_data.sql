-- Clear all user data from Supabase (workflows, scenarios, user_preferences)
-- Run in Supabase Dashboard: SQL Editor > New Query
-- Requires service role or bypass RLS (run as postgres/superuser)

-- Order matters: delete child tables before parent (FK constraints)
-- user_preferences references workflows via active_workflow_id
-- scenarios references workflows via workflow_id

DELETE FROM public.user_preferences;
DELETE FROM public.scenarios;
DELETE FROM public.workflows;

-- Optional: reset sequences if you use serials (this project uses uuid, so not needed)
-- SELECT 'Cleared workflows, scenarios, user_preferences' AS result;
