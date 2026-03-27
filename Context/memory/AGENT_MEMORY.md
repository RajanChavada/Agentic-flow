# Agent Memory

## Shared Backend for Dual Frontends -- 2026-03-27
**Context:** The user wanted two separate deployments (Stripe vs. Standard) but sharing a single backend instance.
**Decision:** Modified the backend `create-checkout-session` to accept a dynamic `frontendUrl` from the caller. The frontend passes `window.location.origin` as `frontendUrl`.
**Don't repeat:** Avoid hardcoding `FRONTEND_URL` in the backend if multiple frontend instances with different redirect needs are expected.

## Caffeine Theme Consistency -- 2026-03-27
**Context:** UI components were fragmented with legacy amber/orange colors.
**Decision:** Purged all Tailwind amber/orange classes and established a "Sand/Neutral" palette centered on the Caffeine theme's identity.
**Don't repeat:** Don't mix legacy accent colors when performing a theme overhaul; audit all shared components (ComparisonDrawer, Modals) early.
