# Phase 0: Foundation — Context

**Created:** 2026-03-04
**Phase goal:** Codebase is refactored to support new features without performance degradation
**Requirements:** FNDX-01, FNDX-02, FNDX-03

## Decisions

### Store Splitting Strategy (FNDX-01)

**Approach:** Zustand slices pattern — single `create()` call with `StateCreator` slices combined via spread. Keeps single store instance but separates code into domain files.

**Slice boundaries (4 slices):**
1. `workflowSlice` — nodes, edges, graph operations (add/remove/update nodes, edge connections)
2. `estimationSlice` — estimation results, API calls, scaling params (runs_per_day, loop_intensity), scenario comparison
3. `uiSlice` — panel state, dark mode, sidebar visibility, fullscreen
4. `persistenceSlice` — Supabase save/load, canvas management, workflow persistence

**Selector hooks:** Preserve all existing hooks (`useEstimation`, `useWorkflowNodes`, `useUIState`, etc.) as re-exports from the main `useWorkflowStore.ts` file. Zero changes required in consuming components.

**File structure:**
```
src/store/
  useWorkflowStore.ts      # Main store — combines slices, re-exports all hooks
  slices/
    workflowSlice.ts       # Nodes, edges, graph ops
    estimationSlice.ts     # Estimation, scaling, scenarios
    uiSlice.ts             # UI panel state, dark mode
    persistenceSlice.ts    # Supabase persistence
```

### EstimatePanel Decomposition (FNDX-02)

**Approach:** Split by visible dashboard section. Each collapsible section becomes its own component. EstimatePanel becomes a thin layout shell that composes sub-components.

**Sub-components:**
- `CostBreakdown` — cost summary, per-node cost table
- `TokenAnalysis` — token usage charts and breakdown
- `LatencyTimeline` — latency visualization and critical path
- `ScalingParams` — runs_per_day, loop_intensity controls
- `NodeBreakdownTable` — per-node detailed breakdown table
- `HealthMetrics` — health gauges and bottleneck indicators

**File location:** Dedicated `src/components/estimate/` directory (not flat in components/).

```
src/components/estimate/
  EstimatePanel.tsx        # Layout shell — composes sub-components
  CostBreakdown.tsx
  TokenAnalysis.tsx
  LatencyTimeline.tsx
  ScalingParams.tsx
  NodeBreakdownTable.tsx
  HealthMetrics.tsx
```

**Behavior:** Zero behavior change. Pure refactor — same collapsible sections, same charts, same layout. No visual changes.

### Test Framework Setup (FNDX-03)

**Frameworks:** Vitest (frontend) + pytest (backend) as specified in requirements.

**Scope:** Smoke tests per layer — at minimum:
- Frontend: Vitest configured, at least one smoke test proving store operations work
- Backend: pytest configured, at least one smoke test proving `/api/estimate` endpoint responds correctly

**Test location:**
- Frontend: Co-located `__tests__/` directories or `.test.ts` files next to source
- Backend: `backend/tests/` directory with `test_*.py` files

## Code Context

**Current store file:** `frontend/src/store/useWorkflowStore.ts` (967 lines)
- Contains ~15 exported selector hooks used across the codebase
- Handles nodes/edges, estimation, UI state, Supabase persistence, scenarios
- Uses `getState()` inside callbacks per project convention

**Current EstimatePanel:** `frontend/src/components/EstimatePanel.tsx` (1729 lines)
- Has collapsible `DashboardSection` components with Recharts visualizations
- Uses Zustand selector hooks for estimation data
- Has resize functionality and dark mode support

**No existing test infrastructure:** No test files, no test runner, no coverage config. Starting from zero.

## Deferred Ideas

None captured during discussion.

## Prior Phase Decisions

None (this is Phase 0).

---
*Context captured: 2026-03-04*
