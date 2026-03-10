# Neurovn -- Claude Code Project Context

> Read this file at the start of every session. It is the single source of truth for project conventions when working in Claude Code.

## Project overview

Neurovn is a **monorepo** with two independent services:

| Layer | Path | Stack | Dev server |
|-------|------|-------|------------|
| Frontend | `frontend/` | Next.js (App Router), React 19, TypeScript, React Flow (`@xyflow/react`), Zustand, Tailwind CSS v4, Recharts | `npm run dev` on `:3000` |
| Backend | `backend/` | Python 3.11+, FastAPI, Pydantic v2, tiktoken, Uvicorn | `python main.py` on `:8000` |

The frontend is a canvas-based workflow designer; the backend estimates token cost and latency for AI workflows.

## Architecture

```
User drags nodes -> Zustand store -> React Flow canvas
                 |
  "Get Estimate" -> POST /api/estimate (FastAPI)
                 |
  estimator.py <- graph_analyzer.py + pricing_registry.py
                 |
  WorkflowEstimation JSON -> EstimatePanel (Recharts)
```

## Context documents

Planning docs live in `Context/` -- agents must **read before starting work** and **append updates** to `Context/memory/AGENT_MEMORY.md` after completing tasks.

| File | Purpose |
|------|---------|
| `Context/CONTEXT.md` | High-level project description |
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

## Custom commands

Project-specific slash commands live in `.claude/commands/` alongside GSD commands:

| Command | Purpose |
|---------|---------|
| `/orchestrate` | Parse natural language intent and route to the right context/rules |
| `/feature` | Plan a feature with MLP evaluation, external research, UX analysis, and GSD-ready phases. Use `--quick` to skip research. |
| `/bugfix` | Root-cause-first bug diagnosis and fix workflow |
| `/frontend` | Frontend implementation with mandatory pre/post steps |
| `/backend` | Backend implementation with FastAPI/Pydantic patterns |
| `/qa` | QA and test automation -- researches via Exa, then designs and implements tests |
| `/mobile-compat` | Mobile compatibility audit, translation, QA validation, and production transferability |

GSD commands are in `.claude/commands/gsd/` -- use `/gsd:help` for the full list.

## IDE portability

This repo supports multiple AI-assisted IDEs. Skills are defined once and mirrored:

| IDE | Skill location | Invocation |
|-----|---------------|------------|
| Claude Code | `.claude/commands/*.md` | `/command-name` |
| Cursor | `.cursor/skills/*/SKILL.md` + `.cursor/rules/*.mdc` | Auto-triggered by description matching |
| Copilot / VS Code | `.github/instructions/*.instructions.md` | Auto-attached via `applyTo` globs |

See `Context/ide-portability.md` for the full mapping.

## Hard rules

- No emojis in production UI -- use Lucide icons or CSS shapes
- Tailwind v4 syntax: `bg-white!` not `!bg-white`; `shrink-0` not `flex-shrink-0`
- Dark mode: use `.dark` class on `<html>` -- never `prefers-color-scheme`
- React Flow nodes: `"use client"` + `"use no memo"` at top; unique handle IDs
- Zustand: use `getState()` inside callbacks to avoid stale closures
- Never add `zIndex: -1` to nodes -- use `pointer-events-none`
- Run `npx tsc --noEmit` before declaring frontend tasks complete
- Run `python -c "from main import app"` before declaring backend tasks complete
- Append to `Context/memory/logs_agent/YYYY-MM-DD.md` after every completed task
- Update `Context/memory/AGENT_MEMORY.md` for non-obvious decisions

## Frontend conventions

- **State**: one Zustand store (`src/store/useWorkflowStore.ts`). Use exported selector hooks -- never subscribe to the whole store.
- **Custom nodes**: in `src/components/nodes/`. Wrap in `React.memo`, register in `nodeTypes` map in `Canvas.tsx`.
- **Node types**: `startNode | agentNode | toolNode | finishNode | blankBoxNode | textNode`
- **Drag-and-drop**: HTML5 `dataTransfer` with keys `application/reactflow-type` and `application/reactflow-label`
- **Styling**: Tailwind utility classes only -- no CSS modules. shadcn/ui for design system primitives.
- **New components**: check `src/components/` for existing components before creating new files.

## Backend conventions

- `main.py` -- FastAPI app, CORS, route handlers only
- `models.py` -- Pydantic request/response schemas
- `estimator.py` -- token counting (tiktoken), cost math, latency math
- `graph_analyzer.py` -- adjacency list, Tarjan SCC, topological sort
- `pricing_data.py` / `pricing_registry.py` -- model pricing; key format `"Provider_Model"`
- `tool_registry.py` -- tool definitions; JSON-backed
- Data lives in `backend/data/*.json` -- never hardcode pricing or tool data in Python
- New Pydantic models go in `models.py`, new endpoints go in `main.py`

## Testing conventions

- Frontend: Vitest + React Testing Library. Tests in `__tests__/` colocated dirs.
- Backend: pytest. Tests in `backend/tests/`.
- E2E (future): Playwright. Tests in `frontend/e2e/`.
- See `Context/testing/conventions.md` for full details.

## Before starting any task

| Task type | Files to read first |
|-----------|-------------------|
| Feature / planning | `Context/CONTEXT.md`, `Context/FEATURE_ROADMAP.md`, relevant plan docs |
| Frontend edit | `Context/FRONTEND_PLAN.MD`, `Context/memory/MEMORY.md`, feature file if exists |
| Backend edit | `Context/BACKEND_PLAN.md`, `Context/memory/MEMORY.md` |
| Database / Supabase | `Context/supabase.md` |
| Bug fix | `Context/memory/AGENT_MEMORY.md`, recent logs in `Context/memory/logs_agent/` |
| QA / testing | `Context/testing/conventions.md`, source files under test |
| Mobile compatibility | `Context/FRONTEND_PLAN.MD`, `frontend/src/hooks/useBreakpoint.ts`, `Context/memory/MEMORY.md` |

Write `Context/memory/task_plan.md` before editing frontend source files.
