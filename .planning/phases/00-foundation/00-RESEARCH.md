# Phase 0: Foundation - Research

**Researched:** 2026-03-04
**Domain:** State management refactoring, test infrastructure setup
**Confidence:** HIGH

## Summary

Phase 0 focuses on architectural improvements to support feature development without performance degradation. The research covers three domains: Zustand store slicing, test framework setup, and component decomposition patterns.

**Key findings:**
- Zustand 5.x slices pattern uses `StateCreator` with careful type parameter ordering for cross-slice access
- Vitest integrates cleanly with Next.js 15+ and React 19 via `@vitejs/plugin-react` and `vite-tsconfig-paths`
- pytest with FastAPI's `TestClient` follows synchronous patterns (no async/await in tests)
- Current store (967 lines) has clear domain boundaries already evident in comments and interface structure

**Primary recommendation:** Implement slices pattern using spread operator combination (not middleware), configure Vitest with jsdom environment and TypeScript path resolution, structure tests with smoke tests first to validate infrastructure.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Store Splitting Strategy (FNDX-01):**
- Zustand slices pattern — single `create()` call with `StateCreator` slices combined via spread
- 4 slices: workflowSlice, estimationSlice, uiSlice, persistenceSlice
- Preserve all existing ~15 selector hooks as re-exports from main store file
- Zero changes required in consuming components

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

**EstimatePanel Decomposition (FNDX-02):**
- Split by visible dashboard section into sub-components
- Sub-components: CostBreakdown, TokenAnalysis, LatencyTimeline, ScalingParams, NodeBreakdownTable, HealthMetrics
- Dedicated `src/components/estimate/` directory
- Zero behavior change — pure refactor

**Test Framework Setup (FNDX-03):**
- Vitest (frontend) + pytest (backend)
- Smoke tests: at least one per layer
- Co-located test files for frontend, `backend/tests/` for backend

### Claude's Discretion

None specified for this phase.

### Deferred Ideas (OUT OF SCOPE)

None captured during discussion.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FNDX-01 | Zustand workflow store is split into domain-specific slices (workflow, metadata, estimation) to prevent subscription explosion | Zustand slices pattern with StateCreator, cross-slice access patterns, type safety |
| FNDX-02 | EstimatePanel component is refactored into smaller sub-components for maintainability | Component decomposition patterns, React.memo best practices, prop drilling vs context |
| FNDX-03 | Test framework (Vitest + pytest) is installed and configured with at least one smoke test per layer | Vitest + Next.js 15 config, pytest + FastAPI TestClient setup, smoke test patterns |
</phase_requirements>

---

## Standard Stack

### Frontend Testing Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^2.0.0 | Test runner | Vite-native, faster than Jest, compatible with Next.js 15+ |
| @vitejs/plugin-react | ^4.3.0 | React transform | Required for JSX/TSX in Vitest |
| @testing-library/react | ^16.0.0 | Component testing | De facto standard for React component tests |
| @testing-library/dom | ^10.0.0 | DOM queries | Peer dependency for React Testing Library |
| jsdom | ^25.0.0 | Browser environment | Lightweight DOM simulation for Node.js |
| vite-tsconfig-paths | ^5.0.0 | Path alias resolution | Resolves `@/` imports in tests (TypeScript projects only) |

### Backend Testing Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pytest | ^8.0.0 | Test runner | Python standard, FastAPI's official test framework |
| httpx | ^0.28.0 | HTTP client | Required by FastAPI's TestClient (already in backend deps) |

### Supporting

No additional supporting libraries needed. Both test frameworks work with existing project dependencies.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest slower with Next.js, requires more config; Vitest is Vite-native |
| jsdom | happy-dom | happy-dom slightly faster but less mature; jsdom more battle-tested |
| pytest | unittest | unittest more verbose, pytest more idiomatic and powerful |

**Installation:**

```bash
# Frontend (from frontend/ directory)
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths

# Backend (from backend/ directory)
pip install pytest
# httpx already installed (in requirements.txt)
```

