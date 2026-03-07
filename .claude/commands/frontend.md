---
name: frontend
description: Frontend implementation with mandatory pre/post steps. Enforces Neurovn's React/Next.js/Zustand/Tailwind conventions.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
Implement frontend changes following Neurovn's architecture conventions. Enforces mandatory context loading, task planning, and verification steps.
</objective>

<context>
$ARGUMENTS
</context>

<process>

## Step 1 -- Read before writing any code

1. `Context/FRONTEND_PLAN.MD` -- component locations, store shape, naming conventions
2. `Context/memory/MEMORY.md` -- past architectural decisions to respect
3. The relevant feature file in `Context/features/` if one exists for this task

## Step 2 -- Write task plan

Create `Context/memory/task_plan.md` before touching source files:

```
## Task: [name]
### Files I will change: [list]
### Files I will NOT change: [list]
### Approach: [2-3 sentences]
```

## Step 3 -- Hard rules for this codebase

- All React Flow components **must** have `"use client"` and `"use no memo"` at the top
- Dark mode: use `.dark` class -- never `prefers-color-scheme` or `isDark` JS checks
- Tailwind v4: postfix modifier syntax `bg-white!` not `!bg-white`
- Zustand: use `useWorkflowStore.getState()` inside callbacks to avoid stale closures
- Handles: every node with multiple handles needs unique `id` props (`t-top`, `s-top`, `t-right`, `s-right`, `t-bottom`, `s-bottom`, `t-left`, `s-left`)
- Never add `zIndex: -1` to nodes -- use `pointer-events-none` on content divs instead
- `EdgeLabelRenderer` for all HTML on edges -- never `foreignObject`
- No emojis in production UI -- use Lucide icons instead
- Check `src/components/` for existing components before creating new files
- New UI primitives go in `src/components/ui/`; feature components go in `src/components/`

## Step 4 -- Implement

Execute the changes following the task plan and hard rules above.

## Step 5 -- Verify

- Run `cd frontend && npx tsc --noEmit` -- zero errors required
- Confirm the changes match the task plan

## Step 6 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Frontend: [short title] -- [HH:MM]
**Agent:** Frontend implementation
**Files changed:** [list]
**Notes:** [anything non-obvious]
```

</process>
