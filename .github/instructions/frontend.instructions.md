---
applyTo: "frontend/src/**/*.ts,frontend/src/**/*.tsx"
---

# Frontend Implementation Rules

## Read these BEFORE writing any code
1. `Context/FRONTEND_PLAN.MD` — component locations, store shape, naming conventions
2. `Context/memory/MEMORY.md` — past architectural decisions to respect
3. The relevant feature file in `Context/features/` if one exists for this task

## Write `Context/memory/task_plan.md` before touching source files
Format:
```
## Task: [name]
### Files I will change: [list]
### Files I will NOT change: [list]
### Approach: [2-3 sentences]
```

## Hard rules for this codebase
- All React Flow components **must** have `"use client"` and `"use no memo"` at the top
- Dark mode: use `@custom-variant dark (&:where(.dark, .dark *))` — never `isDark` JS checks
- Tailwind v4: postfix modifier syntax `bg-white!` not `!bg-white`
- Zustand: use `useWorkflowStore.getState()` inside callbacks to avoid stale closures
- Handles: every node with multiple handles needs unique `id` props (`t-top`, `s-top`, etc.)
- Never add `zIndex: -1` to nodes — use `pointer-events-none` on content divs instead
- `EdgeLabelRenderer` for all HTML on edges — never `foreignObject`
- No emojis in production UI — use Lucide icons instead

## After all changes
- Run `npx tsc --noEmit` — zero errors required before finishing
- Update `Context/memory/logs_agent/YYYY-MM-DD.md` with what was changed
