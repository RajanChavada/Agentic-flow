# Testing Patterns

**Analysis Date:** 2026-03-04

## Test Framework

**Status:** Not established in codebase

**No test framework is currently configured:**
- No Jest, Vitest, Pytest, or unittest configuration files found
- No `.test.ts`, `.test.tsx`, or `.py` test files in source directories
- Package.json has no test script (`npm run test`)
- Backend has no test dependencies

**Recommended setup (not yet implemented):**
- Frontend: Vitest or Jest for unit/component tests
- Backend: Pytest for Python unit and integration tests

## Test File Organization

**Current state:** No test files exist

**Recommended future pattern:**
- Location: Co-located with source files
- Naming: `[module].test.ts` or `[module].spec.ts` in same directory as source
- Examples:
  - `src/components/EstimatePanel.test.tsx` next to `EstimatePanel.tsx`
  - `src/store/useWorkflowStore.test.ts` next to `useWorkflowStore.ts`
  - `backend/test_estimator.py` next to `estimator.py`

**Directory structure (proposed):**
```
frontend/
├── src/
│   ├── components/
│   │   ├── EstimatePanel.tsx
│   │   └── EstimatePanel.test.tsx
│   ├── store/
│   │   ├── useWorkflowStore.ts
│   │   └── useWorkflowStore.test.ts
│   └── lib/
│       ├── shareWorkflows.ts
│       └── shareWorkflows.test.ts

backend/
├── test_estimator.py
├── test_models.py
└── test_graph_analyzer.py
```

## Mocking

**Framework:** Not selected; would use:
- Frontend: Vitest `vi` or Jest `jest.mock()`
- Backend: `unittest.mock` or Pytest fixtures

**Patterns (proposed for TypeScript):**
```typescript
// Mock Zustand store
vi.mock("@/store/useWorkflowStore", () => ({
  useWorkflowStore: vi.fn((selector) => selector({
    nodes: [],
    edges: [],
    setEstimation: vi.fn(),
  })),
}));

// Mock external API calls
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [...] }),
      }),
    }),
  },
}));
```

**What to Mock:**
- External API calls (Supabase, backend endpoints)
- Zustand store selectors
- Third-party libraries with side effects
- Browser APIs (localStorage, fetch)

**What NOT to Mock:**
- Pure utility functions (keep them unmocked to test real behavior)
- UI library components (React, XYFlow) — use component testing instead
- Data transformation logic (test with real data)

## Fixtures and Factories

**Current state:** None exist

**Proposed factories (TypeScript):**
- Location: `src/__tests__/factories/`
- Example for workflow data:
```typescript
// factories.ts
import { v4 as uuid } from "uuid";
import type { Node, Edge } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";

export function createMockNode(overrides?: Partial<Node<WorkflowNodeData>>): Node<WorkflowNodeData> {
  return {
    id: uuid(),
    type: "agentNode",
    position: { x: 0, y: 0 },
    data: {
      label: "Test Agent",
      type: "agentNode",
      modelProvider: "OpenAI",
      modelName: "gpt-4",
      context: "",
    },
    ...overrides,
  };
}

export function createMockEstimation(overrides?: Partial<WorkflowEstimation>): WorkflowEstimation {
  return {
    total_tokens: 1000,
    total_input_tokens: 700,
    total_output_tokens: 300,
    total_cost: 0.01,
    total_latency: 2.5,
    graph_type: "DAG",
    breakdown: [],
    critical_path: [],
    detected_cycles: [],
    ...overrides,
  };
}
```

**Location:** Fixtures would go in `src/__tests__/fixtures/` or `backend/tests/fixtures/`

## Coverage

**Requirements:** Not enforced

**Current threshold:** None configured

**Recommended targets (when tests are added):**
- Lines: 70%+
- Branches: 60%+
- Functions: 75%+
- Statements: 70%+

