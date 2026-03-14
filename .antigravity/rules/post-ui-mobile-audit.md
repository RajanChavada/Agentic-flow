---
description: Auto-triggered after any functional UI change is complete. Runs the mobile compatibility audit workflow to ensure all UI changes are responsive and mobile-friendly. This rule acts as a post-implementation gate -- no UI work is considered done until mobile compatibility is verified.
---

# Post-UI-Change Mobile Compatibility Rule

> **When:** After ANY functional change to UI components (new components, layout changes, modal/panel additions, styling overhauls, new node types, sidebar changes).
> **What:** Automatically run the mobile compatibility audit from `.antigravity/workflows/mobile-compat.md`.
> **Why:** Mobile responsiveness is not optional. Every UI change must be verified against Neurovn's breakpoint system before the task is marked complete.

---

## Trigger Conditions

This rule activates when the agent has made functional changes to ANY of these file patterns:

```
frontend/src/components/**/*.tsx       -- UI components
frontend/src/components/**/*.ts        -- component logic
frontend/src/app/**/*.tsx              -- page layouts
frontend/src/hooks/useBreakpoint.ts    -- breakpoint definitions
```

Specifically, trigger when the changes involve:
- New UI components or layouts
- Modifying existing component structure (not just logic)
- Adding modals, panels, drawers, or overlays
- Changing flex/grid layouts
- Adding interactive elements (buttons, inputs, dropdowns)
- Modifying the sidebar, header, or canvas container

### When NOT to trigger
- Pure logic changes (store actions, API calls, type definitions)
- Backend-only changes
- Test file changes
- Config/build file changes
- Documentation changes
- Fixing a TypeScript error that doesn't change UI rendering

---

## Execution Steps

### Step 1 -- Acknowledge the gate

After completing the functional UI change and verifying with `npx tsc --noEmit`, announce:
```
UI changes complete. Running mobile compatibility audit per post-UI-change rule.
```

### Step 2 -- Quick mobile audit (always run)

For every changed UI file, check these critical items:

- [ ] **No fixed widths** -- uses responsive Tailwind classes (`sm:`, `md:`, `lg:`)
- [ ] **Mobile-first layout** -- base classes for xs, scaled up for larger screens
- [ ] **Touch targets** -- interactive elements are minimum 44x44px (`min-h-11 min-w-11`)
- [ ] **No horizontal overflow** -- content doesn't overflow on 375px viewport
- [ ] **Dark mode intact** -- `.dark` class variants still applied correctly

### Step 3 -- Breakpoint-specific review

Check the changed components against Neurovn's breakpoint system:

```typescript
// From frontend/src/hooks/useBreakpoint.ts
xs: 0-639px      // Mobile phones
sm: 640-767px    // Large phones  
md: 768-1023px   // Tablets
lg: 1024-1279px  // Small laptops
xl: 1280px+      // Desktops
```

For each changed component, verify:

| Breakpoint | Check |
|------------|-------|
| xs (375px) | Does the layout stack properly? Is text readable? |
| sm (640px) | Does the layout adapt? No awkward whitespace? |
| md (768px) | Does the tablet layout work? Sidebar behavior correct? |
| lg+ (1024px) | Does the desktop layout look right? (Usually unchanged) |

### Step 4 -- Apply fixes if issues found

If any mobile issues are detected:

1. Fix them inline (responsive Tailwind classes, conditional rendering)
2. Use `useIsMobile()` from `@/hooks/useBreakpoint` only for JS-dependent logic
3. Prefer CSS-only breakpoints over JS checks
4. Re-run `npx tsc --noEmit` after fixes

### Step 5 -- Full audit for major changes (conditional)

If the UI change involves a **new component**, **new page layout**, or **significant layout restructuring**, run the full mobile-compat workflow:

Read and follow `.antigravity/workflows/mobile-compat.md` steps 0-8 completely.

This includes:
- Full mobile audit checklist
- Research best practices via `search_web`
- Translation plan
- QA validation with device-specific checklist
- Production transferability report

### Step 6 -- Log the audit result

Append the mobile audit result to the task's log entry:

```
### Mobile Compatibility
- Audit: [PASS / N issues found and fixed]
- Breakpoints verified: [xs, sm, md, lg]
- Changes: [list any responsive fixes applied]
```

---

## Integration with Other Workflows

This rule chains with other workflows automatically:

```
/frontend workflow
  └── Step 4: Implement changes
  └── Step 5: npx tsc --noEmit ✓
  └── [THIS RULE TRIGGERS]
      └── Quick mobile audit
      └── Fix issues
      └── npx tsc --noEmit (re-verify)
  └── Step 6: Log (includes mobile audit result)
```

```
/feature workflow  
  └── Phase N+1: Frontend Core
      └── Components implemented
      └── [THIS RULE TRIGGERS]
  └── Phase N+2: Polish & Delight
      └── Full mobile-compat workflow (if major changes)
```

---

## Quick Reference: Common Mobile Fixes

| Issue | Fix |
|-------|-----|
| Fixed width | Replace `w-[400px]` with `w-full max-w-[400px]` |
| Missing stacking | Add `flex-col md:flex-row` |
| Small touch target | Add `min-h-11 min-w-11 p-2` |
| Overflow | Add `overflow-x-hidden` or `max-w-full` |
| Text too large | Add `text-sm md:text-base` |
| Hidden on mobile | Use `hidden md:block` / `block md:hidden` intentionally |
| Modal too wide | Add `w-full md:w-auto md:min-w-[400px]` |
