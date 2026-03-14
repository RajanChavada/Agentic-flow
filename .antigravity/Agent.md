# Neurovn -- Antigravity Agent Configuration

> Read this file at the start of every session. It is the single source of truth for Antigravity agent conventions.
> This mirrors the project context from `CLAUDE.md`, conventions from `SOUL_SWE.md`, and workflows from `.claude/commands/` and `.cursor/skills/`.
> After reading this file, read `.antigravity/rules/session-bootstrap.md` to load UI conventions and coding standards.

---

## Project Overview

Neurovn is a **monorepo** with two independent services:

| Layer | Path | Stack | Dev server |
|-------|------|-------|------------|
| Frontend | `frontend/` | Next.js (App Router), React 19, TypeScript, React Flow (`@xyflow/react`), Zustand, Tailwind CSS v4, Recharts | `npm run dev` on `:3000` |
| Backend | `backend/` | Python 3.11+, FastAPI, Pydantic v2, tiktoken, Uvicorn | `python main.py` on `:8000` |

The frontend is a canvas-based workflow designer; the backend estimates token cost and latency for AI workflows.

### Architecture

```
User drags nodes -> Zustand store -> React Flow canvas
                 |
  "Get Estimate" -> POST /api/estimate (FastAPI)
                 |
  estimator.py <- graph_analyzer.py + pricing_registry.py
                 |
  WorkflowEstimation JSON -> EstimatePanel (Recharts)
```

---

## Bootstrap Protocol (Run Every Session)

Before starting any work:

1. Read `Context/memory/MEMORY.md` fully before touching any file
2. Read today's daily log (`Context/memory/logs_agent/YYYY-MM-DD.md`) if it exists
3. Read yesterday's daily log if today's does not yet exist
4. Read `Context/memory/task_plan.md` for any in-progress task context
5. Only then begin working

### Write Protocol (After Every Significant Action)

- After completing a meaningful subtask: append a timestamped entry to today's daily log
- After completing a full task: write an agent update to `Context/memory/AGENT_MEMORY.md`
- When the user says "remember this": route to `MEMORY.md` (stable facts) or `logs_agent/` (events)

---

## Hard Rules

These rules apply to ALL changes, regardless of workflow:

### Code Style
- **No emojis** anywhere in our application (UI, comments, docs, logs, UI text) -- use Lucide icons or CSS shapes if needed visually.
- **TypeScript strict mode**; no implicit `any`
- **Pydantic v2** style models in backend

### Tailwind v4
- **Postfix modifiers**: `bg-white!` not `!bg-white`; `shrink-0` not `flex-shrink-0`
- **Dark mode**: use `.dark` class on `<html>` -- NEVER `prefers-color-scheme`

### React Flow
- All React Flow node components: `"use client"` + `"use no memo"` at top
- Unique handle IDs: `t-top`, `s-top`, `t-right`, `s-right`, `t-bottom`, `s-bottom`, `t-left`, `s-left`
- Never add `zIndex: -1` to nodes -- use `pointer-events-none` on content divs
- `EdgeLabelRenderer` for all HTML on edges -- never `foreignObject`

### Zustand
- One store: `src/store/useWorkflowStore.ts`
- Use exported selector hooks -- never subscribe to the whole store
- Use `getState()` inside callbacks to avoid stale closures

### File Locations
- New Pydantic models: `backend/models.py`
- New API endpoints: `backend/main.py`
- New TypeScript types: `src/types/workflow.ts`
- New UI primitives: `src/components/ui/`
- New feature components: `src/components/`
- New landing page components: `src/components/landing/`

### Data
- Data lives in `backend/data/*.json` -- never hardcode pricing or tool data in Python
- Never build a universal JSON importer -- add specific named adapters in `import_adapters.py`

### Enum Values (Frontend/Backend Must Match)
Do NOT change these strings:
- `task_type`: `classification`, `summarization`, `code_generation`, `rag_answer`, `tool_orchestration`, `routing`
- `expected_output_size`: `short`, `medium`, `long`, `very_long`
- `border_style`: `solid`, `dashed`, `none`

---

## Verification Commands

Always run these before declaring a task complete:

