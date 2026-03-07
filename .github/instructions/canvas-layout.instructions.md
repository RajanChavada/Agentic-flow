---
applyTo: "frontend/src/**/*.ts,frontend/src/**/*.tsx"
---

# Canvas Workflow Layout Rules

Whenever workflows are added to the canvas (import, template, pull-from-canvas, or any new load path), they **must** be preformatted with the dagre auto-layout so they look clean and readable.

## Why

Raw workflow graphs often have overlapping nodes, random positions, or ugly grid placement. Users expect a tidy, top-to-bottom DAG layout. Without this, the canvas looks unprofessional.

## Mandatory pattern

Whenever you add code that:

- Loads a workflow from a template
- Imports a workflow from file / API / another canvas
- Pulls workflows from another canvas
- Creates or loads nodes from any external source onto the canvas

**You must:**

1. **Set `needsLayout: true`** in the store when setting nodes/edges, e.g.:
   ```ts
   set({
     nodes: rfNodes,
     edges: rfEdges,
     ui: { ...get().ui, needsLayout: true },
   });
   ```

2. **Ensure the editor runs layout** — The editor already has a `useEffect` that watches `ui.needsLayout` and calls `applyLayout()` from `useAutoLayout()` when `needsLayout` is true and there are nodes. Do not remove this.

3. **Use client-side navigation** — If you redirect after loading (e.g. marketplace to editor), use `router.push()` not `window.location.href`, so the store state (including `needsLayout`) persists.

## Where layout is applied

- `frontend/src/hooks/useAutoLayout.ts` — dagre-based layout; `applyLayout()` writes positions back to the store
- `frontend/src/app/editor/[canvasId]/page.tsx` — effect that runs `applyLayout()` when `needsLayout` is true

## Store actions that set `needsLayout`

These already follow the pattern: `importWorkflow`, `pullWorkflowsFromCanvas`, `loadTemplateOntoCanvas`, `loadNeurovnWorkflow`.

**If you add a new load path** (e.g. "Load from URL", "Duplicate from history", etc.), add `needsLayout: true` to the store update.

## Do NOT

- Add workflows to the canvas without triggering layout
- Use `window.location.href` when redirecting after a load (use `router.push` to preserve state)
- Assume manual grid positions are enough — dagre produces a proper DAG layout
