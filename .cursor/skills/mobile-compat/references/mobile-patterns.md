# Mobile Pattern Reference -- Neurovn

Responsive layout patterns, breakpoint conventions, and code examples for mobile compatibility work. Read this when translating desktop-first components to mobile-friendly implementations.

---

## Table of Contents

1. [Breakpoint System](#breakpoint-system)
2. [Layout Patterns](#layout-patterns)
3. [Touch & Interaction](#touch--interaction)
4. [Component-Specific Patterns](#component-specific-patterns)
5. [Testing Patterns](#testing-patterns)

---

## Breakpoint System

Neurovn uses a custom `useBreakpoint` hook (`frontend/src/hooks/useBreakpoint.ts`):

| Breakpoint | Width | Tailwind prefix | Device class |
|-----------|-------|-----------------|--------------|
| xs | < 640px | (base) | Phone portrait |
| sm | 640-767px | `sm:` | Phone landscape |
| md | 768-1023px | `md:` | Tablet |
| lg | 1024-1279px | `lg:` | Small desktop |
| xl | >= 1280px | `xl:` | Large desktop |

### Hook Usage

```typescript
import { useBreakpoint, useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";

// Boolean helpers
const isMobile = useIsMobile();   // xs or sm
const isTablet = useIsTablet();   // md

// Full breakpoint value
const bp = useBreakpoint();       // "xs" | "sm" | "md" | "lg" | "xl"
```

### SSR Default

`useBreakpoint` returns `"lg"` during SSR to avoid hydration mismatches. This means:
- Server-rendered HTML will use desktop layout
- Client hydration may cause a brief layout shift on mobile
- Prefer CSS-only solutions (Tailwind responsive classes) over JS breakpoints when possible

---

## Layout Patterns

### Stack on Mobile, Row on Desktop

```tsx
<div className="flex flex-col gap-3 md:flex-row md:gap-6">
  <div className="w-full md:w-1/2">{/* Left */}</div>
  <div className="w-full md:w-1/2">{/* Right */}</div>
</div>
```

### Hide on Mobile, Show on Desktop

```tsx
{/* Secondary info hidden on mobile */}
<p className="hidden md:block text-sm text-gray-500">
  Additional context shown on desktop
</p>

{/* Mobile-only element */}
<button className="block md:hidden min-h-11 p-3">
  Mobile Menu
</button>
```

### Full Width on Mobile, Constrained on Desktop

```tsx
<div className="w-full md:w-auto md:max-w-md lg:max-w-lg">
  {/* Content */}
</div>
```

### Sidebar as Mobile Overlay

```tsx
const isMobile = useIsMobile();

{isMobile ? (
  <div className="fixed inset-0 z-50 bg-black/50">
    <nav className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-xl">
      {/* Sidebar content */}
    </nav>
  </div>
) : (
  <nav className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700">
    {/* Sidebar content */}
  </nav>
)}
```

### Bottom Sheet on Mobile

```tsx
<div className={cn(
  "bg-white dark:bg-gray-900 shadow-lg",
  isMobile
    ? "fixed bottom-0 inset-x-0 rounded-t-2xl max-h-[80vh] overflow-y-auto"
    : "relative rounded-lg"
)}>
  {/* Panel content */}
</div>
```

### Responsive Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

### Fixed Height (Prevent Layout Shift)

```tsx
{/* Use fixed height on mobile, not min-height */}
<div className="h-64 sm:h-80 md:h-96">
  {/* Content with fixed container */}
</div>
```

---

## Touch & Interaction

### Minimum Touch Target (44x44px)

```tsx
{/* Button with adequate touch target */}
<button className="min-h-11 min-w-11 p-3 md:p-2 md:min-h-0 md:min-w-0">
  <LucideIcon className="h-5 w-5" />
</button>

{/* Icon button */}
<button className="flex items-center justify-center h-11 w-11 rounded-lg md:h-8 md:w-8">
  <X className="h-4 w-4" />
</button>
```

### Touch + Hover Parity

```tsx
{/* Always pair hover with active/focus for touch */}
<button className="
  bg-blue-500
  hover:bg-blue-600
  active:bg-blue-700
  focus-visible:ring-2 focus-visible:ring-blue-500
  transition-colors
">
  Action
</button>
```

### Adequate Spacing Between Targets

```tsx
{/* Min 8px gap between interactive elements */}
<div className="flex gap-2">
  <button className="min-h-11 px-4">Save</button>
  <button className="min-h-11 px-4">Cancel</button>
</div>
```

---

## Component-Specific Patterns

### React Flow Canvas (Mobile)

```typescript
const isMobile = useIsMobile();

<ReactFlow
  nodes={nodes}
  edges={edges}
  fitView
  panOnDrag={true}
  zoomOnPinch={isMobile}
  zoomOnScroll={!isMobile}
  preventScrolling={!isMobile}
  minZoom={0.3}
  maxZoom={isMobile ? 1.5 : 2}
  nodesDraggable={!isMobile}
>
  {!isMobile && <MiniMap />}
  <Controls position={isMobile ? "bottom-center" : "bottom-left"} />
</ReactFlow>
```

### Recharts Responsive Container

```tsx
<ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
  <BarChart data={data} margin={isMobile ? { left: -20 } : undefined}>
    {/* Fewer ticks on mobile */}
    <XAxis
      dataKey="name"
      tick={{ fontSize: isMobile ? 10 : 12 }}
      interval={isMobile ? 1 : 0}
    />
    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
    <Bar dataKey="value" />
  </BarChart>
</ResponsiveContainer>
```

### Modal / Dialog

```tsx
<Dialog>
  <DialogContent className={cn(
    "max-h-[90vh] overflow-y-auto",
    isMobile
      ? "w-full h-full max-w-none rounded-none"
      : "max-w-lg rounded-xl"
  )}>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Responsive Text Truncation

```tsx
{/* Single line truncation */}
<h3 className="truncate max-w-[200px] md:max-w-none">
  {longTitle}
</h3>

{/* Multi-line clamping */}
<p className="line-clamp-2 md:line-clamp-none">
  {longDescription}
</p>
```

---

## Testing Patterns

### Mocking Breakpoint Hooks

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mobile viewport mock
vi.mock('@/hooks/useBreakpoint', () => ({
  useIsMobile: () => true,
  useIsTablet: () => false,
  useBreakpoint: () => 'xs' as const,
}))

describe('Component (mobile)', () => {
  it('should render mobile layout', () => {
    render(<MyComponent />)
    expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })
})
```

### Desktop Regression Test

```typescript
// In a separate test file or describe block
vi.mock('@/hooks/useBreakpoint', () => ({
  useIsMobile: () => false,
  useIsTablet: () => false,
  useBreakpoint: () => 'lg' as const,
}))

describe('Component (desktop)', () => {
  it('should render desktop layout', () => {
    render(<MyComponent />)
    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-drawer')).not.toBeInTheDocument()
  })
})
```

### Viewport Size Testing (E2E)

```typescript
import { test, expect } from '@playwright/test'

const VIEWPORTS = {
  iphoneSE: { width: 375, height: 667 },
  iphone14: { width: 393, height: 852 },
  ipadMini: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
}

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`renders correctly on ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    // Assert no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}
```

---

*Last updated: 2026-03-09 -- Initial mobile pattern reference for Neurovn*
