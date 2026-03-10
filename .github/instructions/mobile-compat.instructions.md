---
applyTo: "frontend/src/components/**/*.tsx,frontend/src/hooks/useBreakpoint.ts"
---

# Mobile Compatibility Instructions

## Read these BEFORE making responsive or mobile changes

1. `Context/FRONTEND_PLAN.MD` -- component locations, layout conventions
2. `Context/memory/MEMORY.md` -- past mobile decisions
3. `frontend/src/hooks/useBreakpoint.ts` -- breakpoint definitions

## Breakpoint system

Neurovn uses a custom `useBreakpoint` hook with these tiers:

| Breakpoint | Width | Tailwind | Device |
|-----------|-------|----------|--------|
| xs | < 640px | (base) | Phone portrait |
| sm | 640-767px | `sm:` | Phone landscape |
| md | 768-1023px | `md:` | Tablet |
| lg | 1024-1279px | `lg:` | Small desktop |
| xl | >= 1280px | `xl:` | Large desktop |

Use `useIsMobile()` (returns true for xs/sm) and `useIsTablet()` (returns true for md) for JS-level checks.

## Mobile translation rules

### Layout
- Mobile-first: base classes for xs, add `sm:`, `md:`, `lg:` for larger screens
- Stack on mobile: `flex flex-col md:flex-row`
- Full width on mobile: `w-full md:w-auto md:max-w-md`
- Use fixed height (`h-64`) on mobile, not min-height -- prevents layout shift
- Sidebar: collapsed by default on mobile, overlay on tap
- Modals: fullscreen on mobile (`w-full h-full max-w-none rounded-none`)

### Touch
- Minimum touch target: 44x44px (`min-h-11 min-w-11`)
- Pair `hover:` with `active:` and `focus-visible:` for touch devices
- Min 8px gap between interactive elements (`gap-2`)

### Typography
- Scale text: `text-sm md:text-base lg:text-lg`
- Truncate on mobile: `truncate` or `line-clamp-2 md:line-clamp-none`
- Hide secondary content: `hidden md:block`

### Tailwind v4 rules
- Postfix modifiers: `bg-white!` not `!bg-white`
- `shrink-0` not `flex-shrink-0`
- Dark mode: `.dark` class only -- never `prefers-color-scheme`

### Production transferability
- Prefer CSS-only breakpoints (Tailwind responsive classes) over JS checks
- Use `useIsMobile()` only for JS-dependent logic (event handlers, React Flow config)
- Never use `window.innerWidth` directly -- use the `useBreakpoint` hook
- No inline styles for responsive behavior -- Tailwind classes only
- No emojis in production UI -- Lucide icons only

## After making mobile changes

1. Run `cd frontend && npx tsc --noEmit` -- zero errors
2. Present a QA checklist for the user to verify at 375px, 393px, 768px, and 1024px
3. Append to `Context/memory/logs_agent/YYYY-MM-DD.md`