**View Coverage (proposed):**
```bash
# Frontend (Vitest)
npm run test -- --coverage

# Backend (Pytest)
pytest --cov=. --cov-report=html
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, pure utilities, transformations
- Examples:
  - `shareWorkflows.ts`: Test `generateShareToken()`, `isCanvasSnapshot()` in isolation
  - `estimator.py`: Test cost calculation logic with fixed inputs
  - `utils.ts`: Test utility functions like `cn()` (class name combiner)
- Approach: Direct function calls with known inputs/outputs

**Integration Tests:**
- Scope: Store + components, API calls + data flow
- Examples:
  - Test `EstimatePanel` component with mocked Zustand store
  - Test workflow estimation flow: (nodes/edges) → API call → store update → UI re-render
  - Test share creation: form submission → Supabase insert → URL generation
- Approach: Mock external dependencies, test interactions between modules

**E2E Tests:**
- Framework: Not used
- Recommendation: Consider Playwright or Cypress for critical user flows (workflow creation → estimation → export)
- Would test: User can create workflow → see estimates → export PDF

## Common Patterns

**Async Testing (TypeScript with Vitest):**
```typescript
// Pattern: Testing async functions
it("fetches estimation and updates store", async () => {
  const mockFetch = vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ total_cost: 0.01, total_latency: 2.5 }),
  });

  await myAsyncFunction();

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/estimate"),
    expect.any(Object)
  );
});
```

**Error Testing (TypeScript):**
```typescript
// Pattern: Test error handling
it("handles fetch errors gracefully", async () => {
  vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

  const result = await fetchEstimation({});

  expect(result).toBeNull();
  // Frontend should show error banner or default UI
});
```

**Component Testing (Vitest + @testing-library/react, proposed):**
```typescript
// Pattern: Test React component behavior
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardSection from "@/components/DashboardSection";

it("toggles section collapsed state", () => {
  const mockToggle = vi.fn();

  render(
    <DashboardSection
      id="health"
      title="Health & Bottlenecks"
      icon={<Activity />}
      collapsed={false}
      onToggle={mockToggle}
      isDark={false}
    >
      Content here
    </DashboardSection>
  );

  const button = screen.getByRole("button");
  fireEvent.click(button);

  expect(mockToggle).toHaveBeenCalled();
});
```

**Store Testing (Vitest + Zustand):**
```typescript
// Pattern: Test Zustand store logic
import { renderHook, act } from "@testing-library/react";
import { useWorkflowStore } from "@/store/useWorkflowStore";

it("adds node to store", () => {
  const { result } = renderHook(() => useWorkflowStore());

  const newNode = createMockNode();

  act(() => {
    result.current.addNode(newNode);
  });

  expect(result.current.nodes).toContainEqual(newNode);
});
```

**Python Testing (Pytest, proposed):**
```python
# Pattern: Test FastAPI endpoint
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_estimate_endpoint():
    payload = {
        "nodes": [
            {"id": "1", "type": "startNode", "label": "Start"},
            {"id": "2", "type": "agentNode", "modelProvider": "OpenAI", "modelName": "gpt-4", "context": ""}
        ],
        "edges": [{"source": "1", "target": "2"}],
    }

    response = client.post("/api/estimate", json=payload)

    assert response.status_code == 200
    assert "total_cost" in response.json()
    assert "total_latency" in response.json()
```

## Missing Test Infrastructure

**Gaps identified:**
- No test runner configured for frontend or backend
- No test utilities or helpers
- No mock data generators
- No CI/CD test step configured
- No coverage reporting

**Action items when implementing:**
1. Install test framework (Vitest for frontend, Pytest for backend)
2. Create `src/__tests__/` and `backend/tests/` directories
3. Add test scripts to `package.json`
4. Set up coverage thresholds
5. Add pre-commit hook to run tests
6. Implement critical path tests first (estimation, store mutations)

---

*Testing analysis: 2026-03-04*