---

## Architecture Patterns

### Zustand Slices Pattern (FNDX-01)

#### Recommended Project Structure

```
frontend/src/store/
├── useWorkflowStore.ts      # Main store: combines slices, exports hooks
├── slices/
│   ├── workflowSlice.ts     # Nodes, edges, graph operations
│   ├── estimationSlice.ts   # Estimation, scaling, scenarios
│   ├── uiSlice.ts           # UI state, dark mode, panels
│   └── persistenceSlice.ts  # Supabase save/load, canvas mgmt
```

#### Pattern: StateCreator Slice Definition

**What:** Each slice is typed as `StateCreator<CombinedState, [], [], SliceState>` where CombinedState includes all slice types.

**When to use:** Always for Zustand slices in TypeScript projects requiring cross-slice access.

**Example:**

```typescript
// slices/workflowSlice.ts
import { StateCreator } from 'zustand';
import type { Node, Edge } from '@xyflow/react';

// Slice-specific state and actions
export interface WorkflowSlice {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node<WorkflowNodeData>) => void;
  deleteNode: (id: string) => void;
  // ... other workflow methods
}

// Type parameter order: <CombinedState, [], [], ThisSliceState>
export const createWorkflowSlice: StateCreator<
  WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice,  // Full store type
  [],                                                              // Middleware (none)
  [],                                                              // Mutators (none)
  WorkflowSlice                                                    // This slice's interface
> = (set, get) => ({
  nodes: [],
  edges: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node]
  })),

  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter(n => n.id !== id),
    edges: state.edges.filter(e => e.source !== id && e.target !== id)
  })),
});
```

**Source:** Zustand official patterns (verified against existing `useWorkflowStore.ts` structure)

---

#### Pattern: Combining Slices in Main Store

**What:** Use spread operator to merge slices into single `create()` call. Export store hook plus selector hooks for fine-grained subscriptions.

**When to use:** After defining all slices, combine in main store file.

**Example:**

```typescript
// useWorkflowStore.ts
import { create } from 'zustand';
import { createWorkflowSlice, WorkflowSlice } from './slices/workflowSlice';
import { createEstimationSlice, EstimationSlice } from './slices/estimationSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createPersistenceSlice, PersistenceSlice } from './slices/persistenceSlice';

// Combined store type
type WorkflowStore = WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice;

// Create store by spreading slice creators
export const useWorkflowStore = create<WorkflowStore>()((...a) => ({
  ...createWorkflowSlice(...a),
  ...createEstimationSlice(...a),
  ...createUISlice(...a),
  ...createPersistenceSlice(...a),
}));

// Re-export selector hooks (CRITICAL for zero changes in consuming components)
export const useWorkflowNodes = () => useWorkflowStore(state => state.nodes);
export const useWorkflowEdges = () => useWorkflowStore(state => state.edges);
export const useEstimation = () => useWorkflowStore(state => state.estimation);
export const useUIState = () => useWorkflowStore(state => state.ui);
// ... export all ~15 existing hooks
```

**Source:** Zustand slices documentation pattern + existing store structure analysis

---

#### Pattern: Cross-Slice Access

**What:** Slices access each other via `get()` function inside actions. TypeScript infers full store type from StateCreator first type parameter.

**When to use:** When one slice's action needs to read state from another slice.

**Example:**

```typescript
// estimationSlice.ts
export const createEstimationSlice: StateCreator<
  WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice,
  [],
  [],
  EstimationSlice
> = (set, get) => ({
  estimation: null,

  fetchEstimation: async () => {
    // Access workflowSlice state via get()
    const { nodes, edges } = get();

    const payload = {
      nodes: nodesToPayload(nodes),
      edges: edgesToPayload(edges),
    };

    const response = await fetch('http://localhost:8000/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const estimation = await response.json();
    set({ estimation });

    // Can also access UI slice to show success message
    get().setSuccessMessage('Estimation complete');
  },
});
```

