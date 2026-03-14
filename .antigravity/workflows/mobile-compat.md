---
description: Context-aware mobile compatibility agent that audits and translates UI changes for responsive mobile layouts. Use when the user mentions mobile, responsive, mobile compatibility, breakpoints, touch targets, viewport, small screen, phone layout, tablet layout, mobile QA, mobile-first, responsiveness, "make it mobile-friendly", "fix on mobile", "mobile version", or wants to verify a component works on mobile devices.
---

# Mobile Compatibility Workflow

A context-aware mobile compatibility agent that audits, translates, and validates UI changes for responsive mobile behavior. Follows Neurovn's Tailwind v4, React, and breakpoint conventions.

---

## Step 0 -- Load Context (Mandatory)

Use `view_file` to read these files in order:

1. `Context/FRONTEND_PLAN.MD` -- component locations, layout system, responsive patterns
2. `Context/memory/MEMORY.md` -- architecture decisions, mobile-related fixes
3. `Context/memory/AGENT_MEMORY.md` -- prior mobile decisions, breakpoint gotchas
4. `Context/testing/conventions.md` -- testing frameworks, QA patterns
5. `.cursor/skills/mobile-compat/references/mobile-patterns.md` -- responsive pattern library
6. `frontend/src/hooks/useBreakpoint.ts` -- breakpoint definitions (xs/sm/md/lg/xl)
7. The source file(s) to audit -- always read before modifying

Do not skip this step.

---

## Step 1 -- Identify Scope

Parse the user's request and determine:

| Field | What to capture |
|-------|-----------------|
| **Target** | Specific files, recent changes, or entire feature area |
| **Change type** | New feature, existing component fix, layout overhaul, or full audit |
| **Breakpoints** | Which breakpoints need attention (xs, sm, md, lg, xl) |
| **Touch targets** | Whether interactive elements need touch-size validation (min 44x44px) |
| **Orientation** | Portrait-only, landscape-only, or both |

If the user did not specify files, use `run_command` to scan recent git changes:
```bash
git diff --name-only HEAD~3 -- 'frontend/src/**/*.tsx' 'frontend/src/**/*.ts'
```

Write a scope summary (3-5 lines) before proceeding.

---

## Step 2 -- Mobile Audit

For each file in scope, check against this checklist:

### Layout
- [ ] Uses responsive Tailwind classes (`sm:`, `md:`, `lg:`) -- not fixed widths
- [ ] Flex/grid layouts have mobile-first fallbacks (`flex-col` then `md:flex-row`)
- [ ] No horizontal overflow on xs/sm screens
- [ ] Fixed/sticky elements do not obscure content on small viewports
- [ ] Modals and overlays are fullscreen or properly constrained on mobile

### Typography & Spacing
- [ ] Font sizes scale down for mobile (`text-sm` at xs, scaling up at md+)
- [ ] Padding/margins use responsive values (`p-3 md:p-6`)
- [ ] Line lengths are readable on narrow screens

### Interactive Elements
- [ ] Touch targets are minimum 44x44px (`min-h-11 min-w-11`)
- [ ] Hover-only interactions have touch alternatives
- [ ] Dropdowns/popovers position correctly on small screens
- [ ] Scroll areas have proper touch momentum

### Neurovn-Specific
- [ ] Uses `useIsMobile()` or `useBreakpoint()` hook for JS-level breakpoint logic
- [ ] React Flow canvas: `fitView()` on mobile, minimap hidden on xs/sm
- [ ] Sidebar: collapsed by default on mobile, opens as overlay
- [ ] EstimatePanel: adapts to bottom sheet or fullscreen on mobile
- [ ] No emojis -- Lucide icons with appropriate mobile sizing

Record audit findings as a structured list with severity (critical / warning / suggestion).

---

## Step 3 -- Research Best Practices

Use `search_web` to research responsive patterns relevant to the scope:

| When translating... | Search query |
|---------------------|-------------|
| React Flow canvas | `"react flow xyflow mobile touch responsive canvas 2024 2025"` |
| Sidebar navigation | `"responsive sidebar mobile overlay react tailwind pattern 2024"` |
| Data tables/grids | `"responsive data table mobile tailwind card layout pattern 2024"` |
| Modals/dialogs | `"mobile fullscreen modal bottom sheet react tailwind 2024"` |
| Charts (Recharts) | `"recharts responsive mobile chart resize container 2024"` |
| Form inputs | `"mobile form input touch target accessibility tailwind 2024"` |
| Landing page sections | `"responsive landing page tailwind mobile first layout 2024"` |

