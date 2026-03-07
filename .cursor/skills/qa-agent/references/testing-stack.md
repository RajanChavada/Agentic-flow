# Testing Stack Reference -- Neurovn

Detailed framework setup, configuration, and code patterns for each testing layer.
Read this when you need specific setup instructions or pattern examples beyond what
`Context/testing/conventions.md` covers.

---

## Table of Contents

1. [Frontend: Vitest + React Testing Library](#frontend-vitest--react-testing-library)
2. [Backend: pytest](#backend-pytest)
3. [E2E: Playwright (Future)](#e2e-playwright-future)

---

## Frontend: Vitest + React Testing Library

### Why Vitest (not Jest)

- Next.js 16 uses Turbopack/Vite-compatible tooling; Vitest is the natural fit
- Native ESM support (no transform issues with `@xyflow/react`, `zustand`, `framer-motion`)
- Same API as Jest (drop-in for anyone who knows Jest)
- Built-in TypeScript support without babel

### Setup (one-time)

Install dev dependencies:

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `frontend/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Add to `frontend/package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### Zustand Store Testing Pattern

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from '../useWorkflowStore'

describe('useWorkflowStore', () => {
  beforeEach(() => {
    // Reset to initial state between tests
    useWorkflowStore.setState({
      nodes: [],
      edges: [],
      // ... initial state fields
    })
  })

  it('should add a node', () => {
    const { addNode } = useWorkflowStore.getState()
    addNode({ /* node data */ })
    const { nodes } = useWorkflowStore.getState()
    expect(nodes).toHaveLength(1)
  })
})
```

Key points:
- Test Zustand stores by calling `getState()` directly -- no React rendering needed for pure state tests
- Reset store with `setState()` in `beforeEach` to prevent test pollution
- Test selectors, actions, and computed values separately
- Mock Supabase client for persistence-related actions

### React Flow Component Testing Pattern

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import WorkflowNode from '../nodes/WorkflowNode'

function renderWithFlow(ui: React.ReactElement) {
  return render(
    <ReactFlowProvider>{ui}</ReactFlowProvider>
  )
}

describe('WorkflowNode', () => {
  it('should render the node label', () => {
    renderWithFlow(
      <WorkflowNode
        id="test-1"
        data={{ label: 'Test Agent', type: 'agentNode' }}
        type="agentNode"
        // ... required props
      />
    )
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
  })
})
```

Key points:
- Always wrap in `<ReactFlowProvider>` -- components depend on React Flow context
- Only test your custom rendering -- do not test React Flow internals
- Test handle presence by querying for elements with known IDs
- Do NOT render inside a full `<ReactFlow>` component -- the provider alone is sufficient

### Mocking Supabase

```ts
import { vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}))
```

### Mocking fetch (for backend API calls)

```ts
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should call the estimate endpoint', async () => {
  const mockResponse = { total_cost: 0.05, total_latency: 2.3 }
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(mockResponse), { status: 200 })
  )

  // ... trigger the action that calls fetch
  // ... assert on the result
})
```

---

## Backend: pytest

### Why pytest

- Industry standard for Python testing
- Clean fixture system matches FastAPI's dependency injection
- No setup overhead -- create `tests/` and go

### Setup (one-time)

Add to `backend/requirements.txt`:

```
pytest>=8.0
pytest-asyncio>=0.24
```

Create `backend/tests/__init__.py` (empty file).

Create `backend/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Synchronous test client for FastAPI."""
    return TestClient(app)


@pytest.fixture
def sample_workflow():
    """Minimal valid workflow for estimation tests."""
    return {
        "nodes": [
            {
                "id": "start-1",
                "type": "startNode",
                "label": "Start",
                "context": ""
            },
            {
                "id": "agent-1",
                "type": "agentNode",
                "label": "Agent",
                "model": "Anthropic_Claude-3.5-Sonnet",
                "context": "You are a helpful assistant.",
                "task_type": "summarization",
                "expected_output_size": "medium"
            },
            {
                "id": "finish-1",
                "type": "finishNode",
                "label": "Finish",
                "context": ""
            }
        ],
        "edges": [
            {"source": "start-1", "target": "agent-1"},
            {"source": "agent-1", "target": "finish-1"}
        ]
    }


@pytest.fixture
def cyclic_workflow():
    """Workflow with a cycle for Tarjan SCC tests."""
    return {
        "nodes": [
            {"id": "start-1", "type": "startNode", "label": "Start", "context": ""},
            {"id": "agent-1", "type": "agentNode", "label": "Agent A",
             "model": "Anthropic_Claude-3.5-Sonnet", "context": "A",
             "task_type": "summarization", "expected_output_size": "medium"},
            {"id": "agent-2", "type": "agentNode", "label": "Agent B",
             "model": "Anthropic_Claude-3.5-Sonnet", "context": "B",
             "task_type": "summarization", "expected_output_size": "medium"},
            {"id": "finish-1", "type": "finishNode", "label": "Finish", "context": ""}
        ],
        "edges": [
            {"source": "start-1", "target": "agent-1"},
            {"source": "agent-1", "target": "agent-2"},
            {"source": "agent-2", "target": "agent-1"},
            {"source": "agent-2", "target": "finish-1"}
        ]
    }
```

### Estimator Testing Pattern

```python
import pytest
from estimator import estimate_agent_node, _TASK_OUTPUT_MULTIPLIERS


class TestTaskOutputMultipliers:
    def test_all_multiplier_keys_are_valid(self):
        valid_tasks = {
            "classification", "summarization", "code_generation",
            "rag_answer", "tool_orchestration", "routing"
        }
        valid_sizes = {"short", "medium", "long", "very_long"}
        for (task, size) in _TASK_OUTPUT_MULTIPLIERS:
            assert task in valid_tasks, f"Unknown task type: {task}"
            assert size in valid_sizes, f"Unknown output size: {size}"

    def test_code_generation_long_exceeds_short(self):
        long_mult = _TASK_OUTPUT_MULTIPLIERS.get(("code_generation", "long"), 1.5)
        short_mult = _TASK_OUTPUT_MULTIPLIERS.get(("code_generation", "short"), 1.5)
        assert long_mult > short_mult
```

### Endpoint Testing Pattern

```python
def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_estimate_valid_workflow(client, sample_workflow):
    response = client.post("/api/estimate", json=sample_workflow)
    assert response.status_code == 200
    data = response.json()
    assert "total_cost" in data or "estimation" in data


def test_estimate_empty_nodes(client):
    response = client.post("/api/estimate", json={"nodes": [], "edges": []})
    assert response.status_code in (200, 422)


def test_providers_list(client):
    response = client.get("/api/providers")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
```

### Graph Analyzer Testing Pattern

```python
from graph_analyzer import find_cycles, compute_critical_path


class TestTarjanSCC:
    def test_acyclic_graph_has_no_cycles(self):
        adj = {"a": ["b"], "b": ["c"], "c": []}
        cycles = find_cycles(adj)
        assert len(cycles) == 0

    def test_simple_cycle_detected(self):
        adj = {"a": ["b"], "b": ["a"]}
        cycles = find_cycles(adj)
        assert len(cycles) == 1
        assert set(cycles[0]) == {"a", "b"}

    def test_empty_graph(self):
        cycles = find_cycles({})
        assert len(cycles) == 0
```

---

## E2E: Playwright (Future)

Setup scaffold for when E2E tests are needed.

### Setup

```bash
cd frontend
npm install -D @playwright/test
npx playwright install
```

Create `frontend/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
})
```

Add to `frontend/package.json`:

```json
"test:e2e": "playwright test"
```

### Key flows to test

1. Load landing page, navigate to editor
2. Add nodes to canvas via drag-and-drop
3. Connect nodes, run estimation, verify results panel
4. Import a workflow via JSON
5. Save and reload a workflow (requires Supabase mock or test account)

### Locator strategy

- Prefer `data-testid` attributes over CSS selectors
- Use `page.getByRole()` for accessible elements
- Use `page.getByText()` for visible text
- Avoid XPath and nth-child selectors

---

*Last updated: 2026-03-04 -- Initial testing stack reference for Neurovn*