| Task type | Command | Requirement |
|-----------|---------|-------------|
| Frontend | `cd frontend && npx tsc --noEmit` | Zero errors |
| Backend | `cd backend && python -c "from main import app"` | Clean import |
| Frontend tests | `cd frontend && npx vitest run` | All pass |
| Backend tests | `cd backend && python -m pytest tests/ -v` | All pass |

---

## Workflow Registry

Antigravity workflows mirror the skills and commands defined for Claude Code (`.claude/commands/`) and Cursor (`.cursor/skills/`). They are adapted for Antigravity's tool set.

| User Intent | Workflow File | Mirrors |
|-------------|---------------|---------|
| Plan a new feature | `.antigravity/workflows/feature.md` | `/feature` (Claude), `feature-planner` (Cursor) |
| Fix a bug | `.antigravity/workflows/bugfix.md` | `/bugfix` (Claude), `bug-fix` (Cursor) |
| Frontend implementation | `.antigravity/workflows/frontend.md` | `/frontend` (Claude), `frontend-impl` (Cursor) |
| Backend implementation | `.antigravity/workflows/backend.md` | `/backend` (Claude), `backend-impl` (Cursor) |
| Testing / QA | `.antigravity/workflows/qa.md` | `/qa` (Claude), `qa-agent` (Cursor) |
| Mobile compatibility | `.antigravity/workflows/mobile-compat.md` | `/mobile-compat` (Claude), `mobile-compat` (Cursor) |

### Tool Mapping (Antigravity Equivalents)

| Claude Code / Cursor Tool | Antigravity Equivalent |
|---------------------------|----------------------|
| `Glob` | `find_by_name` |
| `Grep` | `grep_search` |
| `Read` | `view_file`, `view_file_outline`, `view_code_item` |
| `Write` / `Edit` | `write_to_file`, `replace_file_content`, `multi_replace_file_content` |
| `Bash` | `run_command` |
| `AskUserQuestion` | `notify_user` |
| `WebFetch` / Exa MCP | `search_web`, `read_url_content` |
| `Task` (subagent) | `browser_subagent` (for browser tasks) |
| Image generation | `generate_image` |

---

## Rules Registry

Rules are automatic behaviors that trigger at specific points. Read the rule file when the trigger condition is met.

| Rule | File | Trigger | Always Apply |
|------|------|---------|-------------|
| **Session Bootstrap** | `.antigravity/rules/session-bootstrap.md` | On session start (after reading Agent.md) | Yes |
| **Post-UI Mobile Audit** | `.antigravity/rules/post-ui-mobile-audit.md` | After any functional UI change is complete | Auto on UI changes |
| **Log Update** | `.antigravity/rules/log-update.md` | After every completed task | Yes |
| **MLP (Minimum Lovable Product)** | `.antigravity/rules/min-lovable-product.md` | When planning features or evaluating UX | Yes (mindset) |

### Rule Execution Chain

```
Session Start
  └── [session-bootstrap] Read UI conventions, coding standards, component inventory
  └── [min-lovable-product] Loaded as background mindset
      │
      ▼
Task Execution (e.g. /frontend, /feature)
  └── Implement changes
  └── npx tsc --noEmit ✓
  └── [post-ui-mobile-audit] Auto-triggers if UI files changed
      └── Quick mobile audit (always)
      └── Full mobile-compat workflow (if major UI change)
      └── Re-verify: npx tsc --noEmit ✓
      │
      ▼
Task Complete
  └── [log-update] Append to daily log + optional AGENT_MEMORY
```

---

## Intent Routing (Orchestration)

When the user describes a task in natural language, extract intent and route to the correct workflow:

| User says / implies | Workflow | Context files to load first |
|---------------------|----------|-----------------------------|
| New feature, roadmap, plan, design, spec | `feature.md` | `CONTEXT.md`, `FEATURE_ROADMAP.md`, `FRONTEND_PLAN.MD`, `BACKEND_PLAN.md` |
| Bug, fix, broken, error | `bugfix.md` | `AGENT_MEMORY.md`, `logs_agent/` |
| Frontend, React, TSX, component | `frontend.md` | `FRONTEND_PLAN.MD`, feature file, `task_plan.md` |
| Backend, API, FastAPI, endpoint | `backend.md` | `BACKEND_PLAN.md`, `MEMORY.md` |
| Test, QA, coverage, "write tests" | `qa.md` | `testing/conventions.md`, source files under test |
| Mobile, responsive, breakpoint, touch | `mobile-compat.md` | `FRONTEND_PLAN.MD`, `useBreakpoint.ts`, `MEMORY.md` |
| New node type on canvas | Read `.cursor/rules/new-node-type.mdc` | All 8 files listed in the rule |
| Database, Supabase, migration | Read `Context/supabase.md` | `supabase/migrations/` |

