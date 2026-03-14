---
description: Frontend implementation with mandatory pre/post steps. Enforces Neurovn's React/Next.js/Zustand/Tailwind conventions. Use when the user mentions frontend, React, TSX, component, UI, CSS, Tailwind, Zustand, store, canvas, node, or any frontend file path.
---

# Frontend Implementation Workflow

Implement frontend changes following Neurovn's architecture conventions. Enforces mandatory context loading, task planning, and verification steps.

---

## Step 1 -- Read before writing any code

Use `view_file` to read:
1. `Context/FRONTEND_PLAN.MD` -- component locations, store shape, naming conventions
2. `Context/memory/MEMORY.md` -- past architectural decisions to respect
3. The relevant feature file in `Context/features/` if one exists for this task

## Step 2 -- Write task plan

Use `write_to_file` (or `replace_file_content`) to create/update `Context/memory/task_plan.md` before touching source files:

```
## Task: [name]
### Files I will change: [list]
### Files I will NOT change: [list]
### Approach: [2-3 sentences]
```

## Step 3 -- Hard rules for this codebase

Follow these rules strictly during implementation:

- All React Flow components **must** have `"use client"` and `"use no memo"` at the top
- Dark mode: use `.dark` class -- never `prefers-color-scheme` or `isDark` JS checks
- Tailwind v4: postfix modifier syntax `bg-white!` not `!bg-white`
- Zustand: use `useWorkflowStore.getState()` inside callbacks to avoid stale closures
- Handles: every node with multiple handles needs unique `id` props (`t-top`, `s-top`, `t-right`, `s-right`, `t-bottom`, `s-bottom`, `t-left`, `s-left`)
- Never add `zIndex: -1` to nodes -- use `pointer-events-none` on content divs instead
- `EdgeLabelRenderer` for all HTML on edges -- never `foreignObject`
- No emojis in production UI -- use Lucide icons instead
- Use `find_by_name` to check `src/components/` for existing components before creating new files
- New UI primitives go in `src/components/ui/`; feature components go in `src/components/`

## Step 4 -- Implement

Execute the changes following the task plan and hard rules above.

Use `replace_file_content` or `multi_replace_file_content` for edits to existing files.
Use `write_to_file` for new files.

## Step 5 -- Verify

Use `run_command` to execute:
- `cd frontend && npx tsc --noEmit` -- zero errors required
- Confirm the changes match the task plan

## Step 5.5 -- Mobile Compatibility Gate (Auto-triggered)

> This step is mandatory for any UI change. Read and follow `.antigravity/rules/post-ui-mobile-audit.md`.

If the changes involved UI components (`.tsx` files in `src/components/`, `src/app/`, or layout changes):
1. Run the quick mobile audit checklist from the rule
2. Fix any responsive issues found
3. Re-run `npx tsc --noEmit` if fixes were applied
4. For major UI changes (new components, layout overhauls), run the full `.antigravity/workflows/mobile-compat.md` workflow

## Step 6 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Frontend: [short title] -- [HH:MM]
**Agent:** Antigravity -- Frontend implementation
**Files changed:** [list]
**Notes:** [anything non-obvious]
```