**Source:** Zustand patterns for cross-slice communication

---

#### Pattern: Preserving Selector Hooks

**What:** Export selector hooks from main store file as thin wrappers around `useWorkflowStore(selector)`.

**When to use:** Always, when refactoring existing stores to maintain backward compatibility.

**Example:**

```typescript
// useWorkflowStore.ts (after combining slices)

// Base store hook
export const useWorkflowStore = create<WorkflowStore>()(/* ... */);

// Selector hooks (preserve existing API)
export const useWorkflowNodes = () => useWorkflowStore(state => state.nodes);
export const useWorkflowEdges = () => useWorkflowStore(state => state.edges);
export const useSelectedNodeId = () => useWorkflowStore(state => state.selectedNodeId);
export const useEstimation = () => useWorkflowStore(state => state.estimation);
export const useScalingParams = () => useWorkflowStore(state => state.scalingParams);
export const useUIState = () => useWorkflowStore(state => state.ui);
export const useScenarios = () => useWorkflowStore(state => state.scenarios);
export const useCurrentScenarioId = () => useWorkflowStore(state => state.currentScenarioId);
export const useComparisonResults = () => useWorkflowStore(state => state.comparisonResults);
export const useCurrentWorkflow = () => useWorkflowStore(state => ({
  id: state.currentWorkflowId,
  name: state.currentWorkflowName,
  isDirty: state.isDirty,
}));
export const useSupabaseState = () => useWorkflowStore(state => ({
  loading: state.supabaseLoading,
  saving: state.isSaving,
  lastSavedAt: state.lastSavedAt,
}));
export const useProviderData = () => useWorkflowStore(state => state.providerData);
export const useToolCategoryData = () => useWorkflowStore(state => state.toolCategoryData);
export const useActualStats = () => useWorkflowStore(state => state.actualStats);
```

**Source:** Existing `useWorkflowStore.ts` exports pattern (lines visible in current file)

---

### Component Decomposition (FNDX-02)

#### Pattern: Extract by Visual Section

**What:** Large panel components should be decomposed by visible sections/collapsible panels, not by arbitrary line count.

**When to use:** When a component exceeds 1000 lines or has multiple independently-meaningful sections.

**Anti-pattern to avoid:** Splitting components by technical concern (e.g., "charts", "tables") when those concerns span multiple user-visible sections.

**Example structure:**

```
src/components/estimate/
├── EstimatePanel.tsx            # Layout shell, section composition
├── CostBreakdown.tsx            # Cost summary, per-node cost table
├── TokenAnalysis.tsx            # Token usage charts and breakdown
├── LatencyTimeline.tsx          # Latency visualization, critical path
├── ScalingParams.tsx            # runs_per_day, loop_intensity controls
├── NodeBreakdownTable.tsx       # Per-node detailed breakdown table
└── HealthMetrics.tsx            # Health gauges, bottleneck indicators
```

**Migration approach:**
1. Create `estimate/` directory
2. Move EstimatePanel.tsx into directory
3. Extract one section at a time (smallest first)
4. Verify behavior unchanged after each extraction
5. Clean up EstimatePanel to just composition logic

---

### Test Infrastructure Patterns

#### Vitest Configuration (Next.js 15 + React 19)

**What:** Vitest config with React plugin, jsdom environment, and TypeScript path resolution.

**Example:**

```typescript
// vitest.config.mts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(),  // Resolves @/ paths from tsconfig.json
    react(),          // Transforms JSX/TSX
  ],
  test: {
    environment: 'jsdom',  // Browser-like environment
  },
});
```

