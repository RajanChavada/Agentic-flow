# Rule Registry

Maps programmer intent to Cursor rules, Context docs, and feature files. Use this to select what to load when orchestrating a task.

## Paths Overview

| Location | Purpose |
|----------|---------|
| `.cursor/rules/*.mdc` | Cursor rules — when to apply, what to do |
| `Context/` | Product context, plans, roadmap |
| `Context/features/` | Feature specs (Context team) |
| `.ai/context/features/` | Feature specs (AI-generated) |
| `Context/memory/` | Agent memory, logs, task plans |

---

## Cursor Rules (`.cursor/rules/`)

| Rule | File | When to apply |
|------|------|---------------|
| feature-roadmap | `feature-roadmap.mdc` | Roadmap, plan, design new feature. Creates feature .md, delegates frontend/backend. |
| bug-fix | `bug-fix.mdc` | Diagnose and fix a bug. Root-cause-first, no patch-over-patch. |
| frontend-impl | `frontend-impl.mdc` | Editing `frontend/src/**/*.{ts,tsx}`. Enforces architecture, Tailwind v4, task_plan. |
| backend-impl | `backend-impl.mdc` | Editing `backend/**/*.py`. FastAPI, Pydantic, registries. |
| new-node-type | `new-node-type.mdc` | Adding a new node type to the canvas. All 8 files. |
| canvas-workflow-layout | `canvas-workflow-layout.mdc` | Adding features that load workflows onto the canvas. Always preformat with dagre layout via `needsLayout`. |
| supabase-db | `supabase-db.mdc` | Supabase, migrations, `frontend/src/lib/supabase*`, `supabase/**/*`. |
| log-update | `log-update.mdc` | After EVERY completed task. Append to logs, optionally AGENT_MEMORY. |
| min-lovable-product | `min-lovable-product.mdc` | UX, lovability, delight. MLP over MVP. (Often always-applied.) |

---

## Context Documents (`Context/`)

| File | When to load |
|------|--------------|
| `Context/CONTEXT.md` | Big picture, product goals, roadmap summary. Load for features, planning. |
| `Context/FEATURE_ROADMAP.md` | Existing roadmap. Load before creating features to avoid duplication. |
| `Context/FRONTEND_PLAN.MD` | Component locations, store shape, naming. Load for frontend work. |
| `Context/BACKEND_PLAN.md` | API patterns, endpoints. Load for backend work. |
| `Context/supabase.md` | Schema, tables, RLS. Load for DB/Supabase work. (Create if missing.) |

---

## Feature Files

| Location | When to load |
|----------|--------------|
| `Context/features/*.md` | When a feature spec exists for the task. Check FEATURE_ROADMAP for names. |
| `.ai/context/features/*.md` | Same. Some features live here. Check both directories. |

**Naming:** `[kebab-case-name].md` (e.g. `canvas-workflow-names-and-thumbnails.md`).

---

## Memory (`Context/memory/`)

| File | When to load |
|------|--------------|
| `Context/memory/AGENT_MEMORY.md` | Past decisions, lessons. Load for bugs, non-obvious choices. |
| `Context/memory/logs_agent/YYYY-MM-DD.md` | Daily agent logs. Load for recent changes, bug context. |
| `Context/memory/task_plan.md` | Current task plan. **Create** before frontend edits (per frontend-impl). |
| `Context/memory/MEMORY.md` | Past architectural decisions. (Create if missing; backend-impl references it.) |

---

## Intent → Load Order

### Feature / roadmap / plan
1. `Context/CONTEXT.md`
2. `Context/FEATURE_ROADMAP.md`
3. `Context/FRONTEND_PLAN.MD`, `Context/BACKEND_PLAN.md` (as needed)
4. `.cursor/rules/feature-roadmap.mdc`
5. Existing feature file from `Context/features/` or `.ai/context/features/` if one matches

### Bug fix
1. `.cursor/rules/bug-fix.mdc`
2. `Context/memory/AGENT_MEMORY.md`
3. `Context/memory/logs_agent/` (recent logs)
4. Source files implicated by the bug

### Frontend edit
1. `.cursor/rules/frontend-impl.mdc`
2. `Context/FRONTEND_PLAN.MD`
3. `Context/memory/AGENT_MEMORY.md` (if exists)
4. Feature file in `Context/features/` or `.ai/context/features/` if one exists
5. **Create** `Context/memory/task_plan.md` before editing
6. Target source files (components, hooks, stores)

### Backend edit
1. `.cursor/rules/backend-impl.mdc`
2. `Context/BACKEND_PLAN.md`
3. `Context/memory/MEMORY.md` or `AGENT_MEMORY.md` (if exists)
4. `Context/supabase.md` if DB-related
5. Target source files

### New node type
1. `.cursor/rules/new-node-type.mdc`
2. All 8 files listed in the rule (read before editing)

### Canvas workflow load (import, template, pull, etc.)
1. `.cursor/rules/canvas-workflow-layout.mdc`
2. `frontend/src/store/useWorkflowStore.ts` — set `needsLayout: true` in the load action
3. `frontend/src/hooks/useAutoLayout.ts` — layout logic
4. `frontend/src/app/editor/[canvasId]/page.tsx` — layout effect

### Share workflow / share canvas
1. `.ai/context/features/workflow-share-links.md`
2. `frontend/src/lib/shareWorkflows.ts` — createShare, getShareByToken, copyWorkflowToCanvas
3. `frontend/src/components/ShareWorkflowModal.tsx`
4. `Context/supabase.md` — workflow_shares schema

### Database / Supabase
1. `.cursor/rules/supabase-db.mdc`
2. `Context/supabase.md`
3. `supabase/migrations/` (existing migrations)
4. `frontend/src/types/supabase.ts` if types change

### After any task
1. `.cursor/rules/log-update.mdc`
2. Append to `Context/memory/logs_agent/YYYY-MM-DD.md`
3. Optionally `Context/memory/AGENT_MEMORY.md` for non-obvious decisions

---

## Source Files to Include

When the intent involves specific components, hooks, or modules, **explicitly read** them:

- **HeaderBar, Sidebar, Canvas** → `frontend/src/components/HeaderBar.tsx`, etc.
- **Store** → `frontend/src/store/useWorkflowStore.ts`
- **Types** → `frontend/src/types/workflow.ts`
- **API** → `backend/main.py`, `backend/models.py`
- **Supabase** → `frontend/src/lib/supabase.ts`

Do not assume these are in context. Load them as part of Step 3 (Load Context Proactively).