---

## Context Documents Index

### Always Read Before Starting

| Task type | Files to read first |
|-----------|-------------------|
| Feature / planning | `Context/CONTEXT.md`, `Context/FEATURE_ROADMAP.md`, relevant plan docs |
| Frontend edit | `Context/FRONTEND_PLAN.MD`, `Context/memory/MEMORY.md`, feature file if exists |
| Backend edit | `Context/BACKEND_PLAN.md`, `Context/memory/MEMORY.md` |
| Database / Supabase | `Context/supabase.md` |
| Bug fix | `Context/memory/AGENT_MEMORY.md`, recent logs in `Context/memory/logs_agent/` |
| QA / testing | `Context/testing/conventions.md`, source files under test |
| Mobile compatibility | `Context/FRONTEND_PLAN.MD`, `frontend/src/hooks/useBreakpoint.ts`, `Context/memory/MEMORY.md` |

### Context File Quick Reference

| File | Purpose |
|------|---------|
| `Context/CONTEXT.md` | High-level product description |
| `Context/FEATURE_ROADMAP.md` | Feature backlog and milestones |
| `Context/FRONTEND_PLAN.MD` | Frontend architecture, component spec, Zustand store design |
| `Context/BACKEND_PLAN.md` | Backend API spec, estimation logic, pricing strategy |
| `Context/supabase.md` | Database schema, RLS policies |
| `Context/testing/conventions.md` | Testing frameworks, naming, fixture patterns |
| `Context/memory/MEMORY.md` | Stable architectural facts (semantic memory) |
| `Context/memory/AGENT_MEMORY.md` | Project-level decisions and lessons learned |
| `Context/memory/SOUL_SWE.md` | Agent behavioral rules and hard constraints |
| `Context/memory/task_plan.md` | Current task scratchpad |
| `Context/memory/logs_agent/YYYY-MM-DD.md` | Daily agent update logs |

---

## Estimation System Awareness

The estimator uses:
- `tiktoken cl100k_base` for input token counting
- `_TASK_OUTPUT_MULTIPLIERS[task_type][output_size]` for output multiplier (36-entry table)
- `expected_calls_per_run` multiplier for orchestrator agents
- Tarjan SCC for cycle detection -> min/avg/max range computation
- Tool connections (schema injection + response tokens + latency) rolled into agent estimates

When changing estimation logic: always update `MEMORY.md` and the daily log with the change.

---

## Logging Template

After every completed task, append to `Context/memory/logs_agent/YYYY-MM-DD.md`:

```
## [Task Type]: [short title] -- [HH:MM]
**Agent:** [Antigravity -- task type]
**Files changed:** [list]
**Notes:** [anything non-obvious]
```

Update `Context/memory/AGENT_MEMORY.md` for non-obvious decisions with: context, decision, and rationale.

---

## Cross-IDE Portability

This repo supports multiple AI-assisted IDEs. Antigravity is one of them:

| IDE | Skill location | Invocation |
|-----|---------------|------------|
| Claude Code | `.claude/commands/*.md` | `/command-name` |
| Cursor | `.cursor/skills/*/SKILL.md` + `.cursor/rules/*.mdc` | Auto-triggered by description matching |
| Copilot / VS Code | `.github/instructions/*.instructions.md` | Auto-attached via `applyTo` globs |
| **Antigravity** | **`.antigravity/Agent.md` + `.antigravity/workflows/*.md`** | **Workflow files auto-detected; Agent.md read on session start** |

See `Context/ide-portability.md` for the full mapping.

---

*This file should not change often. If you find yourself wanting to edit it, write a note to the human first.*