Use `read_url_content` for deep-diving. Skip this step if scope is narrow and patterns are well-established.

---

## Step 4 -- Write Translation Plan

Write a plan to `Context/memory/task_plan.md` before implementing:

```
## Mobile Compatibility: [scope description]
### Audit summary: [N] issues found ([critical] critical, [warning] warnings)
### Files to modify:
- [file] -- [what changes]
### Breakpoint strategy:
- xs/sm: [layout approach -- stacked, drawer, fullscreen]
- md: [tablet approach -- hybrid]
- lg+: [desktop -- usually unchanged]
### Approach: [2-3 sentences]
### Do NOT change:
- [files/features that should remain untouched]
```

---

## Step 5 -- Implement Mobile Translations

### Tailwind v4 Mobile Conventions
- Mobile-first: base classes are for xs, add `sm:`, `md:`, `lg:` for larger screens
- Postfix modifiers: `bg-white!` not `!bg-white`
- Use `shrink-0` not `flex-shrink-0`
- Dark mode: `.dark` class only -- never `prefers-color-scheme`
- No emojis -- Lucide icons only

### JS-Level Breakpoint Usage
```typescript
import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";

const isMobile = useIsMobile();

// Conditional rendering (rare -- prefer CSS)
{isMobile ? <MobileDrawer /> : <DesktopPanel />}

// React Flow mobile config
const flowOptions = isMobile
  ? { panOnDrag: true, zoomOnPinch: true, preventScrolling: false }
  : { panOnDrag: true, zoomOnScroll: true };
```

### Production Transferability Rules
- All responsive classes must work without JS -- CSS-only breakpoints for layout
- Use `useIsMobile()` only for JS-dependent logic (event handlers, React Flow config, different component trees)
- Never use `window.innerWidth` directly -- use the `useBreakpoint` hook
- SSR compatibility: `useBreakpoint` defaults to `"lg"` on server
- No inline styles for responsive behavior -- Tailwind classes only

---

## Step 6 -- QA Validation

### Automated Checks
Use `run_command` to execute:
1. Type check: `cd frontend && npx tsc --noEmit` -- zero errors required
2. Build check: `cd frontend && npm run build` -- verify no build errors
3. Existing tests: `cd frontend && npx vitest run --reporter=verbose [test-pattern]`

### Visual QA Checklist (Present to User)
Use `notify_user` to present a device-specific checklist:

```
## Mobile QA Checklist -- [component/feature]

### iPhone SE (375px)
- [ ] No horizontal scroll
- [ ] All text readable without zoom
- [ ] Touch targets >= 44px
- [ ] Modals/overlays properly sized

### iPhone 14 Pro (393px)
- [ ] Layout matches iPhone SE

### iPad Mini (768px)
- [ ] Tablet layout activates (md: breakpoint)
- [ ] Sidebar behavior correct

### iPad Pro (1024px)
- [ ] Desktop-like layout begins (lg: breakpoint)

### Cross-cutting
- [ ] Dark mode works at all breakpoints
- [ ] Orientation change does not break layout
- [ ] No content hidden behind fixed headers/footers
```

Use `browser_subagent` if available to test responsive layouts at different viewport sizes.

---

## Step 7 -- Production Transferability Report

Summarize the mobile translation:

```
## Mobile Compatibility Report

### Changes Applied
| File | Change | Breakpoints Affected |
|------|--------|---------------------|
| [file] | [description] | xs, sm, md |

### Patterns Used
- [responsive patterns applied]

### QA Status
- Type check: PASS/FAIL
- Build: PASS/FAIL
- Visual QA: [checklist provided]
- Regression tests: PASS/FAIL/NONE

### Known Limitations
- [mobile edge cases not addressed]

### Recommended Follow-ups
- [ ] [additional mobile work]
```

---

## Step 8 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Mobile Compat: [short title] -- [HH:MM]
**Agent:** Antigravity -- Mobile compatibility audit & translation
**Files changed:** [list]
**Audit results:** [N] issues found, [M] fixed
**QA status:** tsc [PASS/FAIL], build [PASS/FAIL], visual checklist [provided/skipped]
**Notes:** [anything non-obvious]
```

Update `Context/memory/AGENT_MEMORY.md` if non-obvious mobile decisions were made.
