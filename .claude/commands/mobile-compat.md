---
name: mobile-compat
description: Mobile compatibility audit and translation. Converts UI changes to mobile-responsive implementations, runs QA validation, and ensures production-ready transferability. Use when making mobile, responsive, breakpoint, or touch-friendly changes.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - AskUserQuestion
---
<objective>
Audit, translate, and verify UI changes for mobile compatibility. This skill scans recent or specified frontend changes, identifies mobile responsiveness gaps, applies Tailwind v4 responsive utilities following Neurovn conventions, runs QA validation (visual + functional), and ensures production-grade code transferability.
</objective>

<context>
$ARGUMENTS
</context>

<process>

## Step 0 -- Load Context (Mandatory)

Read these files before any analysis:
1. `Context/FRONTEND_PLAN.MD` -- component locations, layout system, responsive patterns
2. `Context/memory/MEMORY.md` -- past architectural decisions, mobile-related fixes
3. `Context/memory/AGENT_MEMORY.md` -- prior mobile decisions, breakpoint gotchas
4. `Context/testing/conventions.md` -- testing frameworks, QA patterns
5. `frontend/src/hooks/useBreakpoint.ts` -- breakpoint definitions (xs/sm/md/lg/xl)
6. The source file(s) to audit -- always read before modifying

Do not skip this step. Do not assume any of these files are already in context.

## Step 1 -- Identify Scope

Determine what needs mobile translation:

| Field | What to capture |
|-------|-----------------|
| **Target** | Specific files, recent changes, or entire feature area |
| **Change type** | New feature, existing component fix, layout overhaul, or full audit |
| **Breakpoints** | Which breakpoints need attention (xs, sm, md, lg, xl) |
| **Touch targets** | Whether interactive elements need touch-size validation (min 44x44px) |
| **Orientation** | Portrait-only, landscape-only, or both |

If the user did not specify files, scan recent git changes:
```bash
git diff --name-only HEAD~3 -- 'frontend/src/**/*.tsx' 'frontend/src/**/*.ts'
```

Write a scope summary (3-5 lines) before proceeding.

## Step 2 -- Mobile Audit

For each file in scope, check against this mobile compatibility checklist:

### Layout
- [ ] Uses responsive Tailwind classes (`sm:`, `md:`, `lg:`) -- not fixed widths
- [ ] Flex/grid layouts have mobile-first fallbacks (`flex-col` then `md:flex-row`)
- [ ] No horizontal overflow on xs/sm screens (max-w-full, overflow-x-hidden where needed)
- [ ] Fixed/sticky elements do not obscure content on small viewports
- [ ] Modals and overlays are fullscreen or properly constrained on mobile

### Typography & Spacing
- [ ] Font sizes scale down for mobile (`text-sm` or `text-base` at xs, scaling up at md+)
- [ ] Padding/margins use responsive values where needed (`p-3 md:p-6`)
- [ ] Line lengths are readable on narrow screens (no unconstrained `max-w-none`)

### Interactive Elements
- [ ] Touch targets are minimum 44x44px (`min-h-11 min-w-11` or `p-3` on buttons)
- [ ] Hover-only interactions have touch alternatives (no `hover:` without `active:` or `focus:`)
- [ ] Dropdowns/popovers position correctly on small screens (no off-screen overflow)
- [ ] Swipe/scroll areas have proper touch momentum (`overflow-auto` with `-webkit-overflow-scrolling: touch`)

### Neurovn-Specific
- [ ] Uses `useIsMobile()` or `useBreakpoint()` hook where JS-level breakpoint logic is needed
- [ ] React Flow canvas: `fitView()` called on mobile, minimap hidden on xs/sm
- [ ] Sidebar: collapsed by default on mobile, opens as overlay
- [ ] EstimatePanel: adapts to bottom sheet or fullscreen on mobile
- [ ] No emojis -- Lucide icons with appropriate mobile sizing

Record audit findings as a structured list of issues with severity (critical / warning / suggestion).

## Step 3 -- Research Best Practices

Use `WebFetch` to research current mobile patterns relevant to the scope:

| When translating... | Query topic |
|---------------------|-------------|
| React Flow canvas | react flow xyflow mobile touch responsive canvas 2024 2025 |
| Sidebar navigation | responsive sidebar mobile overlay react tailwind pattern |
| Data tables/grids | responsive data table mobile tailwind card layout pattern |
| Modals/dialogs | mobile fullscreen modal bottom sheet react tailwind |
| Charts (Recharts) | recharts responsive mobile chart resize container |
| Form inputs | mobile form input touch target accessibility tailwind |

Extract actionable patterns. Skip this step if the scope is narrow and patterns are well-established.

## Step 4 -- Write Translation Plan

Create `Context/memory/task_plan.md` with the mobile translation plan:

