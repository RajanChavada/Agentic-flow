---
description: Auto-applied on every Antigravity session start. Reads UI conventions, coding standards, and project context before any work begins. This is the bootstrap rule -- it ensures the agent never starts blind.
---

# Session Bootstrap Rule

> This rule runs automatically when Antigravity is instantiated with `Agent.md`.
> It ensures UI conventions, coding standards, and project state are loaded before any code is touched.

## On Session Start (Before Any Work)

### 1. Read Agent Configuration
Read `.antigravity/Agent.md` for:
- Hard rules (Tailwind v4, dark mode, React Flow, Zustand conventions)
- Verification commands
- Intent routing table
- Tool mapping

### 2. Read UI & Coding Conventions
Read these files in order using `view_file`:

```
Priority 1 (ALWAYS read):
├── Context/FRONTEND_PLAN.MD          -- UI component locations, store shape, naming conventions
├── Context/memory/MEMORY.md          -- stable architectural facts, file map
└── Context/memory/SOUL_SWE.md        -- hard behavioral rules and constraints

Priority 2 (read if task involves backend):
└── Context/BACKEND_PLAN.md           -- API patterns, Pydantic models, endpoint conventions

Priority 3 (read for context on recent work):
├── Context/memory/AGENT_MEMORY.md    -- past decisions, lessons, gotchas
└── Context/memory/logs_agent/        -- find and read the most recent daily log
```

### 3. Check for In-Progress Work
Read `Context/memory/task_plan.md` to check if there is an unfinished task from a previous session. If one exists, inform the user before starting new work.

### 4. Identify UI Component Inventory
Use `find_by_name` to scan the current component tree:
```
frontend/src/components/       -- feature components
frontend/src/components/ui/    -- design system primitives
frontend/src/components/nodes/ -- React Flow node types
frontend/src/components/edges/ -- React Flow edge types
frontend/src/hooks/            -- custom hooks
frontend/src/store/            -- Zustand store
```

This prevents creating duplicate components -- always check for existing ones before creating new files.

---

## UI Convention Quick Reference (Loaded Into Memory)

These conventions must be followed on every UI change:

### Component Rules
- React Flow nodes: `"use client"` + `"use no memo"` at top of file
- No emojis in production UI -- Lucide icons or CSS shapes only
- Check `src/components/` for existing components before creating new files
- New UI primitives: `src/components/ui/`
- New feature components: `src/components/`
- New landing components: `src/components/landing/`

### Styling Rules
- Tailwind v4 postfix syntax: `bg-white!` not `!bg-white`
- `shrink-0` not `flex-shrink-0`
- Dark mode: `.dark` class on `<html>` -- NEVER `prefers-color-scheme`
- Mobile-first responsive: base classes for xs, add `sm:`, `md:`, `lg:` for larger

### State Management
- One store: `useWorkflowStore.ts`
- Exported selector hooks only -- never subscribe to the whole store
- `getState()` inside callbacks to avoid stale closures

### React Flow
- Unique handle IDs: `t-top`, `s-top`, `t-right`, `s-right`, `t-bottom`, `s-bottom`, `t-left`, `s-left`
- Never `zIndex: -1` on nodes -- use `pointer-events-none`
- `EdgeLabelRenderer` for edge HTML -- never `foreignObject`

### TypeScript
- Strict mode; no implicit `any`
- New types in `src/types/workflow.ts`

---

## Verification (After Any Change)

Always run before declaring work complete:
- Frontend: `cd frontend && npx tsc --noEmit` -- zero errors
- Backend: `cd backend && python -c "from main import app"` -- clean import