**Source:** Next.js official Vitest documentation (https://nextjs.org/docs/app/guides/testing/vitest)

---

#### Pattern: Frontend Smoke Test (Store Operations)

**What:** Minimal test validating Zustand store basic operations work.

**Example:**

```typescript
// src/store/__tests__/useWorkflowStore.test.ts
import { expect, test } from 'vitest';
import { useWorkflowStore } from '../useWorkflowStore';

test('store initializes with empty nodes and edges', () => {
  const state = useWorkflowStore.getState();
  expect(state.nodes).toEqual([]);
  expect(state.edges).toEqual([]);
});

test('addNode adds a node to store', () => {
  const store = useWorkflowStore.getState();

  const testNode = {
    id: 'test-1',
    type: 'agentNode',
    position: { x: 0, y: 0 },
    data: { type: 'agentNode', label: 'Test Agent' },
  };

  store.addNode(testNode);

  const state = useWorkflowStore.getState();
  expect(state.nodes).toHaveLength(1);
  expect(state.nodes[0].id).toBe('test-1');

  // Cleanup
  store.deleteNode('test-1');
});
```

**Source:** Vitest + Zustand testing patterns

---

#### Pattern: Backend Smoke Test (Endpoint Response)

**What:** Minimal test validating FastAPI endpoint responds correctly.

**Example:**

```python
# backend/tests/test_main.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    """Smoke test: API responds to root endpoint"""
    response = client.get("/")
    assert response.status_code == 200

def test_estimate_endpoint_structure():
    """Smoke test: /api/estimate accepts valid payload and returns estimation"""
    payload = {
        "nodes": [
            {
                "id": "start",
                "type": "startNode",
                "label": "Start",
                "model_provider": None,
                "model_name": None,
                "context": None,
                "tool_id": None,
                "tool_category": None,
                "max_steps": None,
                "task_type": None,
                "expected_output_size": None,
                "expected_calls_per_run": None,
            }
        ],
        "edges": [],
        "runs_per_day": None,
        "loop_intensity": 1.0,
    }

    response = client.post("/api/estimate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "total_cost" in data
    assert "total_tokens" in data
    assert "estimated_latency_ms" in data
```

**Source:** FastAPI official testing documentation (https://fastapi.tiangolo.com/tutorial/testing/)

---

### Anti-Patterns to Avoid

**Zustand Slices:**
- **Incorrect type parameter order:** `StateCreator<ThisSlice, [], [], CombinedState>` (backwards) — causes cross-slice access to fail type checking
- **Using middleware combiners:** `create(subscribeWithSelector(persist(...)))` adds complexity and type inference issues
- **Mutating state directly:** `set({ nodes: state.nodes.push(node) })` instead of spreading

**Vitest with Next.js:**
- **Forgetting `vite-tsconfig-paths` plugin:** Causes `@/` imports to fail in tests
- **Using `happy-dom` with React 19:** Less tested, prefer `jsdom` for stability
- **Async test functions without await:** Vitest requires explicit `await` for async operations

**pytest with FastAPI:**
- **Using `async def test_*` functions:** TestClient expects synchronous tests, not `await client.get()`
- **Not importing TestClient:** Importing from wrong module (starlette.testclient vs fastapi.testclient — use FastAPI's re-export)
- **Testing with production database:** Tests should use fixtures/mocks, not live Supabase

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State management type inference | Manual type annotations for every slice | Zustand's `StateCreator` generic | Handles full store type inference, prevents type drift |
| Test environment setup | Custom jsdom initialization | Vitest's `environment: 'jsdom'` config | Handles global setup, cleanup, and polyfills |
| HTTP client for tests | Custom fetch mocking | FastAPI's `TestClient` (HTTPX-based) | Handles ASGI lifecycle, automatic JSON parsing |
| Path alias resolution in tests | Manual module resolution config | `vite-tsconfig-paths` plugin | Reads tsconfig.json, no duplication |

**Key insight:** Test infrastructure has many edge cases (async cleanup, environment isolation, TypeScript resolution). Use battle-tested tools, not custom solutions.

---

## Common Pitfalls

### Pitfall 1: Type Inference Breaks After Splitting Slices

**What goes wrong:** TypeScript shows errors in consuming components after splitting store, complaining about missing properties.

**Why it happens:**
1. Forgot to add new slice type to combined `WorkflowStore` type
2. Type parameter order wrong in `StateCreator` (slice type should be last, not first)
3. Selector hooks not re-exported from main store file

**How to avoid:**
1. Define combined type: `type WorkflowStore = SliceA & SliceB & SliceC & SliceD`
2. Use correct parameter order: `StateCreator<CombinedType, [], [], ThisSliceType>`
3. Export all selector hooks from main `useWorkflowStore.ts`

**Warning signs:**
- `Property 'addNode' does not exist on type 'WorkflowSlice'` (forgot to include other slices in StateCreator first param)
- `Cannot find name 'useWorkflowNodes'` in components (forgot to re-export selector hook)

---

### Pitfall 2: Vitest Cannot Resolve `@/` Imports

**What goes wrong:** Tests fail with `Cannot find module '@/store/useWorkflowStore'` even though it exists.

**Why it happens:** Vitest doesn't automatically read `tsconfig.json` path aliases. Next.js resolves them at build time, but Vitest runs in Node.js without Next.js's resolver.

**How to avoid:**
1. Install `vite-tsconfig-paths` plugin: `npm i -D vite-tsconfig-paths`
2. Add to `vitest.config.mts`:
   ```typescript
   import tsconfigPaths from 'vite-tsconfig-paths';

   export default defineConfig({
     plugins: [tsconfigPaths(), react()],
     // ...
   });
   ```

**Warning signs:**
- Error message includes `Cannot find module '@/...`
- Changing `@/` to relative path (`../`) makes test pass

---

### Pitfall 3: pytest Tests Fail with "coroutine was never awaited"

**What goes wrong:** Test functions defined as `async def test_*` fail with `RuntimeWarning: coroutine 'test_endpoint' was never awaited`.

**Why it happens:** FastAPI's `TestClient` is synchronous — it internally handles async endpoints but exposes synchronous interface. Tests should use normal `def`, not `async def`.

**How to avoid:**
1. Use `def test_*` for all test functions
2. Call `client.get(...)` without `await`
3. For testing actual async functions (not endpoints), use `pytest-asyncio` plugin

**Warning signs:**
- Test warnings about coroutines not awaited
- Test hangs or times out

---

### Pitfall 4: Cross-Slice Access Shows Stale State

**What goes wrong:** Action in sliceA reads state from sliceB via `get()`, but gets old values.

**Why it happens:** Calling `const state = get()` once and then using `state.prop` later — state is captured at call time, not re-read.

**How to avoid:**
1. Call `get()` immediately before reading cross-slice state
2. Don't destructure/store `get()` result for later use
3. Use `get().prop` inline, not `const { prop } = get()`

**Example (WRONG):**
```typescript
someAction: () => {
  const state = get(); // Captured now

  // ... later in async callback
  setTimeout(() => {
    const nodes = state.nodes; // STALE — captured from earlier
  }, 1000);
}
```

**Example (CORRECT):**
```typescript
someAction: () => {
  setTimeout(() => {
    const nodes = get().nodes; // Fresh — reads current state
  }, 1000);
}
```

**Source:** Zustand documentation on `getState()` usage + project convention in CLAUDE.md

---

### Pitfall 5: EstimatePanel Sub-Components Cause Infinite Re-Renders

**What goes wrong:** After extracting sub-components, the panel flashes/re-renders constantly.

**Why it happens:**
1. Passing inline objects/arrays as props triggers re-renders: `<CostBreakdown data={{ cost: X }} />`
2. Not wrapping sub-components in `React.memo`
3. Selector hooks returning new object references each time

**How to avoid:**
1. Use stable selector hooks: `useEstimation()` not `useWorkflowStore(state => ({ cost: state.estimation?.cost }))`
2. Wrap sub-components in `React.memo`
3. Pass primitive values when possible, not objects

**Warning signs:**
- Console shows repeated "render" logs
- Charts/animations stutter
- React DevTools Profiler shows sub-component rendering on every parent render

---

## Code Examples

### Example 1: Complete Slice File Structure

```typescript
// slices/uiSlice.ts
import { StateCreator } from 'zustand';

// This slice's interface
export interface UISlice {
  ui: {
    isConfigModalOpen: boolean;
    isEstimatePanelOpen: boolean;
    isComparisonOpen: boolean;
    errorBanner?: string;
    successMessage?: string;
    theme: 'light' | 'dark';
    needsLayout: boolean;
  };

  openConfigModal: () => void;
  closeConfigModal: () => void;
  toggleEstimatePanel: () => void;
  toggleComparisonDrawer: () => void;
  setErrorBanner: (msg?: string) => void;
  setSuccessMessage: (msg?: string) => void;
  toggleTheme: () => void;
  setNeedsLayout: (v: boolean) => void;
}

// Import other slice types for combined state
import type { WorkflowSlice } from './workflowSlice';
import type { EstimationSlice } from './estimationSlice';
import type { PersistenceSlice } from './persistenceSlice';

export const createUISlice: StateCreator<
  WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice,
  [],
  [],
  UISlice
> = (set, get) => ({
  ui: {
    isConfigModalOpen: false,
    isEstimatePanelOpen: false,
    isComparisonOpen: false,
    errorBanner: undefined,
    successMessage: undefined,
    theme: 'light',
    needsLayout: false,
  },

  openConfigModal: () => set((state) => ({
    ui: { ...state.ui, isConfigModalOpen: true }
  })),

  closeConfigModal: () => set((state) => ({
    ui: { ...state.ui, isConfigModalOpen: false }
  })),

  toggleEstimatePanel: () => set((state) => ({
    ui: { ...state.ui, isEstimatePanelOpen: !state.ui.isEstimatePanelOpen }
  })),

  toggleComparisonDrawer: () => set((state) => ({
    ui: { ...state.ui, isComparisonOpen: !state.ui.isComparisonOpen }
  })),

  setErrorBanner: (msg) => set((state) => ({
    ui: { ...state.ui, errorBanner: msg }
  })),

  setSuccessMessage: (msg) => set((state) => ({
    ui: { ...state.ui, successMessage: msg }
  })),

  toggleTheme: () => set((state) => ({
    ui: { ...state.ui, theme: state.ui.theme === 'light' ? 'dark' : 'light' }
  })),

  setNeedsLayout: (v) => set((state) => ({
    ui: { ...state.ui, needsLayout: v }
  })),
});
```

**Source:** Adapted from existing `useWorkflowStore.ts` UI state structure

---

### Example 2: Vitest Config for Next.js with TypeScript

```typescript
// vitest.config.mts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(),  // Resolves @/ imports from tsconfig.json
    react(),          // Enables JSX/TSX transformation
  ],
  test: {
    environment: 'jsdom',  // Simulates browser environment for React
  },
});
```

**Source:** Next.js official Vitest setup guide (https://nextjs.org/docs/app/guides/testing/vitest)

---

### Example 3: Frontend Smoke Test (Component Rendering)

```typescript
// src/components/__tests__/EstimatePanel.test.tsx
import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EstimatePanel } from '../estimate/EstimatePanel';

test('EstimatePanel renders without crashing', () => {
  render(<EstimatePanel />);

  // Check that main panel container exists
  expect(screen.getByTestId('estimate-panel')).toBeDefined();
});
```

**Source:** Next.js Vitest documentation example

---

### Example 4: Backend Smoke Test (FastAPI Endpoint)

```python
# backend/tests/test_estimate.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_estimate_endpoint_responds():
    """Smoke test: /api/estimate returns 200 for minimal valid payload"""
    payload = {
        "nodes": [{
            "id": "1",
            "type": "startNode",
            "label": "Start",
            "model_provider": None,
            "model_name": None,
            "context": None,
            "tool_id": None,
            "tool_category": None,
            "max_steps": None,
            "task_type": None,
            "expected_output_size": None,
            "expected_calls_per_run": None,
        }],
        "edges": [],
        "runs_per_day": None,
        "loop_intensity": 1.0,
    }

    response = client.post("/api/estimate", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "total_cost" in data
    assert "total_tokens" in data
    assert "estimated_latency_ms" in data
    assert isinstance(data["total_cost"], (int, float))
```

**Source:** FastAPI official testing documentation (https://fastapi.tiangolo.com/tutorial/testing/)

---

### Example 5: Adding Test Script to package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Run tests:**
```bash
# Watch mode (default)
npm test

# Run once and exit
npm test -- --run

# With UI
npm run test:ui
```

---

## State of the Art

### Zustand Slices Pattern Evolution

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single monolithic store file | Slices pattern with StateCreator | Zustand 3.x+ | Better code organization, maintainable for large stores |
| Combined middleware (persist + immer + devtools) | Spread operator combination | Zustand 4.x+ | Simpler types, less nesting, better inference |
| Manual type annotations | StateCreator generic inference | Zustand 4.x+ | Less boilerplate, caught errors at compile time |

### Next.js Testing Evolution

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest with extensive config | Vitest native integration | Next.js 13+ | Faster tests, simpler config, better ESM support |
| @next/env polyfills | Vitest environment config | Next.js 15+ | One-line setup, no manual polyfills |
| Jest transformers for path aliases | vite-tsconfig-paths plugin | Vitest 1.x+ | Reads tsconfig.json directly, no duplication |

**Deprecated/outdated:**
- **Jest with Next.js 15+**: Requires extensive configuration, slow transforms. Use Vitest.
- **Zustand middleware combiners for slices**: Creates type inference issues. Use spread operator.
- **happy-dom with React 19**: Less battle-tested. Prefer jsdom for stability.

---

## Open Questions

### Question 1: Should slices use nested state objects or flat structure?

**What we know:**
- Current store has nested `ui` object: `state.ui.isConfigModalOpen`
- Zustand docs show both patterns (flat and nested)

**What's unclear:**
- Does nesting help with subscription performance?
- Should each slice export state under a namespace key?

**Recommendation:**
- **Use nested structure** (e.g., `ui: UIState`, `persistence: PersistenceState`)
- Rationale: Clearer slice boundaries, easier to reason about cross-slice access, matches existing pattern
- Components already use nested access: `useWorkflowStore(state => state.ui.theme)`

---

### Question 2: Where should helper functions (nodesToPayload, edgesToPayload) live after refactoring?

**What we know:**
- Currently in `useWorkflowStore.ts` (lines 174-198)
- Used by multiple slices (persistence, estimation)

**What's unclear:**
- Keep in main store file?
- Move to shared utils file?
- Duplicate in each slice that needs them?

**Recommendation:**
- **Create `src/store/utils.ts`** for shared helper functions
- Import into slices as needed
- Rationale: DRY, clear dependency, testable in isolation

---

### Question 3: Should tests be co-located or in separate __tests__ directories?

**What we know:**
- Both patterns work with Vitest
- Next.js docs show `__tests__/` directory pattern
- Current codebase has no existing test structure

**What's unclear:**
- User preference for discoverability vs separation?

**Recommendation:**
- **Use co-located `__tests__/` directories** for frontend
- Structure:
  ```
  src/store/
    useWorkflowStore.ts
    __tests__/
      useWorkflowStore.test.ts
    slices/
      workflowSlice.ts
      __tests__/
        workflowSlice.test.ts
  ```
- Rationale: Follows Next.js docs example, keeps tests near code, clear organization

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Frontend: Vitest 2.x + React Testing Library 16.x<br>Backend: pytest 8.x |
| Config file | Frontend: `vitest.config.mts` (see Wave 0)<br>Backend: `pytest.ini` (optional, defaults work) |
| Quick run command | Frontend: `npm test -- --run`<br>Backend: `pytest -x` |
| Full suite command | Frontend: `npm test -- --run --coverage`<br>Backend: `pytest --verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FNDX-01 | Zustand store split into slices preserves all functionality | unit | `npm test -- src/store/__tests__/useWorkflowStore.test.ts --run` | ❌ Wave 0 |
| FNDX-01 | Cross-slice access works (estimation reads workflow nodes) | unit | `npm test -- src/store/slices/__tests__/estimationSlice.test.ts --run` | ❌ Wave 0 |
| FNDX-02 | EstimatePanel sub-components render without errors | unit | `npm test -- src/components/estimate/__tests__/EstimatePanel.test.ts --run` | ❌ Wave 0 |
| FNDX-03 | Frontend test infrastructure validates basic component rendering | unit | `npm test -- --run` | ❌ Wave 0 |
| FNDX-03 | Backend test infrastructure validates API endpoint responses | unit | `pytest backend/tests/test_estimate.py -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --run` (frontend) + `pytest -x` (backend) — smoke tests only, < 10 seconds
- **Per wave merge:** Full suite — `npm test -- --run` + `pytest --verbose` — all unit tests
- **Phase gate:** Full suite green + manual smoke test (open app, trigger estimation) before `/gsd:verify-work`

### Wave 0 Gaps

The following files and infrastructure must be created before implementation begins:

#### Frontend Test Infrastructure
- [ ] `frontend/vitest.config.mts` — Vitest config with jsdom, React plugin, tsconfig paths
- [ ] `frontend/src/store/__tests__/useWorkflowStore.test.ts` — smoke test for store initialization
- [ ] `frontend/package.json` — add `test` script: `"test": "vitest"`

#### Backend Test Infrastructure
- [ ] `backend/tests/` directory — test module root
- [ ] `backend/tests/__init__.py` — marks directory as Python package
- [ ] `backend/tests/test_estimate.py` — smoke test for `/api/estimate` endpoint
- [ ] `backend/requirements.txt` — add `pytest` if not present (httpx already there)

#### Dependencies to Install
```bash
# Frontend (from frontend/)
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths

# Backend (from backend/)
pip install pytest
```

---

## Sources

### Primary (HIGH confidence)

- **Next.js Vitest Documentation** — https://nextjs.org/docs/app/guides/testing/vitest — Official guide for Vitest + Next.js 15 setup, includes React 19 compatibility, path alias resolution
- **FastAPI Testing Documentation** — https://fastapi.tiangolo.com/tutorial/testing/ — Official guide for pytest + TestClient, includes Pydantic v2 examples
- **Existing Codebase** — `frontend/src/store/useWorkflowStore.ts` (967 lines) — Current store structure reveals domain boundaries and selector hook patterns

### Secondary (MEDIUM confidence)

- **Zustand Patterns (inferred)** — Based on existing store structure analysis + training knowledge (January 2025) — StateCreator pattern verified against current implementation style
- **Vitest Official Docs** — https://vitest.dev/guide/ — General Vitest configuration, plugin system, environment options

### Tertiary (LOW confidence)

None identified. All recommendations based on official documentation or project code analysis.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries verified in official docs, versions match Next.js 15/React 19 compatibility
- Architecture patterns (Zustand slices): MEDIUM — Pattern inferred from training knowledge + existing store structure, not retrieved from live Zustand docs (URLs returned 404)
- Architecture patterns (Vitest/pytest): HIGH — Taken directly from official Next.js and FastAPI documentation
- Pitfalls: HIGH — Based on common issues documented in official sources and observable in codebase patterns

**Research date:** 2026-03-04
**Valid until:** ~30 days (2026-04-03) — Zustand and test tools are stable, but Next.js releases frequently

**Gaps encountered during research:**
- Zustand official documentation URLs returned 404 errors despite multiple redirect attempts
- Relied on training knowledge (January 2025) + existing store analysis for slices pattern details
- If slices pattern research needs deeper verification, recommend: review Zustand GitHub examples or community tutorials from 2024-2025