```
## Mobile Compatibility: [scope description]
### Audit summary: [N] issues found ([critical] critical, [warning] warnings, [suggestion] suggestions)
### Files to modify:
- [file] -- [what changes]
### Approach:
- [2-3 sentences on overall strategy]
### Breakpoint strategy:
- xs/sm: [layout approach]
- md: [layout approach]
- lg+: [layout approach -- usually unchanged]
### Do NOT change:
- [files/features that should remain untouched]
```

## Step 5 -- Implement Mobile Translations

Apply changes following these hard rules:

### Tailwind v4 Mobile Conventions
- Mobile-first: base classes are for xs, add `sm:`, `md:`, `lg:` for larger screens
- Postfix modifiers: `bg-white!` not `!bg-white`
- Use `shrink-0` not `flex-shrink-0`
- Dark mode: `.dark` class only -- never `prefers-color-scheme`
- No emojis in production UI

### Responsive Pattern Library
```
// Hide on mobile, show on desktop
className="hidden md:block"

// Stack on mobile, row on desktop
className="flex flex-col md:flex-row"

// Full width on mobile, constrained on desktop
className="w-full md:w-auto md:max-w-md"

// Touch-friendly button
className="min-h-11 min-w-11 p-3 md:p-2"

// Responsive text
className="text-sm md:text-base lg:text-lg"

// Mobile overlay sidebar
className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto"

// Bottom sheet on mobile
className="fixed bottom-0 inset-x-0 rounded-t-2xl md:relative md:rounded-lg"
```

### JS-Level Breakpoint Usage
```typescript
import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";

// Use for conditional rendering logic
const isMobile = useIsMobile();

// Use for React Flow options
const flowOptions = isMobile
  ? { panOnDrag: true, zoomOnPinch: true, preventScrolling: false }
  : { panOnDrag: true, zoomOnScroll: true };
```

### Production Transferability Rules
- All responsive classes must work without JS -- CSS-only breakpoints for layout
- Use `useIsMobile()` only for JS-dependent logic (event handlers, React Flow config, conditional rendering of entirely different components)
- Never use `window.innerWidth` directly in components -- use the `useBreakpoint` hook
- Ensure SSR compatibility -- `useBreakpoint` defaults to `"lg"` on server
- No inline styles for responsive behavior -- Tailwind classes only

## Step 6 -- QA Validation

Run the QA agent's verification checklist adapted for mobile:

### Automated Checks
1. Type check: `cd frontend && npx tsc --noEmit` -- zero errors required
2. Build check: `cd frontend && npm run build` -- verify no build errors
3. Lint check: `cd frontend && npm run lint` (if configured)

### Visual QA Checklist (Manual -- present to user)
Produce a checklist for the user to verify in browser DevTools (responsive mode):

```
## Mobile QA Checklist -- [component/feature name]

### iPhone SE (375px)
- [ ] No horizontal scroll
- [ ] All text readable without zooming
- [ ] Touch targets >= 44px
- [ ] Modals/overlays fullscreen or properly sized
- [ ] Navigation accessible

### iPhone 14 Pro (393px)
- [ ] Layout matches iPhone SE with minor spacing differences
- [ ] Safe area insets respected (if applicable)

### iPad Mini (768px)
- [ ] Tablet layout activates (md: breakpoint)
- [ ] Sidebar behavior correct (collapsed or visible)
- [ ] Canvas/React Flow usable with touch

### iPad Pro (1024px)
- [ ] Desktop-like layout begins (lg: breakpoint)
- [ ] All features accessible

### Cross-cutting
- [ ] Dark mode works at all breakpoints
- [ ] Orientation change (portrait <-> landscape) does not break layout
- [ ] No content hidden behind fixed headers/footers
```

### Regression Testing
If test files exist for the modified components, run them:
```bash
cd frontend && npx vitest run --reporter=verbose [test-file-pattern]
```

If no tests exist, note the gap and suggest test cases in the log.

## Step 7 -- Production Transferability Report

Summarize the mobile translation for handoff:

```
## Mobile Compatibility Report

### Changes Applied
| File | Change | Breakpoints Affected |
|------|--------|---------------------|
| [file] | [description] | xs, sm, md |

### Patterns Used
- [list responsive patterns applied]

### QA Status
- Type check: PASS/FAIL
- Build: PASS/FAIL
- Visual QA: [checklist provided to user]
- Regression tests: PASS/FAIL/NONE

### Known Limitations
- [any mobile edge cases not addressed]

### Recommended Follow-ups
- [ ] [additional mobile work needed]
```

## Step 8 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Mobile Compat: [short title] -- [HH:MM]
**Agent:** Mobile compatibility audit & translation
**Files changed:** [list]
**Audit results:** [N] issues found, [M] fixed
**QA status:** tsc [PASS/FAIL], build [PASS/FAIL], visual checklist [provided/skipped]
**Notes:** [anything non-obvious]
```

Update `Context/memory/AGENT_MEMORY.md` if non-obvious mobile decisions were made (new breakpoint patterns, React Flow mobile config, etc.).

</process>
